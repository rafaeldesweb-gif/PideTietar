import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './test-app.mjs';

test('Reparto Express guarda puntuaciones, valida niveles y publica clasificación', async (t) => {
  const { api, admin } = await startTestApp(t);
  const token = admin.token;

  await api('/game/score', {
    method: 'POST', token, status: 201,
    body: { game: 'reparto-express', score: 75000, level_reached: 5 },
  });
  const saved = await api('/game/score?game=reparto-express', { token, status: 200 });
  assert.equal(saved.data.bestScore, 75000);
  assert.equal(saved.data.bestLevel, 5);
  assert.equal(saved.data.gamesPlayed, 1);
  assert.equal(saved.data.lastScore, 75000);
  assert.equal(saved.data.lastLevel, 5);

  await api('/game/score', {
    method: 'POST', token, status: 201,
    body: { game: 'reparto-express', score: 1200, level_reached: 2 },
  });
  const latest = await api('/game/score?game=reparto-express', { token, status: 200 });
  assert.equal(latest.data.bestScore, 75000);
  assert.equal(latest.data.bestLevel, 5);
  assert.equal(latest.data.lastScore, 1200);
  assert.equal(latest.data.lastLevel, 2);
  assert.equal(latest.data.gamesPlayed, 2);

  const excessive = await api('/game/score', {
    method: 'POST', token, status: 400,
    body: { game: 'reparto-express', score: 100001, level_reached: 5 },
  });
  assert.equal(excessive.data.errors.score, 'La puntuación supera el límite permitido.');

  // El tope de puntuación es el mismo para cualquier juego.
  const otherGame = await api('/game/score', {
    method: 'POST', token, status: 400,
    body: { game: 'otro-juego', score: 100001, level_reached: 1 },
  });
  assert.equal(otherGame.data.errors.score, 'La puntuación supera el límite permitido.');

  // Ningún juego admite niveles por encima de los definidos.
  const tooHigh = await api('/game/score', {
    method: 'POST', token, status: 400,
    body: { game: 'reparto-express', score: 900, level_reached: 6 },
  });
  assert.equal(tooHigh.data.errors.level_reached, 'El nivel no puede superar 5.');

  const tooLow = await api('/game/score', {
    method: 'POST', token, status: 400,
    body: { game: 'reparto-express', score: 900, level_reached: 0 },
  });
  assert.equal(tooLow.data.errors.level_reached, 'El nivel debe ser un número entero mayor o igual a 1.');

  // Sin sesión no se puede leer ni escribir.
  await api('/game/score?game=reparto-express', { status: 401 });
  await api('/game/score', {
    method: 'POST', status: 401,
    body: { game: 'reparto-express', score: 10, level_reached: 1 },
  });
  await api('/game/leaderboard?game=reparto-express', { status: 401 });

  const board = await api('/game/leaderboard?game=reparto-express&limit=5', { token, status: 200 });
  assert.equal(board.data.leaders.length, 1);
  assert.equal(board.data.leaders[0].position, 1);
  assert.equal(board.data.leaders[0].userId, admin.user.id);
  assert.equal(board.data.leaders[0].score, 75000);
  assert.equal(board.data.leaders[0].levelReached, 5);
  assert.equal(board.data.me.position, 1);
  assert.equal(board.data.me.score, 75000);

  // El ranking de un juego sin partidas queda vacío.
  const empty = await api('/game/leaderboard?game=sin-partidas', { token, status: 200 });
  assert.deepEqual(empty.data.leaders, []);
  assert.equal(empty.data.me, null);
});

test('el progreso de PideTiétar Play se guarda por usuario y por juego', async (t) => {
  const { api, admin, password } = await startTestApp(t);
  const token = admin.token;

  // Sin sesión no hay progreso guardado.
  await api('/game/progress?game=memory-html', { status: 401 });
  await api('/game/progress', {
    method: 'POST', status: 401,
    body: { game: 'memory-html', level: 1 },
  });

  // Solo se admiten juegos con niveles y niveles dentro del catálogo.
  const badGame = await api('/game/progress?game=desconocido', { token, status: 400 });
  assert.ok(badGame.data.errors.game);
  const badLevel = await api('/game/progress', {
    method: 'POST', token, status: 400,
    body: { game: 'memory-html', level: 11 },
  });
  assert.match(badLevel.data.errors.level, /entre 1 y 10/);
  const zero = await api('/game/progress', {
    method: 'POST', token, status: 400,
    body: { game: 'memory-html', level: 0 },
  });
  assert.match(zero.data.errors.level, /entre 1 y 10/);

  // Guardar es idempotente y la lectura viene ordenada.
  for (const level of [3, 1, 2, 2]) {
    await api('/game/progress', {
      method: 'POST', token, status: 201,
      body: { game: 'memory-html', level },
    });
  }
  const memory = await api('/game/progress?game=memory-html', { token, status: 200 });
  assert.equal(memory.data.game, 'memory-html');
  assert.equal(memory.data.maxLevel, 10);
  assert.deepEqual(memory.data.levels, [1, 2, 3]);

  // Cada juego conserva su propio avance y su propio límite.
  await api('/game/progress', {
    method: 'POST', token, status: 201,
    body: { game: 'classic-puzzle', level: 12 },
  });
  const puzzle = await api('/game/progress?game=classic-puzzle', { token, status: 200 });
  assert.equal(puzzle.data.maxLevel, 12);
  assert.deepEqual(puzzle.data.levels, [12]);
  const beyond = await api('/game/progress', {
    method: 'POST', token, status: 400,
    body: { game: 'classic-puzzle', level: 13 },
  });
  assert.match(beyond.data.errors.level, /entre 1 y 12/);

  // El progreso es de cada cuenta: un usuario nuevo empieza de cero.
  const zone = (await api('/localities', {
    method: 'POST', token, status: 201,
    body: { name: 'Zona de progreso', postalCode: '05400' },
  })).data.locality;
  const client = (await api('/auth/register', {
    method: 'POST', status: 201,
    body: {
      username: 'progreso', fullName: 'Cliente Progreso', email: 'progreso@example.com',
      password, address: 'Calle de pruebas 2, 05400', localityId: zone.id,
      termsAccepted: true, termsVersion: 'v1',
    },
  })).data;
  const empty = await api('/game/progress?game=memory-html', { token: client.token, status: 200 });
  assert.deepEqual(empty.data.levels, []);
});
