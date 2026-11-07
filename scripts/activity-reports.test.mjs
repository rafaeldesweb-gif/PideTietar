import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { startTestApp, businessInput } from './test-app.mjs';
import { buildActivityReport, getMadridDay, selectDailyActivityOrders } from '../server/activityReports.js';

const now = new Date('2026-11-07T11:00:00Z');
const customer = { id: 'client-1', role: 'CLIENT', email: 'client@example.test', full_name: '<Cliente>' };
const exampleOrder = (overrides = {}) => ({
  id: 'pedido-1', orderNumber: 'PT-1234', businessId: 'biz-1', businessName: 'Negocio uno',
  customerId: customer.id, customerEmail: customer.email, courierId: 'courier-1', courierName: 'Repartidor uno',
  status: 'DELIVERED', paymentStatus: 'PAID', paymentMethod: 'CASH_ON_DELIVERY', deliveryType: 'DELIVERY',
  createdAt: '2026-11-07T08:00:00Z', updatedAt: '2026-11-07T09:00:00Z', statusHistory: [],
  subtotalCents: 1000, totalCents: 1200, deliveryFeeCents: 200, tipCents: 0, businessPayoutCents: 950, courierPayoutCents: 160, platformFeeCents: 90,
  items: [{ productName: '=Producto', quantity: 1, totalCents: 1000, unitPriceCents: 1000 }],
  deliveryPin: 'PIN-NO-DEBE-SALIR', ...overrides,
});

test('reportes: día de Madrid, incluidos medianoche y cambios de horario', () => {
  assert.equal(getMadridDay('2026-11-06T23:30:00Z'), '2026-11-07');
  assert.equal(getMadridDay('2026-07-06T22:30:00Z'), '2026-07-07');
  assert.equal(getMadridDay('2026-10-25T01:30:00Z'), '2026-10-25');
  assert.equal(getMadridDay('inválido'), '');
});

test('reportes: ámbito privado por rol y movimientos de pedidos de días anteriores', () => {
  const orders = [exampleOrder(), exampleOrder({ id: 'ajeno', customerId: 'otro', customerEmail: 'otro@example.test', businessId: 'biz-2', courierId: 'otro' }), exampleOrder({ id: 'ayer', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T09:00:00Z' }), exampleOrder({ id: 'movimiento-hoy', createdAt: '2026-11-06T08:00:00Z' })];
  assert.deepEqual(selectDailyActivityOrders({ user: customer, orders, now }).map((o) => o.id), ['pedido-1', 'movimiento-hoy']);
  for (const user of [{ role: 'BUSINESS_ADMIN', business_id: 'biz-1' }, { role: 'PLATFORM_COURIER', id: 'courier-1' }, { role: 'BUSINESS_COURIER', id: 'courier-1' }]) {
    assert.deepEqual(selectDailyActivityOrders({ user, orders, now }).map((o) => o.id), ['pedido-1', 'movimiento-hoy']);
  }
  assert.deepEqual(selectDailyActivityOrders({ user: { role: 'BUSINESS_ADMIN' }, orders, now }), []);
  assert.throws(() => buildActivityReport({ user: customer, orders, now, global: true }));
});

test('reportes: separa pagos pendientes y reembolsados, escapa HTML y omite secretos', () => {
  const report = buildActivityReport({ user: customer, now, orders: [exampleOrder(), exampleOrder({ id: 'pending', status: 'READY', paymentStatus: 'PENDING' }), exampleOrder({ id: 'refund', status: 'REFUNDED', paymentStatus: 'REFUNDED' })] });
  assert.equal(report.summary.paidCents, 1200);
  assert.equal(report.summary.pendingCents, 1200);
  assert.equal(report.summary.refundedCents, 1200);
  assert.equal(report.summary.businessPayoutCents, 950);
  assert.match(report.mail.bodyHtml, /&lt;Cliente&gt;/);
  assert.doesNotMatch(report.mail.text, /PIN-NO-DEBE-SALIR|Liquidación de negocio|Descuento del reparto/);
  assert.match(report.mail.attachments[0].content, /PT-1234/);
});

test('reporte global: agrupa zona y negocio e incluye comercios sin movimientos', () => {
  const report = buildActivityReport({ user: { ...customer, role: 'SUPERADMIN' }, now, global: true,
    orders: [exampleOrder(), exampleOrder({ id: 'dos', businessId: 'biz-2', businessName: 'Negocio dos' })],
    businesses: [{ id: 'biz-1', name: 'Negocio uno', locality_id: 'zona-1' }, { id: 'biz-2', name: 'Negocio dos', locality_id: 'zona-2' }, { id: 'biz-3', name: 'Sin actividad', locality_id: 'zona-1' }],
    localities: [{ id: 'zona-1', name: 'Arenas' }, { id: 'zona-2', name: 'Sotillo' }],
  });
  assert.match(report.mail.text, /ZONA: Arenas[\s\S]*NEGOCIO: Negocio uno[\s\S]*NEGOCIO: Sin actividad[\s\S]*ZONA: Sotillo[\s\S]*NEGOCIO: Negocio dos/);
  assert.equal(report.summary.paidCents, 2400);
});

test('logout: envía por SMTP simulado al correo registrado, con ámbito y sin borrar pedidos', { timeout: 60000 }, async (t) => {
  const preload = new URL('./fixtures/report-smtp.mjs', import.meta.url).href;
  const { api, admin, password, login, directory } = await startTestApp(t, { preload });
  const readMails = async () => (await readFile(path.join(directory, 'emails.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  const verify = async (email) => {
    const mail = (await readMails()).filter((item) => item.to === email && item.subject.includes('verificación')).at(-1);
    assert.ok(mail);
    await api('/auth/verify-email', { method: 'POST', body: { email, code: mail.subject.match(/\d{6}/)[0] }, status: 200 });
  };
  await api('/auth/logout', { method: 'POST', status: 401 });
  const zone = (await api('/localities', { method: 'POST', token: admin.token, body: { name: 'Zona reportes', postalCode: '05400' }, status: 201 })).data.locality;
  const category = (await api('/categories')).data[0];
  const input = businessInput('reportes', zone.id, category.id, password);
  const business = (await api('/businesses', { method: 'POST', token: admin.token, body: input, status: 201 })).data.business;
  await verify(input.owner.email);
  const owner = await login(input.owner.username);
  const courier = (await api('/users', { method: 'POST', token: admin.token, body: { username: 'report_courier', email: 'courier@example.test', fullName: 'Repartidor reportes', password, role: 'PLATFORM_COURIER', courierBusinessIds: [business.id], courierConfirmation: 'SUPERADMIN', phone: '600111222', address: 'Calle prueba 1', dni: '12345678Z', termsAccepted: true, termsVersion: 'v1' }, status: 201 })).data.user;
  await verify(courier.email);
  const courierLogin = await login('report_courier');
  const product = (await api('/products', { method: 'POST', token: admin.token, body: { businessId: business.id, categoryId: category.id, name: 'Plato reportes', priceCents: 1000 }, status: 201 })).data;
  const order = { ...exampleOrder(), id: 'logout-order', businessId: business.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), courierId: null, status: 'READY', deliveryPin: '7293', items: [{ productId: product.id, productName: 'Plato reportes', quantity: 1, totalCents: 1000, unitPriceCents: 1000 }] };
  await api('/orders', { method: 'POST', token: admin.token, body: order, status: 201 });
  await api(`/orders/${order.id}`, { method: 'PUT', token: courierLogin.token, body: { status: 'DELIVERED', deliveryPin: order.deliveryPin }, status: 200 });
  assert.equal((await api('/orders', { token: courierLogin.token })).data.find((item) => item.id === order.id).courierId, courier.id);
  const results = await Promise.all([1, 2].map(() => api('/auth/logout', { method: 'POST', token: owner.token, body: { email: 'intruso@example.test', global: true }, status: 200 })));
  assert.ok(results.every((result) => result.data.report.sent));
  let reports = (await readMails()).filter((mail) => mail.subject.startsWith('Reporte diario'));
  assert.equal(reports.length, 1);
  assert.equal(reports[0].to, input.owner.email);
  assert.match(reports[0].text, /PT-1234/);
  assert.ok(reports[0].attachments.some((attachment) => attachment.filename.endsWith('.csv')));
  await api('/auth/logout', { method: 'POST', token: courierLogin.token, status: 200 });
  reports = (await readMails()).filter((mail) => mail.subject.startsWith('Reporte diario'));
  assert.equal(reports[1].to, courier.email);
  assert.match(reports[1].text, /Liquidación de reparto/);
  assert.ok((await api('/orders', { token: admin.token })).data.some((item) => item.id === order.id));
  await api('/auth/logout', { method: 'POST', token: admin.token, status: 200 });
  const globalReport = (await readMails()).find((mail) => mail.subject.startsWith('Reporte global'));
  assert.equal(globalReport.to, admin.user.email);
  assert.match(globalReport.text, /ZONA: Zona reportes[\s\S]*NEGOCIO: Negocio reportes/);
  await writeFile(path.join(directory, 'smtp-fail'), 'fallar');
  const freshOwner = await login(input.owner.username);
  const failed = await api('/auth/logout', { method: 'POST', token: freshOwner.token, status: 200 });
  assert.equal(failed.data.report.sent, false);
});

test('logout: sin SMTP informa de que el reporte no se ha enviado', async (t) => {
  const { api, admin } = await startTestApp(t);
  const response = await api('/auth/logout', { method: 'POST', token: admin.token, status: 200 });
  assert.equal(response.data.report.sent, false);
});
