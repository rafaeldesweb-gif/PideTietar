import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import path from 'node:path';
import { chromium } from 'playwright';

test('entrar por username conserva el correo y permite guardar el teléfono', { timeout: 30000 }, async (t) => {
  const user = { id: 'perfil-prueba', username: 'RafaAdmin', name: 'Administrador', email: 'admin@example.com', phone: '', role: 'SUPERADMIN' };
  const fixture = `
        import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {AppProvider, useApp, setSessionToken} from './src/context/AppContext';
        import {AuthModal} from './src/components/AuthModal';
        function Fixture() {
          const app = useApp();
          return <><button onClick={() => {setSessionToken('token-prueba'); app.loginAs('SUPERADMIN', 'RafaAdmin', ${JSON.stringify(user)});}}>Acceder</button>
            <AuthModal isOpen={true} onClose={() => {}}/>
            <output id="notice">{app.notification?.message}</output>
            <output id="profile">{JSON.stringify(app.currentUser)}</output></>;
        }
        createRoot(document.getElementById('root')).render(<AppProvider><Fixture/></AppProvider>);
      `;
  const bundle = await build({
    configFile: false,
    logLevel: 'error',
    plugins: [{
      name: 'perfil-de-prueba',
      resolveId(id) {
        if (id === 'perfil-fixture.tsx') return '\0perfil-fixture.tsx';
        if (id.startsWith('./src/')) return path.resolve(id) + '.tsx';
      },
      load(id) { if (id === '\0perfil-fixture.tsx') return fixture; },
    }],
    build: { write: false, minify: false, rollupOptions: { input: 'perfil-fixture.tsx', output: { format: 'iife' } } },
  });
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const requests = [];
  await page.route('http://perfil.test/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (!pathname.startsWith('/api/')) return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
    if (request.method() === 'PUT') {
      const body = request.postDataJSON();
      requests.push(body);
      if (body.phone === 'abc') return route.fulfill({ status: 400, json: { message: 'Revisa los datos del formulario; hay campos con errores.', errors: { phone: 'El teléfono debe contener entre 7 y 15 dígitos.' } } });
      return route.fulfill({ json: { success: true, user: { ...user, name: body.fullName, email: body.email, phone: body.phone } } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('http://perfil.test/');
  await page.addScriptTag({ content: bundle.output.find((item) => item.type === 'chunk').code });
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  const email = page.locator('input[type="email"]');
  await page.waitForFunction(() => document.querySelector('input[type="email"]')?.value === 'admin@example.com');
  assert.equal(await email.inputValue(), user.email);
  const phone = page.locator('input[type="tel"]');
  await phone.fill('666555444');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#notice')?.textContent === 'Perfil actualizado correctamente.');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].email, user.email);
  assert.equal(requests[0].phone, '666555444');
  assert.equal(JSON.parse(await page.locator('#profile').textContent()).phone, '666555444');

  await email.fill('RafaAdmin');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('correo electrónico válido'));
  assert.equal(requests.length, 1);

  await email.fill(user.email);
  await phone.fill('abc');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#notice')?.textContent === 'El teléfono debe contener entre 7 y 15 dígitos.');
  assert.equal(requests.length, 2);
});
