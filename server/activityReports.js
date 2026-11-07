// Los reportes usan el día civil de la plataforma, también durante los cambios
// de horario de verano. Todos los importes de entrada/suma son céntimos.
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
const moneyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const cancelled = new Set(['CANCELLED', 'REJECTED', 'REFUNDED']);
const statuses = { PENDING_PAYMENT: 'Pendiente de pago', NEW: 'Nuevo', PAID: 'Pagado', ACCEPTED: 'Aceptado', PREPARING: 'En preparación', READY: 'Listo', ASSIGNED: 'Asignado', PICKED_UP: 'En reparto', DELIVERED: 'Entregado', CANCELLED: 'Cancelado', REJECTED: 'Rechazado', REFUNDED: 'Reembolsado' };
const payments = { PAID: 'Pagado', PENDING: 'Pendiente', REFUNDED: 'Reembolsado' };
const methods = { STRIPE: 'Tarjeta', PAYPAL: 'PayPal', CASH_ON_DELIVERY: 'Efectivo' };
const euro = (cents) => moneyFormatter.format((Number(cents) || 0) / 100);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function getMadridDay(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(dayFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function time(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? timeFormatter.format(date) : 'Sin fecha';
}

export function selectDailyActivityOrders({ user, orders, now = new Date(), global = false }) {
  const day = getMadridDay(now);
  return orders.filter((order) => {
    let allowed = false;
    if (global && user.role === 'SUPERADMIN') allowed = true;
    else if (user.role === 'BUSINESS_ADMIN') allowed = !!user.business_id && order.businessId === user.business_id;
    else if (['BUSINESS_COURIER', 'PLATFORM_COURIER'].includes(user.role)) allowed = order.courierId === user.id;
    else allowed = order.customerId === user.id || (!order.customerId && String(order.customerEmail).toLowerCase() === String(user.email).toLowerCase());
    return allowed && [order.createdAt, order.updatedAt, ...(order.statusHistory || []).map((entry) => entry.timestamp)].some((value) => value && getMadridDay(value) === day);
  });
}

function summarize(orders) {
  const valid = orders.filter((order) => !cancelled.has(order.status) && order.paymentStatus !== 'REFUNDED');
  const paid = valid.filter((order) => order.paymentStatus === 'PAID');
  const delivered = valid.filter((order) => order.status === 'DELIVERED');
  const sum = (list, field) => list.reduce((total, order) => total + (Number(order[field]) || 0), 0);
  return {
    orders: orders.length,
    delivered: orders.filter((order) => order.status === 'DELIVERED').length,
    cancelled: orders.filter((order) => cancelled.has(order.status) || order.paymentStatus === 'REFUNDED').length,
    paidCents: sum(paid, 'totalCents'),
    pendingCents: sum(valid.filter((order) => order.paymentStatus === 'PENDING'), 'totalCents'),
    refundedCents: sum(orders.filter((order) => order.status === 'REFUNDED' || order.paymentStatus === 'REFUNDED'), 'totalCents'),
    businessPayoutCents: sum(delivered, 'businessPayoutCents'),
    courierPayoutCents: sum(delivered, 'courierPayoutCents'),
    platformFeeCents: sum(delivered, 'platformFeeCents'),
  };
}

function summaryLines(summary, role, global) {
  const lines = [`Pedidos con movimientos: ${summary.orders} · Entregados: ${summary.delivered} · Cancelados/rechazados/reembolsados: ${summary.cancelled}`,
    `Importe de pedidos con pago registrado: ${euro(summary.paidCents)} · Pendientes: ${euro(summary.pendingCents)} · Reembolsados: ${euro(summary.refundedCents)}`];
  if (global || role === 'BUSINESS_ADMIN') lines.push(`Liquidación de negocio registrada en entregados: ${euro(summary.businessPayoutCents)} · Comisión de plataforma: ${euro(summary.platformFeeCents)}`);
  if (global || ['BUSINESS_COURIER', 'PLATFORM_COURIER'].includes(role)) lines.push(`Liquidación de reparto registrada en entregados: ${euro(summary.courierPayoutCents)}`);
  return lines;
}

function orderLines(order, role, global, day) {
  const lines = [`Pedido ${order.orderNumber || order.id} · ${order.businessName}`, `Creado: ${time(order.createdAt)} · Actualizado: ${time(order.updatedAt)}`,
    `Estado: ${statuses[order.status] || order.status} · Pago: ${payments[order.paymentStatus] || order.paymentStatus} · Método: ${methods[order.paymentMethod] || order.paymentMethod}`,
    `Modalidad: ${order.deliveryType === 'PICKUP' ? 'Recogida en local' : 'Entrega a domicilio'}`];
  if (global || role === 'BUSINESS_ADMIN') lines.push(`Cliente: ${order.customerName || 'Sin nombre'} · Repartidor: ${order.courierName || 'Sin asignar'}`);
  for (const item of order.items || []) {
    lines.push(`  ${item.quantity} × ${item.productName}: ${euro(item.totalCents)} (${euro(item.unitPriceCents)} / unidad)`);
    if (item.removedIngredients?.length) lines.push(`    Sin: ${item.removedIngredients.join(', ')}`);
    if (item.selectedOptions?.length) lines.push(`    Opciones: ${item.selectedOptions.map((option) => option.name || option.optionName || option.optionValue || option.value || '').filter(Boolean).join(', ')}`);
    if (item.customerNote) lines.push(`    Nota: ${item.customerNote}`);
  }
  lines.push(`Subtotal: ${euro(order.subtotalCents)} · Envío: ${euro(order.deliveryFeeCents)} · Propina: ${euro(order.tipCents)} · Total: ${euro(order.totalCents)}`);
  if (global || role === 'BUSINESS_ADMIN') lines.push(`Negocio: ${euro(order.businessPayoutCents)} · Descuento del negocio: ${euro(order.businessDiscountCents)} · Plataforma: ${euro(order.platformFeeCents)}`);
  if (global || ['BUSINESS_COURIER', 'PLATFORM_COURIER'].includes(role)) lines.push(`Reparto: ${euro(order.courierPayoutCents)} · Descuento del reparto: ${euro(order.courierDiscountCents)}`);
  const movements = (order.statusHistory || []).filter((entry) => getMadridDay(entry.timestamp) === day);
  for (const entry of movements) lines.push(`  ${time(entry.timestamp)} — ${statuses[entry.status] || entry.status}${entry.note ? ` · ${entry.note}` : ''}`);
  return lines;
}

// Las celdas procedentes de usuarios se neutralizan para que Excel no las
// interprete como fórmulas al abrir el adjunto.
const csvCell = (value) => {
  const raw = String(value ?? '');
  return `"${(/^[\s]*[=+@-]/.test(raw) ? "'" : '') + raw.replace(/"/g, '""')}"`;
};

export function buildActivityReport({ user, orders, businesses = [], localities = [], now = new Date(), global = false }) {
  if (global && user.role !== 'SUPERADMIN') throw new Error('El reporte global requiere superadministración.');
  const day = getMadridDay(now);
  const role = user.role;
  const dailyOrders = selectDailyActivityOrders({ user, orders, now, global });
  const summary = summarize(dailyOrders);
  const groups = new Map();
  const addBusiness = (business) => {
    const id = String(business.id);
    if (!groups.has(id)) {
      const locality = localities.find((item) => item.id === (business.locality_id || business.localityId));
      groups.set(id, { businessId: id, businessName: business.name || 'Negocio', zoneName: locality?.name || 'Zona sin asignar', orders: [] });
    }
    return groups.get(id);
  };
  if (global) businesses.forEach(addBusiness);
  if (role === 'BUSINESS_ADMIN') businesses.filter((business) => business.id === user.business_id).forEach(addBusiness);
  for (const order of dailyOrders) {
    const business = businesses.find((item) => item.id === order.businessId) || { id: order.businessId, name: order.businessName };
    addBusiness(business).orders.push(order);
  }
  const sections = [...groups.values()].sort((a, b) => a.zoneName.localeCompare(b.zoneName, 'es') || a.businessName.localeCompare(b.businessName, 'es'));
  const title = global ? 'Reporte global de movimientos del día' : 'Tu reporte de movimientos del día';
  const lines = [`${title} · ${day} (Europe/Madrid)`, `Cuenta: ${user.full_name || user.name || user.username || 'Usuario'}`, `Generado: ${time(now)}`, '', ...summaryLines(summary, role, global), '',
    'Este reporte incluye los pedidos creados o con movimientos durante el día hasta este cierre de sesión. Las liquidaciones son importes registrados, no confirmaciones de transferencias bancarias.', ''];
  let zone = '';
  const csvRows = [['Zona', 'Negocio', 'Pedido', 'Creado', 'Actualizado', 'Estado', 'Estado del pago', 'Método de pago', 'Total EUR', 'Detalles y movimientos']];
  for (const section of sections) {
    if (section.zoneName !== zone) {
      zone = section.zoneName;
      const zoneOrders = sections.filter((item) => item.zoneName === zone).flatMap((item) => item.orders);
      lines.push(`ZONA: ${zone}`, ...summaryLines(summarize(zoneOrders), role, global), '');
    }
    lines.push(`NEGOCIO: ${section.businessName}`, ...summaryLines(summarize(section.orders), role, global));
    if (!section.orders.length) lines.push('Sin movimientos durante el día.');
    for (const order of section.orders) {
      const detail = orderLines(order, role, global, day);
      lines.push('', ...detail);
      csvRows.push([zone, section.businessName, order.orderNumber || order.id, time(order.createdAt), time(order.updatedAt), statuses[order.status] || order.status, payments[order.paymentStatus] || order.paymentStatus, methods[order.paymentMethod] || order.paymentMethod, ((Number(order.totalCents) || 0) / 100).toFixed(2), detail.join('\n')]);
    }
    lines.push('');
  }
  if (!dailyOrders.length) lines.push('No hay movimientos para esta cuenta en el día.');
  const text = lines.join('\n');
  return {
    day, summary,
    mail: {
      to: user.email,
      subject: `${global ? 'Reporte global' : 'Reporte diario'} PideTiétar · ${day}`,
      heading: title,
      preheader: `${day}: ${summary.orders} pedidos con movimientos.`,
      text,
      bodyHtml: `<div style="white-space:pre-wrap; overflow-wrap:anywhere; font-family:Arial,sans-serif; font-size:13px; line-height:21px;">${escapeHtml(text)}</div>`,
      attachments: [{ filename: `pidetietar-${global ? 'global' : 'actividad'}-${day}.csv`, content: `\uFEFF${csvRows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`, contentType: 'text/csv; charset=utf-8' }],
    },
  };
}
