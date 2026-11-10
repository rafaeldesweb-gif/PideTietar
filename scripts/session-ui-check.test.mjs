import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'vite';
import { chromium } from 'playwright';

test('sesión privada: salir, cerrar pestaña, restaurar, recargar y perder conexión', { timeout: 60000 }, async (t) => {
  const user = { id: 'usuario-sesion', role: 'CLIENT', name: 'Usuario de sesión', email: 'sesion@example.test', isEmailVerified: true };
  const keys = ['pidetietar_token', 'pidetietar_orders', 'pidetietar_cart', 'pidetietar_google_token'];
  const fixture = `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {AppProvider,useApp,setSessionToken,getSessionToken} from './src/context/AppContext';
    import {sessionStore} from './src/utils/browserSession';
    import {AdminDashboard} from './src/components/AdminDashboard';
    function Fixture(){const app=useApp();window.testApp=app;window.readToken=getSessionToken;window.sessionStore=sessionStore;
      return <><button onClick={()=>{setSessionToken('token-prueba');app.loginAs(window.adminView?'SUPERADMIN':'CLIENT',${JSON.stringify(user.email)},${JSON.stringify(user)});}}>Acceder</button>
        <button onClick={()=>app.logout()}>Cerrar sesión</button>
        <output id="ready">{app.sessionChecked?'listo':'cargando'}</output><output id="user">{app.currentUser?.name||'Sin sesión'}</output>
        {window.adminView&&app.currentUser&&<AdminDashboard/>}
      </>;}
    createRoot(document.getElementById('root')).render(<AppProvider><Fixture/></AppProvider>);`;
  const bundle = await build({ configFile: false, logLevel: 'error', plugins: [{ name: 'sesion-fixture',
    resolveId(id) {
      if (id === 'sesion-fixture.tsx') return '\0sesion-fixture.tsx';
      if (id.startsWith('./src/')) return path.resolve(id) + (id.includes('/utils/') ? '.ts' : '.tsx');
    },
    load(id) { if (id === '\0sesion-fixture.tsx') return fixture; },
  }], build: { write: false, minify: false, rollupOptions: { input: 'sesion-fixture.tsx', output: { format: 'iife' } } } });
  const code = bundle.output.find((item) => item.type === 'chunk').code;
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  t.after(() => browser.close());

  const open = async ({ legacy = false, failReport = false, clock = false, adminView = false } = {}) => {
    const context = await browser.newContext();
    const requests = [];
    let additionalConnections = 0;
    await context.routeWebSocket('**/api/auth/session', (socket) => {
      socket.onMessage(() => socket.send(JSON.stringify({ type: 'ready' })));
    });
    await context.route('http://sesion.test/**', (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (!pathname.startsWith('/api/')) return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
      requests.push({ pathname, token: request.headers().authorization });
      if (pathname === '/api/businesses' && adminView) return route.fulfill({ json: [{ id: 'negocio-1', name: 'Negocio conexiones', owner_user_id: 'owner-1', delivery_modes: ['PICKUP'] }] });
      if (pathname === '/api/users/owner-1/connections') {
        if (request.method() === 'PUT') additionalConnections = request.postDataJSON().additionalConnections;
        return route.fulfill({ json: { success: true, additionalConnections, maxConnections: 1 + additionalConnections, activeConnections: 1 } });
      }
      if (pathname === '/api/auth/me') return route.fulfill({ json: { user } });
      if (pathname === '/api/auth/logout') return failReport
        ? route.fulfill({ status: 503, json: { message: 'Fallo simulado' } })
        : route.fulfill({ json: { success: true, report: { sent: true, message: 'Reporte enviado' } } });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    if (adminView) await page.addInitScript(() => { window.adminView = true; });
    if (clock) await page.clock.install();
    if (legacy) await page.addInitScript((keys) => keys.forEach((key) => localStorage.setItem(key, 'dato-antiguo')), keys);
    const mount = async (target = page) => {
      await target.addScriptTag({ content: code });
      await target.waitForFunction(() => document.querySelector('#ready')?.textContent === 'listo');
    };
    await page.goto('http://sesion.test/');
    await mount();
    const login = async () => {
      await page.getByRole('button', { name: 'Acceder', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#user')?.textContent === 'Usuario de sesión');
    };
    return { context, page, requests, mount, login };
  };

  await t.test('limpia las credenciales antiguas de localStorage sin restaurar esa cuenta', async () => {
    const { context, page, requests } = await open({ legacy: true });
    try {
      assert.equal(await page.locator('#user').textContent(), 'Sin sesión');
      assert.deepEqual(await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), keys), keys.map(() => null));
      assert.ok(!requests.some((request) => request.pathname === '/api/auth/me'));
    } finally { await context.close(); }
  });

  await t.test('cerrar sesión limpia token, pedidos, cesta y Google; el reporte recibe el token antes de borrarlo', async () => {
    const { context, page, requests, login } = await open();
    try {
      await login();
      await page.evaluate((keys) => keys.forEach((key) => {
        localStorage.setItem(key, 'legado');
        if (key !== 'pidetietar_token') window.sessionStore.setItem(key, 'dato-privado');
      }), keys);
      const sent = page.waitForResponse((response) => response.url().endsWith('/api/auth/logout'));
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await sent;
      await page.waitForFunction(() => document.querySelector('#user')?.textContent === 'Sin sesión');
      assert.equal(requests.find((request) => request.pathname === '/api/auth/logout').token, 'Bearer token-prueba');
      const saved = await page.evaluate((keys) => keys.map((key) => [localStorage.getItem(key), sessionStorage.getItem(key)]), keys);
      assert.deepEqual(saved, keys.map(() => [null, null]));
    } finally { await context.close(); }
  });

  await t.test('F5 conserva la sesión y no la escribe en localStorage', async () => {
    const { context, page, mount, login } = await open();
    try {
      await login();
      await page.reload();
      await mount();
      await page.waitForFunction(() => document.querySelector('#user')?.textContent === 'Usuario de sesión');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('pidetietar_token')), 'token-prueba');
      assert.deepEqual(await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), keys), keys.map(() => null));
    } finally { await context.close(); }
  });

  await t.test('cerrar y volver a abrir la pestaña en el mismo navegador pide otro acceso', async () => {
    const { context, page, mount, login } = await open();
    try {
      await login();
      await page.close();
      const reopened = await context.newPage();
      await reopened.goto('http://sesion.test/');
      await mount(reopened);
      assert.equal(await reopened.locator('#user').textContent(), 'Sin sesión');
      assert.equal(await reopened.evaluate(() => window.readToken()), '');
    } finally { await context.close(); }
  });

  await t.test('una página restaurada después de salir no recupera al usuario anterior', async () => {
    const { context, page, mount, login } = await open();
    try {
      await login();
      await page.goto('http://sesion.test/otra-pagina');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('pidetietar_session_page_exited')), '1');
      await page.goto('http://sesion.test/');
      await mount();
      assert.equal(await page.locator('#user').textContent(), 'Sin sesión');
      assert.equal(await page.evaluate(() => window.readToken()), '');
    } finally { await context.close(); }
  });

  await t.test('un corte breve de Internet no cierra la sesión del navegador abierto', async () => {
    const { context, page, login } = await open();
    try {
      await login();
      await context.setOffline(true);
      assert.equal(await page.locator('#user').textContent(), 'Usuario de sesión');
      assert.equal(await page.evaluate(() => window.readToken()), 'token-prueba');
      await context.setOffline(false);
      assert.equal(await page.locator('#user').textContent(), 'Usuario de sesión');
    } finally { await context.close(); }
  });

  await t.test('10 segundos sin Internet cierran la sesión y limpian el almacenamiento', async () => {
    const { context, page, login } = await open({ clock: true });
    try {
      await login();
      await context.setOffline(true);
      await page.clock.runFor(9000);
      assert.equal(await page.locator('#user').textContent(), 'Usuario de sesión');
      await page.clock.runFor(1500);
      await page.waitForFunction(() => document.querySelector('#user')?.textContent === 'Sin sesión');
      assert.equal(await page.evaluate(() => window.readToken()), '');
      await context.setOffline(false);
      assert.equal(await page.locator('#user').textContent(), 'Sin sesión');
    } finally { await context.close(); }
  });

  await t.test('la sesión local se elimina incluso si falla el reporte por correo', async () => {
    const { context, page, login } = await open({ failReport: true });
    try {
      await login();
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#user')?.textContent === 'Sin sesión');
      assert.equal(await page.evaluate(() => window.readToken()), '');
      assert.equal(await page.evaluate(() => localStorage.getItem('pidetietar_token')), null);
    } finally { await context.close(); }
  });

  await t.test('SuperAdmin autoriza cupos adicionales del negocio desde su panel', async () => {
    const { context, page, login } = await open({ adminView: true });
    try {
      await page.setViewportSize({ width: 375, height: 900 });
      await login();
      await page.getByRole('button', { name: 'Conexiones', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Conexiones de Negocio conexiones', exact: true });
      await dialog.getByLabel('Conexiones adicionales autorizadas').fill('2');
      assert.equal(await dialog.getByText('Total permitido: 3 conexiones.', { exact: true }).isVisible(), true);
      const response = page.waitForResponse((response) => response.url().endsWith('/users/owner-1/connections') && response.request().method() === 'PUT');
      await dialog.getByRole('button', { name: 'Autorizar conexiones', exact: true }).click();
      assert.equal((await response).request().postDataJSON().additionalConnections, 2);
      await dialog.waitFor({ state: 'detached' });
    } finally { await context.close(); }
  });
});
