import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Regresión de perfiles con un servidor y una SQLite temporales, sin Hostinger.
test('el perfil se guarda con sesiones nuevas y con el ID antiguo del superadmin', { timeout: 30000 }, async (t) => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'pidetietar-perfil-'));
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const secret = randomBytes(32).toString('hex');
  const password = randomBytes(20).toString('hex');
  const child = spawn(process.execPath, ['server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: path.join(temporaryDirectory, 'app.db'),
      DB_HOST: '', MYSQL_HOST: '',
      DB_USER: '', MYSQL_USER: '',
      DB_PASSWORD: '', MYSQL_PASSWORD: '',
      DB_NAME: '', MYSQL_DATABASE: '',
      SESSION_SECRET: secret,
      SUPERADMIN_USERNAME: 'AdminPrueba',
      SUPERADMIN_PASSWORD: password,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    // mkdtemp fija el destino dentro de la carpeta temporal del sistema.
    const relative = path.relative(path.resolve(tmpdir()), path.resolve(temporaryDirectory));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(temporaryDirectory, { recursive: true, force: true });
  });
  const api = async (route, { token, body, method = 'GET' } = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/api${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
    return { status: response.status, data: await response.json() };
  };
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const health = await api('/health');
      if (health.status === 200) { ready = true; break; }
    } catch { /* El servidor todavía está arrancando. */ }
    if (child.exitCode !== null) break;
    await delay(100);
  }
  assert.ok(ready, `No arrancó el servidor de prueba: ${logs}`);

  const login = await api('/auth/login', { method: 'POST', body: { username: 'RafaAdmin', password } });
  assert.equal(login.status, 200);
  assert.notEqual(login.data.user.id, 'superadmin-rafaadmin');
  const { token, user } = login.data;

  await t.test('actualiza nombre, email, teléfono, avatar y contraseña; conserva los datos al entrar de nuevo', async () => {
    const newPassword = randomBytes(20).toString('hex');
    const fields = { fullName: 'Perfil editado', email: 'perfil@example.com', phone: '600123456', avatarUrl: 'https://example.com/avatar.png', password: newPassword };
    const saved = await api(`/users/${user.id}`, { method: 'PUT', token, body: fields });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.user.name, fields.fullName);
    assert.equal(saved.data.user.email, fields.email);
    assert.equal(saved.data.user.phone, fields.phone);
    assert.equal(saved.data.user.avatarUrl, fields.avatarUrl);
    assert.equal(saved.data.user.password_hash, undefined);
    const refreshed = await api('/auth/me', { token });
    assert.deepEqual(refreshed.data.user, saved.data.user);
    const normalLogin = await api('/auth/login', { method: 'POST', body: { email: fields.email, password: newPassword } });
    assert.equal(normalLogin.status, 200);
    assert.equal(normalLogin.data.user.name, fields.fullName);
    const emergencyLogin = await api('/auth/login', { method: 'POST', body: { username: 'RafaAdmin', password } });
    assert.equal(emergencyLogin.data.user.id, user.id);
    assert.equal(emergencyLogin.data.user.email, fields.email);
  });

  await t.test('una sesión antigua edita la fila real y sigue leyendo sus cambios', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'superadmin-rafaadmin', role: 'SUPERADMIN', exp: Date.now() + 60000 })).toString('base64url');
    const legacyToken = `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
    const saved = await api('/users/superadmin-rafaadmin', { method: 'PUT', token: legacyToken, body: { fullName: 'Perfil de sesión antigua' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.user.id, user.id);
    assert.equal(saved.data.user.name, 'Perfil de sesión antigua');
    const refreshed = await api('/auth/me', { token: legacyToken });
    assert.equal(refreshed.data.user.name, saved.data.user.name);
  });

  await t.test('un cliente edita su perfil, pero no el del administrador', async () => {
    const zone = await api('/localities', { method: 'POST', token, body: { name: 'Zona de pruebas', postalCode: '05400' } });
    const registered = await api('/auth/register', { method: 'POST', body: { username: 'cliente_prueba', fullName: 'Cliente', email: 'cliente@example.com', password, address: 'Calle de prueba 1', localityId: zone.data.locality.id } });
    assert.equal(registered.status, 201);
    const clientToken = registered.data.token;
    const clientId = registered.data.user.id;
    const saved = await api(`/users/${clientId}`, { method: 'PUT', token: clientToken, body: { fullName: 'Cliente editado' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.user.name, 'Cliente editado');
    const forbidden = await api(`/users/${user.id}`, { method: 'PUT', token: clientToken, body: { fullName: 'Sin permiso' } });
    assert.equal(forbidden.status, 403);
    const missing = await api('/users/inexistente', { method: 'PUT', token, body: { fullName: 'No existe' } });
    assert.equal(missing.status, 404);
  });
});
