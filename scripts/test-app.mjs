import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export async function startTestApp(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'pidetietar-crud-'));
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  const password = randomBytes(20).toString('hex');
  const child = spawn(process.execPath, ['server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true,
    env: {
      ...process.env, NODE_ENV: 'test', PORT: String(port), DB_PATH: path.join(directory, 'app.db'),
      DB_HOST: '', MYSQL_HOST: '', DB_USER: '', MYSQL_USER: '', DB_PASSWORD: '', MYSQL_PASSWORD: '', DB_NAME: '', MYSQL_DATABASE: '',
      SESSION_SECRET: randomBytes(32).toString('hex'), SUPERADMIN_USERNAME: 'AdminPruebas', SUPERADMIN_PASSWORD: password,
      SUPABASE_URL: '', SUPABASE_SECRET_KEY: '',
      SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', EMAIL_HOST: '', EMAIL_USER: '', EMAIL_PASS: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk; });
  child.stderr.on('data', (chunk) => { logs += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit'); child.kill(); await ended;
    }
    const relative = path.relative(path.resolve(tmpdir()), path.resolve(directory));
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${port}`;
  const api = async (route, { method = 'GET', token, body, status } = {}) => {
    const response = await fetch(`${url}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    if (status !== undefined) assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(data)}`);
    return { status: response.status, data };
  };
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { const health = await api('/health'); if (health.status === 200) { assert.equal(health.data.mode, 'sqlite'); ready = true; break; } } catch { /* Arranque. */ }
    if (child.exitCode !== null) break;
    await delay(100);
  }
  assert.ok(ready, `No arrancó el servidor aislado: ${logs}`);
  const login = async (username, secret = password) => (await api('/auth/login', { method: 'POST', body: { username, password: secret }, status: 200 })).data;
  const admin = await login('RafaAdmin');
  return { api, url, directory, password, admin, login };
}

export const businessInput = (suffix, localityId, category, password) => ({
  name: `Negocio ${suffix}`, legalName: `Negocio ${suffix}`, cif: 'B12345678', phone: '600123456', email: `negocio${suffix}@example.com`,
  address: 'Calle de pruebas 1', localityId, category, deliveryModes: ['PICKUP', 'PLATFORM_COURIER'],
  schedule: [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({ dayOfWeek, openTime: '12:00', closeTime: '00:00', isOpen: dayOfWeek !== 1 })),
  owner: { username: `propietario_${suffix}`, fullName: `Dueño ${suffix}`, email: `propietario${suffix}@example.com`, password },
});
