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
