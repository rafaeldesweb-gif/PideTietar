import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { startTestApp, businessInput } from './test-app.mjs';

test('conexiones: exclusividad, autorización exclusiva del SuperAdmin y cierre revocable', { timeout: 30000 }, async (t) => {
  const { api, admin, password, login } = await startTestApp(t);
  const zone = (await api('/localities', { method: 'POST', token: admin.token, body: { name: 'Zona conexiones', postalCode: '05400' }, status: 201 })).data.locality;
  const category = (await api('/categories')).data[0];
  const client = (await api('/auth/register', { method: 'POST', body: { username: 'cliente_conexiones', fullName: 'Cliente conexiones', email: 'clienteconexiones@example.test', password, address: 'Calle prueba 1, 05400', localityId: zone.id, termsAccepted: true, termsVersion: 'v1' }, status: 201 })).data;
  const loginDevice = (username, deviceId, status) => api('/auth/login', { method: 'POST', body: { username, password, deviceId }, status });
  await loginDevice('cliente_conexiones', 'equipo-2', 409);
  const reload = await login('cliente_conexiones');
  assert.equal(reload.token, client.token);
  await api('/auth/logout', { method: 'POST', token: client.token, status: 200 });
  await api('/auth/me', { token: client.token, status: 401 });
  const reentered = (await loginDevice('cliente_conexiones', 'equipo-2', 200)).data;
  await api(`/users/${client.user.id}/connections`, { method: 'PUT', token: admin.token, body: { additionalConnections: 1 }, status: 400 });
  await api('/auth/logout', { method: 'POST', token: reentered.token, status: 200 });
  const simultaneous = await Promise.all(['equipo-a', 'equipo-b'].map((deviceId) => loginDevice('cliente_conexiones', deviceId)));
  assert.deepEqual(simultaneous.map((result) => result.status).sort(), [200, 409]);

  const input = businessInput('conexiones', zone.id, category.id, password);
  const created = (await api('/businesses', { method: 'POST', token: admin.token, body: input, status: 201 })).data;
  await api('/auth/verify-email', { method: 'POST', body: { email: input.owner.email, code: created.verificationCode }, status: 200 });
  const owner = await login(input.owner.username);
  await loginDevice(input.owner.username, 'caja-2', 409);
  await api(`/users/${owner.user.id}/connections`, { method: 'PUT', token: owner.token, body: { additionalConnections: 1 }, status: 403 });
  await api(`/users/${owner.user.id}/connections`, { method: 'PUT', token: admin.token, body: { additionalConnections: 1 }, status: 200 });
  const second = (await loginDevice(input.owner.username, 'caja-2', 200)).data;
  await loginDevice(input.owner.username, 'caja-3', 409);
  const access = (await api(`/users/${owner.user.id}/connections`, { token: admin.token, status: 200 })).data;
  assert.deepEqual(access, { additionalConnections: 1, maxConnections: 2, activeConnections: 2 });
  await api(`/users/${owner.user.id}/connections`, { method: 'PUT', token: admin.token, body: { additionalConnections: 0 }, status: 409 });
  await api(`/businesses/${created.business.id}`, { method: 'PUT', token: owner.token, body: { is_shift_open: 1 }, status: 200 });
  await api('/auth/logout', { method: 'POST', token: owner.token, status: 200 });
  assert.equal(Number((await api('/businesses')).data.find((business) => business.id === created.business.id).is_shift_open), 1);
  await api('/auth/logout', { method: 'POST', token: second.token, status: 200 });
  assert.equal(Number((await api('/businesses')).data.find((business) => business.id === created.business.id).is_shift_open), 0);
  await api('/auth/me', { token: second.token, status: 401 });
  await loginDevice('RafaAdmin', 'otro-superadmin', 409);
  await api(`/users/${admin.user.id}/connections`, { method: 'PUT', token: admin.token, body: { additionalConnections: 1 }, status: 400 });
});

test('presencia real: mantiene la sesión conectada y la revoca al cerrar o perder los latidos', { timeout: 20000 }, async (t) => {
  const { api, admin, password, url } = await startTestApp(t, { sessionDisconnectMs: 1200 });
  const connect = async (token, autoPong = true) => {
    const socket = new WebSocket(url.replace('http:', 'ws:') + '/api/auth/session', { autoPong });
    socket.on('error', () => {});
    t.after(() => socket.terminate());
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No se autenticó la conexión de sesión.')), 3000);
      socket.on('open', () => socket.send(JSON.stringify({ token })));
      socket.on('message', (raw) => {
        if (JSON.parse(raw).type === 'ready') { clearTimeout(timeout); resolve(); }
      });
    });
    return socket;
  };
  const waitClosed = async (token) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      if ((await api('/auth/me', { token })).status === 401) return;
      await delay(100);
    }
    assert.fail('La sesión desconectada siguió siendo válida.');
  };
  const socket = await connect(admin.token);
  await delay(2500);
  await api('/auth/me', { token: admin.token, status: 200 });
  socket.close();
  await waitClosed(admin.token);
  const next = (await api('/auth/login', { method: 'POST', body: { username: 'RafaAdmin', password, deviceId: 'equipo-nuevo' }, status: 200 })).data;
  await connect(next.token, false);
  await waitClosed(next.token);
  await api('/auth/me', { token: admin.token, status: 401 });
});
