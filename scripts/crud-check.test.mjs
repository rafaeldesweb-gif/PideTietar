import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, businessInput } from './test-app.mjs';

test('CRUD y validaciones de los formularios con API y base de datos aisladas', { timeout: 60000 }, async (t) => {
  const { api, admin, password, login } = await startTestApp(t);
  const token = admin.token;
  const send = (route, method, body, status = 200, auth = token) => api(route, { method, body, status, token: auth });
  let zone, category, business, owner, secondBusiness, secondOwner, duplicateBusiness, client, courier, platformCourier, product, secondProduct, orderId;

  await t.test('localidades: crear, leer, editar y borrar', async () => {
    zone = (await send('/localities', 'POST', { name: 'Zona de pruebas', postalCode: '05400' }, 201)).data.locality;
    assert.ok((await api('/localities')).data.some((item) => item.id === zone.id));
    await send(`/localities/${zone.id}`, 'PUT', { name: 'Zona editada', coordinates: { lat: 40.3, lng: -4.6 } });
    assert.equal((await api('/localities')).data.find((item) => item.id === zone.id).name, 'Zona editada');
    const disposable = (await send('/localities', 'POST', { name: 'Zona temporal', postalCode: '05401' }, 201)).data.locality;
    await send(`/localities/${disposable.id}`, 'DELETE');
    assert.ok(!(await api('/localities')).data.some((item) => item.id === disposable.id));
  });
  await t.test('localidades: rechazar nombres vacíos y ediciones inexistentes', async () => {
    await send('/localities', 'POST', { name: ' ', postalCode: '05400' }, 400);
    await send('/localities/no-existe', 'PUT', { name: 'No existe' }, 404);
  });
  await t.test('categorías: CRUD, slug repetido y permisos', async () => {
    const created = await send('/categories', 'POST', { name: 'Categoría prueba', slug: 'categoria-prueba', iconName: 'Pizza' }, 201);
    category = created.data.category || { id: created.data.id };
    assert.ok(category.id);
    await send(`/categories/${category.id}`, 'PUT', { name: 'Categoría editada', slug: 'categoria-prueba' });
    assert.equal((await api('/categories')).data.find((item) => item.id === category.id).name, 'Categoría editada');
    await send('/categories', 'POST', { name: 'Duplicada', slug: 'categoria-prueba' }, 409);
    await send('/categories', 'POST', { name: 'Sin sesión' }, 401, null);
    const disposable = (await send('/categories', 'POST', { name: 'Temporal', slug: 'temporal-crud' }, 201)).data;
    await send(`/categories/${disposable.category?.id || disposable.id}`, 'DELETE');
  });
  await t.test('negocios: alta transaccional y cuenta del propietario', async () => {
    const created = await send('/businesses', 'POST', businessInput('uno', zone.id, category.id, password), 201);
    business = created.data.business;
    await api('/auth/verify-email', { method: 'POST', body: { email: 'propietariouno@example.com', code: created.data.verificationCode }, status: 200 });
    assert.ok(business.id);
    owner = await login('propietario_uno');
    assert.equal(owner.user.businessId, business.id);
    const second = await send('/businesses', 'POST', businessInput('dos', zone.id, category.id, password), 201);
    secondBusiness = second.data.business;
    await api('/auth/verify-email', { method: 'POST', body: { email: 'propietariodos@example.com', code: second.data.verificationCode }, status: 200 });
    secondOwner = await login('propietario_dos');
  });
  await t.test('negocios: editar datos, IBAN y horarios; rechazar otro propietario', async () => {
    const schedule = businessInput('uno', zone.id, category.id, password).schedule;
    schedule[0] = { ...schedule[0], isOpen: true, openTime: '09:30', closeTime: '00:00' };
    await send(`/businesses/${business.id}`, 'PUT', { phone: '666555444', accountNumber: 'ES9121000418450200051332', schedule }, 200, owner.token);
    const saved = (await api('/businesses')).data.find((item) => item.id === business.id);
    assert.equal(saved.phone, '666555444');
    assert.equal(saved.account_number, 'ES9121000418450200051332');
    await send(`/businesses/${business.id}`, 'PUT', { discountEnabled: true, discountPercentage: 10 }, 200, token);
    const discountedBusiness = (await api('/businesses')).data.find((item) => item.id === business.id);
    assert.equal(Number(discountedBusiness.discount_percentage), 10);
    assert.equal(Number(discountedBusiness.discount_enabled), 1);
    await send(`/businesses/${business.id}`, 'PUT', { discountEnabled: false }, 403, owner.token);
    assert.equal(saved.schedule.find((item) => (item.dayOfWeek ?? item.day_of_week) === 1).open_time, '09:30');
    await send(`/businesses/${business.id}`, 'PUT', { name: 'Sin permiso' }, 403, secondOwner.token);
    await send(`/businesses/${business.id}`, 'PUT', { schedule: [{ dayOfWeek: 1, openTime: '25:00', closeTime: '23:00' }] }, 400);
    await send(`/categories/${category.id}`, 'DELETE', undefined, 409);
  });
  await t.test('negocios: permitir el mismo DNI de gestor en varios comercios', async () => {
    const duplicate = { ...businessInput('tres', zone.id, category.id, password), managerDni: '12345678Z' };
    await send(`/businesses/${business.id}`, 'PUT', { managerDni: '12345678Z' }, 200, owner.token);
    duplicateBusiness = (await send('/businesses', 'POST', duplicate, 201)).data.business;
    await send(`/businesses/${secondBusiness.id}`, 'PUT', { managerDni: '12345678Z' }, 200, secondOwner.token);
    const businesses = (await api('/businesses')).data;
    assert.ok(businesses.filter((item) => item.managerDni === '12345678Z' || item.manager_dni === '12345678Z').length >= 2);
    await send(`/businesses/${duplicateBusiness.id}`, 'DELETE');
  });
  await t.test('horarios: días cerrados sin horas, segundos y cierre a medianoche', async () => {
    const schedule = [
      { dayOfWeek: 1, isOpen: false, openTime: '', closeTime: '' },
      { dayOfWeek: 5, isOpen: true, openTime: '19:00:00', closeTime: '00:00:00' },
    ];
    await send(`/businesses/${business.id}`, 'PUT', { schedule }, 200, owner.token);
    const saved = (await api('/businesses')).data.find((item) => item.id === business.id);
    const monday = saved.schedule.find((item) => item.day_of_week === 1);
    const friday = saved.schedule.find((item) => item.day_of_week === 5);
    assert.equal(Number(monday.is_open), 0);
    assert.equal(friday.open_time, '19:00');
    assert.equal(friday.close_time, '00:00');
    for (const openTime of ['', '25:00', '19:00:99']) {
      await send(`/businesses/${business.id}`, 'PUT', {
        schedule: [{ dayOfWeek: 5, isOpen: true, openTime, closeTime: '00:00' }],
      }, 400, owner.token);
    }
  });
  await t.test('clientes: registro, login y validación de dirección', async () => {
    await send('/auth/register', 'POST', { email: 'sin-direccion@example.com', password }, 400, undefined);
    const registered = await send('/auth/register', 'POST', { username: 'cliente_prueba', fullName: 'Cliente de pruebas', email: 'cliente@example.com', password, address: 'Calle de pruebas 2, 05400', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    client = registered.data;
    assert.equal(client.user.role, 'CLIENT');
    const logged = await login('cliente_prueba');
    assert.equal(logged.user.id, client.user.id);
    await send('/auth/register', 'POST', { username: 'cliente_prueba', email: 'cliente@example.com', password, address: 'Calle de pruebas 2, 05400', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 409, undefined);
  });
  await t.test('registro: rechazar email inválido y localidad inexistente', async () => {
    await send('/auth/register', 'POST', { username: 'email_invalido', fullName: 'Cliente', email: 'sin-arroba', password, address: 'Calle de pruebas 2', localityId: zone.id }, 400, undefined);
    await send('/auth/register', 'POST', { username: 'zona_invalida', email: 'zona@example.com', password, address: 'Calle de pruebas 2', localityId: 'no-existe' }, 400, undefined);
  });
  await t.test('registro: dirección fuera de la zona seleccionada', async () => {
    // Sin clave de Google Maps configurada en el entorno de pruebas, el
    // geocodificado no se ejecuta y el registro no se bloquea por este motivo.
    // Para verificar realmente hay que definir GOOGLE_MAPS_API_KEY.
    await send('/auth/register', 'POST', { username: 'cliente_sin_cp', fullName: 'Cliente', email: 'sin_cp@example.com', password, address: 'Calle sin código postal', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    await send('/auth/register', 'POST', { username: 'cliente_cp_otro', fullName: 'Cliente', email: 'cp_otro@example.com', password, address: 'Calle de pruebas 2, 28001', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    const ok = await send('/auth/register', 'POST', { username: 'cliente_cp_ok', fullName: 'Cliente OK', email: 'cp_ok@example.com', password, address: 'Calle de pruebas 2, 05400', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    assert.equal(ok.data.user.role, 'CLIENT');
  });
  await t.test('registro: zona sin código postal no bloquea la dirección', async () => {
    const sinCp = (await send('/localities', 'POST', { name: 'Zona sin CP', postalCode: '' }, 201)).data.locality;
    await send('/auth/register', 'POST', { username: 'cliente_zona_sin_cp', fullName: 'Cliente', email: 'zona_sin_cp@example.com', password, address: 'Calle de pruebas 3', localityId: sinCp.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    await send(`/localities/${sinCp.id}`, 'DELETE');
  });
  await t.test('perfil: actualizar, verificar persistencia, rechazar email y teléfono inválidos', async () => {
    const saved = await send(`/users/${client.user.id}`, 'PUT', { fullName: 'Cliente editado', phone: '666555444' }, 200, client.token);
    assert.equal(saved.data.user.phone, '666555444');
    assert.equal((await api('/auth/me', { token: client.token })).data.user.name, 'Cliente editado');
    await send(`/users/${client.user.id}`, 'PUT', { email: 'RafaAdmin' }, 400, client.token);
    await send(`/users/${client.user.id}`, 'PUT', { phone: 'abc' }, 400, client.token);
    await send(`/users/${admin.user.id}`, 'PUT', { phone: '600000001' }, 403, client.token);
  });
  await t.test('correo: solicitar código, rechazar código erróneo y verificar', async () => {
    const result = await send('/auth/send-verification-email', 'POST', { email: client.user.email, fullName: 'Cliente' }, 200, client.token);
    assert.match(result.data.code, /^\d{6}$/);
    await send('/auth/verify-email', 'POST', { email: client.user.email, code: 'incorrecto' }, 400, client.token);
    await send('/auth/verify-email', 'POST', { email: client.user.email, code: result.data.code }, 200, client.token);
  });
  await t.test('contraseña: cambiarla, rechazar la antigua y entrar con la nueva', async () => {
    await send('/auth/change-password', 'POST', { identifier: client.user.email, currentPassword: 'incorrecta', newPassword: `${password}-nueva` }, 401, undefined);
    await send('/auth/change-password', 'POST', { identifier: client.user.email, currentPassword: password, newPassword: `${password}-nueva` }, 200, undefined);
    await send('/auth/login', 'POST', { email: client.user.email, password }, 401, undefined);
    assert.equal((await login(client.user.email, `${password}-nueva`)).user.id, client.user.id);
  });
  await t.test('recuperación: enlace de superadmin, uso único y cambio efectivo', async () => {
    const registered = await send('/auth/register', 'POST', { username: 'recuperable', fullName: 'Cuenta a recuperar', email: 'recuperable@example.com', password, address: 'Calle de recuperación 4, 05400', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, 201, undefined);
    const targetId = registered.data.user.id;
    // Sólo el superadmin puede pedir el enlace: un cliente recibe 403.
    await send(`/users/${targetId}/request-password-reset`, 'POST', undefined, 403, client.token);
    // `send` con auth undefined reutiliza el token del admin: esta otra
    // comprobación sin sesión carga directo con `api`, que no añade token.
    await api(`/users/${targetId}/request-password-reset`, { method: 'POST', status: 401 });
    // Sin SMTP el enlace vuelve en la respuesta (para copiarlo a mano).
    const link = await send(`/users/${targetId}/request-password-reset`, 'POST', undefined, 200);
    const token = String(link.data.resetUrl || '').split('token=')[1] || '';
    assert.match(token, /^[0-9a-f]{64}$/);
    const fresh = `Recuperada-${password}`;
    await send('/auth/reset-password', 'POST', { token: `${token}x`, newPassword: fresh }, 400, undefined);
    await send('/auth/reset-password', 'POST', { token, newPassword: 'corta' }, 400, undefined);
    await send('/auth/reset-password', 'POST', { newPassword: fresh }, 400, undefined);
    await send('/auth/reset-password', 'POST', { token, newPassword: fresh }, 200, undefined);
    // El token es de un solo uso: reutilizarlo vuelve a dar error.
    await send('/auth/reset-password', 'POST', { token, newPassword: fresh }, 400, undefined);
    await send('/auth/login', 'POST', { email: 'recuperable@example.com', password }, 401, undefined);
    assert.equal((await login('recuperable@example.com', fresh)).user.id, targetId);
  });
  await t.test('repartidores: alta, consulta, edición y confirmación por su dueño', async () => {
    const created = await send('/users', 'POST', { username: 'repartidor_prueba', fullName: 'Repartidor', email: 'repartidor@example.com', password, role: 'BUSINESS_COURIER', businessId: business.id, phone: '600111222', address: 'Calle de pruebas 3', dni: '12345678Z', avatarUrl: 'https://example.com/repartidor.png', courierRateCents: 250, courierTicketThresholdCents: 4000, courierDiscountEnabled: true, courierDiscountPercentage: 15, termsAccepted: true, termsVersion: 'v1' }, 201);
    courier = created.data.user;
    await api('/auth/verify-email', { method: 'POST', body: { email: 'repartidor@example.com', code: created.data.verificationCode }, status: 200 });
    assert.ok(courier.id);
    assert.equal(courier.courierProfile.confirmation, 'PENDING');
    assert.equal(courier.courierRateCents, 250);
    assert.equal(courier.courierTicketThresholdCents, 4000);
    assert.equal(courier.courierDiscountEnabled, true);
    assert.equal(courier.courierDiscountPercentage, 15);
    const courierDiscount = await send(`/users/${courier.id}`, 'PUT', { courierDiscountEnabled: true, courierRateCents: 200, courierTicketThresholdCents: 4000, courierDiscountPercentage: 25 });
    assert.equal(courierDiscount.data.user.courierDiscountEnabled, true);
    assert.equal(courierDiscount.data.user.courierRateCents, 200);
    assert.equal(courierDiscount.data.user.courierTicketThresholdCents, 4000);
    assert.equal(courierDiscount.data.user.courierDiscountPercentage, 25);
    const persistedCourier = (await api('/users', { token })).data.find((item) => item.id === courier.id);
    assert.equal(persistedCourier.courierRateCents, 200);
    assert.equal(persistedCourier.courierTicketThresholdCents, 4000);
    assert.equal(persistedCourier.courierDiscountEnabled, true);
    assert.equal(persistedCourier.courierDiscountPercentage, 25);
    await send(`/users/${courier.id}`, 'PUT', { courierConfirmation: 'BUSINESS_EMAIL' }, 200, owner.token);
    await send(`/users/${courier.id}`, 'PUT', { phone: '611222333', accountNumber: 'ES9121000418450200051332' });
    const courierSession = await login('repartidor_prueba', password);
    await send(`/users/${courier.id}`, 'PUT', { isOnline: true }, 200, courierSession.token);
    const receivingCouriers = (await api('/users', { token })).data;
    assert.equal(receivingCouriers.find((item) => item.id === courier.id).courierProfile.isReceivingDeliveries, true);
    await send(`/users/${courier.id}`, 'PUT', { isOnline: false }, 200, courierSession.token);
    const platformCreated = await send('/users', 'POST', {
      username: 'plataforma_prueba', fullName: 'Repartidor de plataforma',
      email: 'plataforma@example.com', password, role: 'PLATFORM_COURIER',
      courierBusinessIds: [business.id], phone: '600111223',
      address: 'Calle de plataforma 4', dni: '12345679Z', termsAccepted: true, termsVersion: 'v1',
      termsAccepted: true, termsVersion: 'v1',
    }, 201);
    platformCourier = platformCreated.data.user;
    await api('/auth/verify-email', { method: 'POST', body: { email: 'plataforma@example.com', code: platformCreated.data.verificationCode }, status: 200 });
    await send(`/users/${platformCourier.id}`, 'PUT', { courierConfirmation: 'SUPERADMIN' });
    const platformSession = await login('plataforma_prueba', password);
    await send(`/users/${platformCourier.id}`, 'PUT', { isOnline: true }, 200, platformSession.token);
    const businessesWithAvailability = (await api('/businesses')).data;
    assert.equal(businessesWithAvailability.find((item) => item.id === business.id).has_online_courier, true);
    assert.equal(businessesWithAvailability.find((item) => item.id === secondBusiness.id).has_online_courier, false);
    await send(`/users/${platformCourier.id}`, 'PUT', { isOnline: false }, 200, platformSession.token);
    const perBusinessCourier = await send(`/users/${platformCourier.id}`, 'PUT', {
      courierBusinessIds: [business.id, secondBusiness.id],
      courierBusinessSettings: {
        [business.id]: { courierRateCents: 200, courierTicketThresholdCents: 4000, courierDiscountEnabled: true, courierDiscountPercentage: 25 },
        [secondBusiness.id]: { courierRateCents: 350, courierTicketThresholdCents: 4000, courierDiscountEnabled: true, courierDiscountPercentage: 25 },
      },
    });
    assert.equal(perBusinessCourier.data.user.courierBusinessSettings[business.id].courierRateCents, 200);
    assert.equal(perBusinessCourier.data.user.courierBusinessSettings[secondBusiness.id].courierRateCents, 350);
    const ownCouriers = (await api('/users', { token: owner.token })).data;
    assert.ok(ownCouriers.some((item) => item.id === courier.id));
    assert.equal(ownCouriers.find((item) => item.id === courier.id).accountNumber, '');
    await send(`/users/${courier.id}`, 'PUT', { accountNumber: 'ES9121000418450200051332' }, 403, owner.token);
    await send(`/users/${courier.id}`, 'PUT', { courierConfirmation: 'BUSINESS_EMAIL' }, 403, secondOwner.token);
  });
  await t.test('productos: CRUD, opciones, existencias, categoría y ámbito', async () => {
    const payload = { businessId: business.id, categoryId: category.id, name: 'Plato prueba', priceCents: 1000, taxPercentage: 10, ingredients: ['Pan'], removableIngredients: ['Pan'], additionalIngredients: [{ id: 'queso', name: 'Queso', priceCents: 100 }] };
    product = { ...payload, id: (await send('/products', 'POST', payload, 201, owner.token)).data.id };
    await send(`/products/${product.id}`, 'PUT', { name: 'Plato editado', priceCents: 1200, isAvailable: false }, 200, owner.token);
    let saved = (await api('/products')).data.find((item) => item.id === product.id);
    assert.equal(saved.name, 'Plato editado'); assert.equal(saved.price_cents, 1200); assert.equal(saved.is_available, 0);
    await send(`/products/${product.id}`, 'PUT', { isAvailable: true }, 200, owner.token);
    await send(`/products/${product.id}`, 'PUT', { name: 'Sin permiso' }, 403, secondOwner.token);
    await send('/products', 'POST', { ...payload, categoryId: 'no-existe' }, 400, owner.token);
    const temporary = await send('/products', 'POST', { ...payload, name: 'Temporal' }, 201, owner.token);
    await send(`/products/${temporary.data.id}`, 'DELETE', undefined, 200, owner.token);
    assert.ok(!(await api('/products')).data.some((item) => item.id === temporary.data.id));
  });
  await t.test('productos: rechazar precios negativos y fracciones de céntimo', async () => {
    await send(`/products/${product.id}`, 'PUT', { priceCents: -100 }, 400, owner.token);
    await send(`/products/${product.id}`, 'PUT', { priceCents: 12.5 }, 400, owner.token);
  });
  await t.test('medios: rechazar subidas sin sesión y sin configuración', async () => {
    const body = { entityType: 'USER', entityId: client.user.id, fieldName: 'avatar_url', dataUrl: 'data:image/png;base64,aG9sYQ==' };
    await send('/media', 'POST', body, 401, null);
    await send('/media', 'POST', body, 503, client.token);
    await send('/media', 'POST', { ...body, entityId: admin.user.id }, 403, client.token);
  });
  await t.test('pedidos: crear desde cesta y consultar según el rol', async () => {
    orderId = 'pedido-crud';
    await send('/orders', 'POST', { id: orderId, businessId: business.id, customerId: client.user.id, customerName: 'Cliente', customerEmail: client.user.email, customerPhone: '666555444', deliveryType: 'DELIVERY', deliveryAddress: 'Calle de pruebas 2', deliveryPin: '4321', subtotalCents: 1200, deliveryFeeCents: 200, platformFeeCents: 100, businessPayoutCents: 1140, courierPayoutCents: 160, totalCents: 1400, status: 'NEW', items: [{ productId: product.id, productName: 'Plato editado', quantity: 1, unitPriceCents: 1200, totalCents: 1200 }] }, 201, client.token);
    await send(`/orders/${orderId}`, 'PUT', { courierId: courier.id, courierName: courier.name, courierPhone: '611222333' });
    const clientOrder = (await api('/orders', { token: client.token })).data.find((item) => item.id === orderId);
    assert.equal(clientOrder.businessDiscountCents, 120);
    assert.equal(clientOrder.courierDiscountCents, 50);
    assert.equal(clientOrder.businessPayoutCents, 1020);
    assert.equal(clientOrder.courierPayoutCents, 150);
    assert.equal(clientOrder.platformFeeCents, 230);
    await send('/orders', 'POST', {
      id: 'pedido-ticket-extra',
      businessId: business.id,
      customerId: client.user.id,
      customerName: 'Cliente',
      customerEmail: client.user.email,
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Calle de pruebas 2',
      deliveryPin: '4321',
      subtotalCents: 4800,
      deliveryFeeCents: 200,
      platformFeeCents: 100,
      businessPayoutCents: 4560,
      courierPayoutCents: 160,
      totalCents: 4820,
      status: 'NEW',
      items: [{ productId: product.id, productName: 'Plato editado', quantity: 4, unitPriceCents: 1200, totalCents: 4800 }],
    }, 201, client.token);
    await send('/orders/pedido-ticket-extra', 'PUT', { courierId: courier.id }, 200, owner.token);
    const extraTicketOrder = (await api('/orders', { token: client.token })).data.find((item) => item.id === 'pedido-ticket-extra');
    assert.equal(extraTicketOrder.courierDiscountCents, 75);
    assert.equal(extraTicketOrder.courierPayoutCents, 225);
    secondProduct = (await send('/products', 'POST', {
      businessId: secondBusiness.id,
      categoryId: category.id,
      name: 'Plato segundo negocio',
      priceCents: 1200,
    }, 201, secondOwner.token)).data;
    await send('/orders', 'POST', {
      id: 'pedido-tarifa-segundo-negocio',
      businessId: secondBusiness.id,
      customerId: client.user.id,
      customerName: 'Cliente',
      customerEmail: client.user.email,
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Calle de pruebas 2',
      deliveryPin: '4321',
      subtotalCents: 1200,
      deliveryFeeCents: 200,
      platformFeeCents: 100,
      businessPayoutCents: 1140,
      courierPayoutCents: 160,
      totalCents: 1400,
      status: 'NEW',
      items: [{ productId: secondProduct.id, productName: 'Plato segundo negocio', quantity: 1, unitPriceCents: 1200, totalCents: 1200 }],
    }, 201, client.token);
    await send('/orders/pedido-tarifa-segundo-negocio', 'PUT', { courierId: platformCourier.id }, 200, admin.token);
    const secondBusinessOrder = (await api('/orders', { token: client.token })).data.find((item) => item.id === 'pedido-tarifa-segundo-negocio');
    assert.equal(secondBusinessOrder.courierDiscountCents, 88);
    assert.equal(secondBusinessOrder.courierPayoutCents, 262);
    assert.equal(clientOrder.courierAvatarUrl, 'https://example.com/repartidor.png');
    assert.ok((await api('/orders', { token: client.token })).data.some((item) => item.id === orderId));
    assert.ok((await api('/orders', { token: owner.token })).data.some((item) => item.id === orderId));
    assert.ok(!(await api('/orders', { token: secondOwner.token })).data.some((item) => item.id === orderId));
    await send(`/orders/${orderId}`, 'PUT', { status: 'READY' }, 200, owner.token);
    await send(`/orders/${orderId}`, 'PUT', { status: 'DELIVERED', deliveryPin: '0000' }, 400, owner.token);
    await send(`/orders/${orderId}`, 'PUT', { status: 'DELIVERED', deliveryPin: '4321' }, 200, owner.token);
    await send(`/orders/${orderId}`, 'PUT', { reviewScore: 5 }, 200, client.token);
    await send('/orders/pedido-ticket-extra', 'DELETE');
    const ratedProduct = (await api('/products')).data.find((item) => item.id === product.id);
    assert.equal(Number(ratedProduct.rating), 5);
    assert.equal(Number(ratedProduct.ratingCount), 1);
    await send(`/businesses/${business.id}`, 'DELETE', undefined, 409);
  });
  await t.test('pedidos: impedir sobrescribir un pedido existente por POST', async () => {
    await send('/orders', 'POST', { id: orderId, businessId: secondBusiness.id, customerId: client.user.id, totalCents: 1 }, 409, client.token);
  });
  await t.test('pedidos: validar líneas, cantidades, estados y valoraciones', async () => {
    await send('/orders', 'POST', { businessId: business.id, items: [] }, 400, client.token);
    const base = { businessId: business.id, items: [{ productId: product.id, quantity: 1, unitPriceCents: 1200, totalCents: 1200 }] };
    await send('/orders', 'POST', { ...base, items: [{ quantity: 1, unitPriceCents: 1200, totalCents: 1200 }] }, 400, client.token);
    await send('/orders', 'POST', { ...base, status: 'inventado' }, 400);
    await send('/orders', 'POST', { ...base, items: [{ ...base.items[0], quantity: -1 }] }, 400, client.token);
    await send('/orders', 'POST', { ...base, businessId: secondBusiness.id }, 400, client.token);
    await send(`/orders/${orderId}`, 'PUT', { status: 'inventado' }, 400, owner.token);
    await send(`/orders/${orderId}`, 'PUT', { reviewScore: 6 }, 400, client.token);
    await send(`/orders/${orderId}`, 'PUT', { status: 'READY', deliveryPin: '9999' }, 403, owner.token);
    const saved = (await api('/orders', { token })).data.find((item) => item.id === orderId);
    assert.equal(saved.deliveryPin, '4321');
  });
  await t.test('pedidos: rechazar importes negativos y pedidos para otro negocio', async () => {
    await send('/orders', 'POST', { businessId: business.id, totalCents: -1 }, 400, client.token);
    await send('/orders', 'POST', { businessId: business.id, totalCents: 100 }, 403, secondOwner.token);
  });
  await t.test('borrados: pedidos, productos, usuarios y negocios sin dependencias', async () => {
    await send(`/orders/${orderId}`, 'DELETE', undefined, 403, secondOwner.token);
    await send(`/orders/${orderId}`, 'DELETE');
    await send('/orders/pedido-tarifa-segundo-negocio', 'DELETE');
    assert.ok(!(await api('/orders', { token })).data.some((item) => item.id === orderId));
    await send(`/products/${product.id}`, 'DELETE', undefined, 200, owner.token);
    await send(`/products/${secondProduct.id}`, 'DELETE', undefined, 200, secondOwner.token);
    await send(`/users/${courier.id}`, 'DELETE');
    await send(`/users/${platformCourier.id}`, 'DELETE');
    await send(`/users/${client.user.id}`, 'DELETE');
    await send(`/users/${admin.user.id}`, 'DELETE', undefined, 400);
    await send(`/businesses/${secondBusiness.id}`, 'DELETE');
    await send(`/businesses/${business.id}`, 'DELETE');
    await send(`/categories/${category.id}`, 'DELETE');
    await send(`/localities/${zone.id}`, 'DELETE');
    assert.equal((await api('/businesses')).data.length, 0);
    assert.equal((await api('/products')).data.length, 0);
  });
});
