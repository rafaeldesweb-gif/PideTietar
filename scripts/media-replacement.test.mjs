import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { replaceMediaAsset } from '../server/supabaseMedia.js';

// Usa el SDK real y simula únicamente el transporte HTTP de Supabase.
function mediaServer(initial = []) {
  const rows = new Map(initial.map((row) => [row.id, row]));
  const files = new Map();
  const calls = [];
  let failRelation = false;
  const client = createClient('https://media.example.com', 'clave-de-prueba', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      const request = new Request(url, options);
      const address = new URL(request.url);
      calls.push({ method: request.method, path: address.pathname });
      const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
      if (address.pathname.startsWith('/storage/v1/object/')) {
        assert.equal(request.headers.get('x-upsert'), 'true');
        files.set(address.pathname, Buffer.from(await request.arrayBuffer()));
        return json({ Key: address.pathname });
      }
      assert.equal(address.pathname, '/rest/v1/media_assets');
      if (request.method === 'GET') {
        return json([...rows.values()].filter((row) => ['entity_type', 'entity_id', 'field_name'].every((key) => address.searchParams.get(key) === `eq.${row[key]}`)).slice(0, 1));
      }
      if (failRelation) return json({ message: 'Fallo de relación simulado' }, 500);
      const body = await request.json();
      assert.match(request.headers.get('Prefer'), /resolution=merge-duplicates/);
      assert.equal(address.searchParams.get('on_conflict'), 'id');
      const row = { created_at: new Date().toISOString(), ...rows.get(body.id), ...body };
      rows.set(row.id, row);
      return json(row);
    } },
  });
  return { client, rows, files, calls, fail: () => { failRelation = true; } };
}

const input = { entityType: 'USER', entityId: 'usuario-prueba', fieldName: 'avatar_url', buffer: Buffer.from('foto-1'), contentType: 'image/jpeg', createdBy: 'usuario-prueba' };

test('actualizar repetidamente una foto conserva un único archivo y una única fila', async () => {
  const server = mediaServer();
  const first = await replaceMediaAsset(server.client, 'app-images', input);
  const second = await replaceMediaAsset(server.client, 'app-images', { ...input, buffer: Buffer.from('foto-2'), contentType: 'image/png' });
  assert.equal(first.id, second.id);
  assert.equal(first.storage_path, second.storage_path);
  assert.equal(first.created_at, second.created_at);
  assert.notEqual(first.public_url, second.public_url);
  assert.equal(second.mime_type, 'image/png');
  assert.equal(server.rows.size, 1);
  assert.equal(server.files.size, 1);
  assert.equal([...server.files.values()][0].toString(), 'foto-2');
});

test('reutiliza también las rutas aleatorias de fotos anteriores', async () => {
  const previous = { id: '2dd64a85-d5f9-4560-8619-9bc17896be21', entity_type: 'USER', entity_id: input.entityId, field_name: input.fieldName, storage_bucket: 'otro-bucket', storage_path: 'user/antiguo/foto.jpg', created_at: '2026-01-01T00:00:00Z' };
  const server = mediaServer([previous]);
  const saved = await replaceMediaAsset(server.client, 'app-images', input);
  assert.equal(saved.id, previous.id);
  assert.equal(saved.storage_path, previous.storage_path);
  assert.equal(saved.storage_bucket, previous.storage_bucket);
  assert.equal(server.rows.size, 1);
});

test('dos primeras subidas simultáneas usan la misma identidad', async () => {
  const server = mediaServer();
  const [a, b] = await Promise.all([replaceMediaAsset(server.client, 'app-images', input), replaceMediaAsset(server.client, 'app-images', input)]);
  assert.equal(a.id, b.id);
  assert.equal(a.storage_path, b.storage_path);
  assert.equal(server.rows.size, 1);
  assert.equal(server.files.size, 1);
});

test('cada usuario y cada campo mantienen su propia foto', async () => {
  const server = mediaServer();
  await replaceMediaAsset(server.client, 'app-images', input);
  await replaceMediaAsset(server.client, 'app-images', { ...input, entityId: 'otro-usuario' });
  await replaceMediaAsset(server.client, 'app-images', { ...input, fieldName: 'banner_url' });
  assert.equal(server.rows.size, 3);
  assert.equal(server.files.size, 3);
});

test('un fallo de metadatos se comunica y no elimina la foto sobrescrita', async () => {
  const server = mediaServer();
  await replaceMediaAsset(server.client, 'app-images', input);
  server.fail();
  await assert.rejects(replaceMediaAsset(server.client, 'app-images', input), { code: 'MEDIA_RELATION_FAILED' });
  assert.equal(server.files.size, 1);
  assert.ok(server.calls.every((call) => call.method !== 'DELETE'));
});
