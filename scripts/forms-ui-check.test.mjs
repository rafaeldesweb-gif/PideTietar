import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'vite';
import { chromium } from 'playwright';
import { startTestApp, businessInput } from './test-app.mjs';
import { DatabaseSync } from 'node:sqlite';

test('formularios reales contra una API aislada, con estilos y clics de navegador', { timeout: 180000 }, async (t) => {
  const { api, admin, password, url, login, directory } = await startTestApp(t);
  const token = admin.token;
  const zone = (await api('/localities', { method: 'POST', token, body: { name: 'Zona UI', postalCode: '05400' }, status: 201 })).data.locality;
  const category = (await api('/categories', { method: 'POST', token, body: { name: 'Categoría UI', slug: 'categoria-ui' }, status: 201 })).data.category;
  const business = (await api('/businesses', { method: 'POST', token, body: businessInput('ui', zone.id, category.id, password), status: 201 })).data.business;
  const owner = await login('propietario_ui');
  const client = (await api('/auth/register', { method: 'POST', body: { username: 'cliente_ui', email: 'clienteui@example.com', fullName: 'Cliente UI', password, address: 'Calle UI 1', phone: '600111222', localityId: zone.id }, status: 201 })).data;
  const courier = (await api('/users', { method: 'POST', token, body: { username: 'courier_ui', email: 'courierui@example.com', fullName: 'Repartidor UI', password, role: 'PLATFORM_COURIER', courierConfirmation: 'SUPERADMIN', phone: '600111222', address: 'Calle UI 2', dni: '12345678Z' }, status: 201 })).data.user;
  const courierLogin = await login('courier_ui');
  const product = (await api('/products', { method: 'POST', token, body: { businessId: business.id, categoryId: category.id, name: 'Plato UI', priceCents: 1000, ingredients: ['Pan'], removableIngredients: ['Pan'], additionalIngredients: [{ name: 'Queso', priceCents: 100 }] }, status: 201 })).data;
  const fixture = `
    import React, {useEffect, useRef} from 'react'; import {createRoot} from 'react-dom/client';
    import {AppProvider,useApp} from './src/context/AppContext';
    import {AdminDashboard} from './src/components/AdminDashboard'; import {BusinessDashboard} from './src/components/BusinessDashboard';
    import {CategoryManagerModal} from './src/components/CategoryManagerModal';import {AuthModal} from './src/components/AuthModal';
    import {ProductCustomizerModal} from './src/components/ProductCustomizerModal';import {CartDrawer} from './src/components/CartDrawer';
    import {CourierDashboard} from './src/components/CourierDashboard';import './src/index.css';
    import {OrdersView} from './src/components/OrdersView';
    function Fixture(){const app=useApp();const ready=useRef(false);window.testApp=app;const view=window.testView;
      const product=app.products.find(p=>p.id===${JSON.stringify(product.id)});
      useEffect(()=>{if(view==='cart'&&product&&app.currentUser&&!ready.current){ready.current=true;app.addToCart({product,quantity:1,removedIngredients:[],selectedOptions:[],customerNote:'',itemPriceCents:product.priceCents},${JSON.stringify(business.id)});}},[product,app.currentUser]);
      if(!app.sessionChecked)return null;
      return <><output id="notice" style={{position:'fixed',top:0,right:0,zIndex:100,pointerEvents:'none'}}>{app.notification?.message}</output>
        {view==='admin'&&<AdminDashboard/>}{view==='business'&&<BusinessDashboard initialBusinessId=${JSON.stringify(business.id)}/>}
        {view==='category'&&<CategoryManagerModal open onClose={()=>{}}/>}{view==='auth'&&<AuthModal isOpen onClose={()=>{}}/>}
        {view==='product'&&<ProductCustomizerModal isOpen product={product||null} businessId=${JSON.stringify(business.id)} onClose={()=>{}}/>}
        {view==='cart'&&<CartDrawer isOpen onClose={()=>{}} onOrderSuccess={id=>{window.savedOrderId=id;}}/>}
        {view==='courier'&&<CourierDashboard/>}{view==='orders'&&<OrdersView/>}</>;
    }createRoot(document.getElementById('root')).render(<AppProvider><Fixture/></AppProvider>);`;
  const bundle = await build({ logLevel: 'error', plugins: [{ name: 'formularios-fixture',
    resolveId(id) { if (id === 'formularios-fixture.tsx') return '\0formularios-fixture.tsx'; if (id.startsWith('./src/')) return path.resolve(id) + (path.extname(id) ? '' : '.tsx'); },
    load(id) { if (id === '\0formularios-fixture.tsx') return fixture; },
  }], build: { write: false, minify: false, rollupOptions: { input: 'formularios-fixture.tsx', output: { format: 'iife' } } } });
  const code = bundle.output.find((item) => item.type === 'chunk').code;
  const css = bundle.output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css')).map((item) => item.source).join('\n');
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  t.after(() => browser.close());
  const errors = [];
  const open = async (view, session = admin, width = 1280) => {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.route('https://**/*', (route) => route.abort());
    await page.addInitScript(({ view, token }) => { window.testView = view; if (token) localStorage.setItem('pidetietar_token', token); }, { view, token: session?.token });
    await page.route(`${url}/__formularios`, (route) => route.fulfill({ contentType: 'text/html', body: `<style>${css}</style><div id="root"></div>` }));
    await page.goto(`${url}/__formularios`);
    await page.addScriptTag({ content: code });
    await page.waitForFunction(() => window.testApp?.sessionChecked && window.testApp?.categories.length > 0);
    return { page, close: () => context.close() };
  };
  const field = (scope, label) => scope.locator('label').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).locator('..').locator('input,textarea,select').first();
  const savedResponse = async (page, endpoint, method, action) => {
    const response = page.waitForResponse((response) => new URL(response.url()).pathname === `/api${endpoint}` && response.request().method() === method).catch(() => null);
    let result, actionError;
    try { await action(); result = await response; } catch (error) { actionError = error.message; }
    if (!result) {
      const details = await page.evaluate(() => ({ notice: document.querySelector('#notice')?.textContent, invalid: [...document.querySelectorAll('input:invalid,select:invalid,textarea:invalid')].map((input) => ({ type: input.type, value: input.type === 'password' ? '[oculto]' : input.value, message: input.validationMessage })) }));
      throw new Error(`${method} ${endpoint}: ${JSON.stringify(details)} ${actionError || ''}`);
    }
    assert.ok(result.ok(), `${method} ${endpoint}: ${await result.text()}`);
  };

  await t.test('registro y acceso: conserva dirección y email al entrar por username', async () => {
    const { page, close } = await open('auth', null, 375);
    try {
      await page.getByPlaceholder('Ej. Rafael Santos').fill('Cliente registrado UI');
      await page.getByPlaceholder('+34 600 000 000').fill('600123456');
      await page.locator('input[placeholder^="Calle, número"]').fill('Calle UI registro 10');
      await page.locator('select').selectOption(zone.id);
      await page.getByPlaceholder('tu@email.com', { exact: true }).fill('registradoui@example.com');
      await page.getByPlaceholder('••••••••').fill(password);
      await savedResponse(page, '/auth/register', 'POST', () => page.getByRole('button', { name: 'CREAR CUENTA', exact: true }).click());
      await page.waitForFunction(() => window.testApp.currentUser?.address === 'Calle UI registro 10');
      await page.getByRole('button', { name: 'Cerrar Sesión', exact: true }).click();
      await page.getByRole('button', { name: 'Acceso', exact: true }).click();
      await page.getByPlaceholder('tu@email.com o usuario').fill('registradoui');
      await page.getByPlaceholder('••••••••').fill(password);
      await savedResponse(page, '/auth/login', 'POST', () => page.getByRole('button', { name: 'INICIAR SESIÓN', exact: true }).click());
      await page.waitForFunction(() => window.testApp.currentUser?.email === 'registradoui@example.com');
      assert.equal(await page.evaluate(() => window.testApp.currentUser.address), 'Calle UI registro 10');
    } finally { await close(); }
  });

  await t.test('categorías: alta, edición y borrado desde el modal', async () => {
    const { page, close } = await open('category');
    try {
      await field(page, 'Nombre').fill('Categoría desde UI');
      await savedResponse(page, '/categories', 'POST', () => page.getByRole('button', { name: 'Añadir categoría', exact: true }).click());
      await page.getByRole('button', { name: 'Editar Categoría desde UI', exact: true }).click();
      await field(page, 'Nombre').fill('Categoría UI editada');
      const row = (await api('/categories')).data.find((item) => item.name === 'Categoría desde UI');
      await savedResponse(page, `/categories/${row.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click());
      await savedResponse(page, `/categories/${row.id}`, 'DELETE', () => page.getByRole('button', { name: 'Eliminar Categoría UI editada', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('cambio de contraseña obligatorio desde el formulario de acceso', async () => {
    const account = (await api('/users', { method: 'POST', token, body: { fullName: 'Cambio obligatorio', username: 'cambio_ui', email: 'cambioui@example.com', password, role: 'CLIENT' }, status: 201 })).data.user;
    const database = new DatabaseSync(path.join(directory, 'app.db'));
    database.prepare('UPDATE app_users SET password_change_required = 1 WHERE id = ?').run(account.id); database.close();
    const { page, close } = await open('auth', null, 375);
    try {
      await page.getByRole('button', { name: 'Acceso', exact: true }).click();
      await page.getByPlaceholder('tu@email.com o usuario').fill('cambio_ui');
      await page.getByPlaceholder('••••••••').fill(password);
      await page.getByRole('button', { name: 'INICIAR SESIÓN', exact: true }).click();
      await page.getByPlaceholder('Mínimo 8 caracteres').fill(`${password}-nuevo`);
      await page.getByPlaceholder('Repite la nueva contraseña').fill(`${password}-nuevo`);
      await savedResponse(page, '/auth/change-password', 'POST', () => page.getByRole('button', { name: 'ACTUALIZAR CONTRASEÑA', exact: true }).click());
      assert.equal((await login('cambio_ui', `${password}-nuevo`)).user.id, account.id);
    } finally { await close(); }
  });
  await t.test('superadmin: añadir localidad y editar horario sin capas que bloqueen clics', async () => {
    const { page, close } = await open('admin');
    try {
      await field(page, 'Nombre Localidad').fill('Localidad UI creada'); await field(page, 'C. Postal').fill('05402');
      await savedResponse(page, '/localities', 'POST', () => page.getByRole('button', { name: 'Añadir', exact: true }).click());
      await page.getByRole('row').filter({ hasText: business.name }).getByRole('button', { name: 'Editar', exact: true }).click();
      const form = page.locator('form').filter({ has: page.getByPlaceholder('Ej. El Buen Sabor') });
      await field(form, 'Teléfono').fill('666555444');
      await form.getByText('Lunes', { exact: true }).locator('..').locator('input').check();
      await form.locator('input[type=time]').first().fill('09:30');
      await savedResponse(page, `/businesses/${business.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar Cambios del Comercio', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('negocio: crear, editar y borrar un plato desde su formulario', async () => {
    const { page, close } = await open('business', owner);
    try {
      await page.getByRole('button', { name: 'GESTIÓN MENÚ', exact: true }).click();
      await page.getByPlaceholder('Ej. Hamburguesa Valleña').fill('Plato creado UI');
      await page.getByPlaceholder('Describe el plato...').fill('Descripción de prueba');
      await field(page, 'Precio en €').fill('12.50');
      await field(page, 'Categoría').selectOption(category.id);
      await savedResponse(page, '/products', 'POST', () => page.getByRole('button', { name: 'Añadir producto', exact: true }).click());
      const created = (await api('/products')).data.find((item) => item.name === 'Plato creado UI'); assert.ok(created);
      const row = page.locator('div').filter({ has: page.getByText('Plato creado UI', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Editar producto', exact: true }) }).last();
      await row.getByRole('button', { name: 'Editar producto', exact: true }).click();
      await page.getByPlaceholder('Ej. Hamburguesa Valleña').fill('Plato UI editado');
      await savedResponse(page, `/products/${created.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click());
      const editedRow = page.locator('div').filter({ has: page.getByText('Plato UI editado', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Eliminar producto', exact: true }) }).last();
      await savedResponse(page, `/products/${created.id}`, 'DELETE', () => editedRow.getByRole('button', { name: 'Eliminar producto', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('superadmin: registrar un comercio completo desde el formulario', async () => {
    const { page, close } = await open('admin');
    try {
      await page.getByRole('button', { name: 'Registrar Nuevo Comercio', exact: true }).click();
      const form = page.locator('form').filter({ has: page.getByPlaceholder('Ej. El Buen Sabor') });
      for (const [label, value] of Object.entries({ 'Nombre Comercial': 'Comercio formulario UI', 'Razón Social': 'Comercio formulario UI', 'CIF / NIF': 'B12345678', 'Dirección': 'Calle UI negocio 1', 'Teléfono': '600123456', 'Email': 'comerciocreado@example.com', 'Nombre del Responsable': 'Responsable UI', 'DNI/NIE del Responsable': '12345678Z', 'Usuario de acceso': 'propietario_creado_ui', 'Email de acceso': 'propietariocreado@example.com', 'Clave inicial': password })) await field(form, label).fill(value);
      await field(form, 'Localidad').selectOption(zone.id);
      await field(form, 'Categoría').selectOption(category.id);
      await savedResponse(page, '/businesses', 'POST', () => page.getByRole('button', { name: 'Guardar Comercio y Crear Usuario', exact: true }).click());
      assert.ok((await api('/businesses')).data.some((item) => item.name === 'Comercio formulario UI'));
    } finally { await close(); }
  });
  await t.test('repartidores: alta desde superadministración y desde el negocio', async () => {
    for (const [view, session, suffix] of [['admin', admin, 'admin'], ['business', owner, 'negocio']]) {
      const { page, close } = await open(view, session);
      try {
        if (view === 'admin') await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
        else await page.getByRole('button', { name: 'EQUIPO', exact: true }).click();
        const form = page.locator('form').filter({ has: page.locator('input[placeholder="Mínimo 8 caracteres"]') });
        for (const [label, value] of Object.entries({ 'Nombre completo': `Repartidor UI ${suffix}`, 'Usuario de acceso': `repartidor_ui_${suffix}`, 'Email': `repartidorui${suffix}@example.com`, 'Clave inicial': password, 'Teléfono': '600123456', 'DNI / NIE': '12345678Z', 'Dirección': 'Calle UI repartidor 1' })) await field(form, label).fill(value);
        if (view === 'admin') await field(form, 'Tipo de repartidor').selectOption('PLATFORM_COURIER');
        await savedResponse(page, '/users', 'POST', () => form.locator('button[type=submit]').click());
      } finally { await close(); }
    }
  });
  await t.test('repartidores: editar datos de cobro y confirmar desde superadministración', async () => {
    const target = (await api('/users', { token })).data.find((user) => user.username === 'repartidor_ui_admin');
    assert.ok(target);
    const { page, close } = await open('admin');
    try {
      const row = page.locator('div').filter({ has: page.getByText('Repartidor UI admin', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Editar', exact: true }) }).last();
      await row.getByRole('button', { name: 'Confirmar', exact: true }).click();
      await row.getByRole('button', { name: 'Editar', exact: true }).click();
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Guardar cambios', exact: true }) });
      await field(form, 'Teléfono').fill('611222333');
      await form.getByPlaceholder('ES91 2100 0418 4502 0005 1332').fill('ES9121000418450200051332');
      await savedResponse(page, `/users/${target.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('nuevo negocio desde cocina y CRUD de zonas en el modal', async () => {
    const { page, close } = await open('business');
    try {
      await page.getByRole('button', { name: 'GESTIÓN MENÚ', exact: true }).click();
      await page.getByRole('button', { name: 'CREAR UN NEGOCIO NUEVO', exact: true }).click();
      await page.getByRole('button', { name: 'Gestionar zonas', exact: true }).click();
      await page.getByPlaceholder('Nombre de la nueva zona').fill('Zona modal UI');
      await page.getByPlaceholder('Código postal', { exact: true }).fill('05403');
      await savedResponse(page, '/localities', 'POST', () => page.getByRole('button', { name: 'Añadir zona', exact: true }).click());
      const createdZone = (await api('/localities')).data.find((item) => item.name === 'Zona modal UI');
      const row = page.locator('div').filter({ has: page.getByText('Zona modal UI', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Editar zona', exact: true }) }).last();
      await row.getByRole('button', { name: 'Editar zona', exact: true }).click();
      await page.getByPlaceholder('Nombre', { exact: true }).fill('Zona modal editada');
      await savedResponse(page, `/localities/${createdZone.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar zona', exact: true }).click());
      const edited = page.locator('div').filter({ has: page.getByText('Zona modal editada', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Eliminar zona', exact: true }) }).last();
      await savedResponse(page, `/localities/${createdZone.id}`, 'DELETE', () => edited.getByRole('button', { name: 'Eliminar zona', exact: true }).click());
      await page.getByRole('heading', { name: 'Gestionar zonas', exact: true }).locator('..').locator('button').click();
      const businessForm = page.locator('form').filter({ has: page.locator('input[placeholder="B12345678"]') });
      for (const [label, value] of Object.entries({ 'Nombre del negocio': 'Negocio creado desde cocina', 'Razón social': 'Negocio creado desde cocina', 'CIF': 'B12345678', 'Teléfono': '600123456', 'Dirección': 'Calle cocina UI 1', 'Email': 'cocinacreada@example.com', 'Persona responsable': 'Responsable cocina', 'DNI / NIE responsable': '12345678Z', 'Usuario': 'propietario_cocina_ui', 'Email de acceso': 'propietariococina@example.com', 'Contraseña temporal': password, 'Gasto de envío (€)': '0' })) await field(businessForm, label).fill(value);
      await field(businessForm, 'Categoría').selectOption(category.id);
      await businessForm.locator('select').nth(1).selectOption(zone.id);
      await savedResponse(page, '/businesses', 'POST', () => businessForm.locator('button[type=submit]').click());
      assert.equal((await api('/businesses')).data.find((item) => item.name === 'Negocio creado desde cocina').delivery_fee_cents, 0);
    } finally { await close(); }
  });
  await t.test('configuración: mantener el formulario abierto si la API rechaza el perfil', async () => {
    const { page, close } = await open('business', owner, 375);
    try {
      await page.getByRole('button', { name: 'Abrir configuracion', exact: true }).click();
      await field(page, 'Teléfono').fill('abc');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('7 y 15'));
      assert.equal(await field(page, 'Teléfono').inputValue(), 'abc');
      await field(page, 'Teléfono').fill('600123456');
      await savedResponse(page, `/users/${owner.user.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('comanda manual: personalizar un plato y guardar el pedido', async () => {
    const { page, close } = await open('business', owner);
    try {
      await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
      await page.getByPlaceholder('Nombre del cliente').fill('Comensal UI');
      await page.getByPlaceholder('Teléfono *').fill('600123456');
      await page.getByRole('button', { name: /Plato UI.*Añadir/ }).click();
      await page.getByPlaceholder('Ejemplo: Bien tostado, salsa aparte...').fill('Nota manual UI');
      await page.getByRole('button', { name: /Añadir a la comanda/ }).click();
      await savedResponse(page, '/orders', 'POST', () => page.getByRole('button', { name: 'Guardar pedido', exact: true }).click());
      assert.ok((await api('/orders', { token: owner.token })).data.some((item) => item.customer_name === 'Comensal UI' || item.customerName === 'Comensal UI'));
    } finally { await close(); }
  });
  await t.test('datos del negocio: guardar el IBAN desde móvil', async () => {
    const { page, close } = await open('business', owner, 375);
    try {
      await page.getByRole('button', { name: 'Editar datos del negocio', exact: true }).click();
      await field(page, 'Cuenta bancaria (IBAN)').fill('ES9121000418450200051332');
      await savedResponse(page, `/businesses/${business.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('perfil: editar teléfono y mostrar/ocultar contraseña', async () => {
    const { page, close } = await open('auth', client, 375);
    try {
      await page.locator('input[type=tel]').fill('666555444');
      await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
      assert.equal(await page.getByPlaceholder('Mínimo 8 caracteres').getAttribute('type'), 'text');
      await savedResponse(page, `/users/${client.user.id}`, 'PUT', () => page.getByRole('button', { name: 'Guardar cambios', exact: true }).click());
    } finally { await close(); }
  });
  await t.test('foto de perfil: preparar archivo y comunicar un fallo de almacenamiento sin cerrar el formulario', async () => {
    const { page, close } = await open('auth', client, 375);
    try {
      await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=', 'base64') });
      await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('Foto preparada'));
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('no está configurado'));
      assert.equal(await page.getByRole('button', { name: 'Guardar cambios', exact: true }).count(), 1);
    } finally { await close(); }
  });
  await t.test('personalización: extras, cantidades y nota llegan a la cesta', async () => {
    const { page, close } = await open('product', client, 375);
    try {
      await page.getByText('Queso', { exact: true }).click();
      const button = page.getByRole('button', { name: /Añadir.*pedido|Añadir.*cesta/i });
      await button.click();
      const cart = await page.evaluate(() => window.testApp.cart);
      assert.equal(cart.items[0].selectedOptions[0].optionName, 'Queso');
    } finally { await close(); }
  });
  await t.test('cesta: usa el teléfono escrito y conserva el carrito ante un rechazo', async () => {
    const { page, close } = await open('cart', client, 375);
    try {
      await page.getByRole('button', { name: 'Recogida en local', exact: true }).click();
      await page.locator('input[type=tel]').fill('611222333');
      await page.locator('input[type=checkbox]').uncheck();
      await page.route('**/api/orders', async (route) => route.request().method() === 'POST' ? route.fulfill({ status: 400, json: { message: 'Rechazo de prueba' } }) : route.continue());
      await page.getByRole('button', { name: /Confirmar|Finalizar|Pagar/i }).click();
      await page.waitForFunction(() => document.querySelector('#notice')?.textContent === 'Rechazo de prueba');
      assert.equal((await page.evaluate(() => window.testApp.cart)).items.length, 1);
      await page.unroute('**/api/orders');
      await page.getByRole('button', { name: /Confirmar|Finalizar|Pagar/i }).click();
      await page.waitForFunction(() => window.savedOrderId);
      const id = await page.evaluate(() => window.savedOrderId);
      const order = (await api('/orders', { token: client.token })).data.find((item) => item.id === id);
      assert.equal(order.customer_phone ?? order.customerPhone, '611222333');
    } finally { await close(); }
  });
  await t.test('repartidor: PIN válido confirmado por la API', async () => {
    await api('/orders', { method: 'POST', token, body: { id: 'entrega-ui', businessId: business.id, courierId: courier.id, status: 'READY', deliveryType: 'DELIVERY', deliveryPin: '4321', items: [{ productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 }], subtotalCents: 1000, totalCents: 1000 }, status: 201 });
    const { page, close } = await open('courier', courierLogin, 375);
    try {
      await page.locator('input').fill('4321');
      await savedResponse(page, '/orders/entrega-ui', 'PUT', () => page.getByRole('button', { name: /Validar|Confirmar/i }).click());
      assert.equal((await api('/orders', { token })).data.find((item) => item.id === 'entrega-ui').status, 'DELIVERED');
    } finally { await close(); }
  });
  await t.test('cliente: enviar una valoración y conservarla al recargar', async () => {
    await api('/orders', { method: 'POST', token, body: { id: 'valoracion-ui', businessId: business.id, customerId: client.user.id, customerEmail: client.user.email, status: 'DELIVERED', deliveryType: 'PICKUP', items: [{ productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 }], subtotalCents: 1000, totalCents: 1000 }, status: 201 });
    const { page, close } = await open('orders', client, 375);
    try {
      await page.getByRole('button', { name: 'Valorar con 4 estrellas', exact: true }).click();
      await savedResponse(page, '/orders/valoracion-ui', 'PUT', () => page.getByRole('button', { name: /Enviar valoración/ }).click());
      assert.equal((await api('/orders', { token: client.token })).data.find((item) => item.id === 'valoracion-ui').reviewScore, 4);
      assert.equal((await api('/businesses')).data.find((item) => item.id === business.id).review_count, 1);
    } finally { await close(); }
  });
  await t.test('responsive: formularios y paneles en móvil, tablet y escritorio', async () => {
    const overflows = [];
    for (const width of [320, 375, 768, 1280]) {
      for (const [view, session] of [['admin', admin], ['business', owner], ['category', admin], ['auth', client], ['product', client], ['cart', client], ['courier', courierLogin]]) {
        const { page, close } = await open(view, session, width);
        try {
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          if (scrollWidth > width) overflows.push({ view, width, scrollWidth, elements: await page.evaluate(() => [...document.querySelectorAll('input,button,select,h1,h2,p,form')].filter((el) => el.getBoundingClientRect().right > innerWidth).map((el) => ({ tag: el.tagName, text: el.textContent?.slice(0, 50), class: el.className })).slice(0, 6)) });
        } finally { await close(); }
      }
    }
    assert.deepEqual(overflows, [], 'Desbordamiento horizontal');
  });
  assert.deepEqual(errors, [], 'Errores JavaScript en los formularios');
});
