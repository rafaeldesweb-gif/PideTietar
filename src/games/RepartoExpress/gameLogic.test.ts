import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deliveryIntervalFor,
  deliveryScore,
  isScoreWithinLimit,
  levelGoal,
  levelIsReachable,
  pickSpawnLane,
  rectsOverlap,
  speedMultiplier,
  timeBonusLabel,
} from './gameLogic';
import { DEFAULT_DURATION_SECONDS, LEVEL_RULES, MAX_SCORE_PER_GAME } from './gameConstants';

test('cada nivel se puede completar dentro de su minuto base', () => {
  for (const rule of LEVEL_RULES) {
    assert.equal(levelIsReachable(rule.level, DEFAULT_DURATION_SECONDS), true, `nivel ${rule.level}`);
    assert.ok(
      rule.bags * rule.deliveryIntervalMs <= DEFAULT_DURATION_SECONDS * 1000,
      'la meta de bolsas no debe depender de recoger cubiertos',
    );
  }
});

test('los niveles suben la meta y acortan el intervalo de bolsas', () => {
  assert.equal(levelGoal(1), 10);
  assert.equal(levelGoal(5), 50);
  assert.ok(deliveryIntervalFor(5) < deliveryIntervalFor(1));
  // Fuera de rango se comporta como el último nivel definido.
  assert.equal(levelGoal(99), LEVEL_RULES[LEVEL_RULES.length - 1].bags);
  assert.equal(levelGoal(0), LEVEL_RULES[0].bags);
});

test('la velocidad arranca en 1, sube un 20 % por nivel y un 10 % cada 10 s', () => {
  assert.equal(speedMultiplier(1, 0), 1);
  assert.ok(Math.abs(speedMultiplier(2, 0) - 1.2) < 1e-9);
  assert.ok(Math.abs(speedMultiplier(1, 10000) - 1.1) < 1e-9);
  assert.ok(Math.abs(speedMultiplier(1, 25000) - 1.1 ** 2) < 1e-9);
  assert.ok(speedMultiplier(5, 50000) > speedMultiplier(4, 50000));
});

test('el carril elegido es el que tiene más espacio delante', () => {
  const occupied = [
    { lane: 0, y: 200 },
    { lane: 1, y: 600 },
    { lane: 2, y: 300 },
  ];
  // El carril 3 está libre del todo.
  assert.equal(pickSpawnLane(occupied, 4, () => 0), 3);
});

test('con varios carriles empatados el reparto es determinista con la semilla', () => {
  const occupied = [{ lane: 0, y: 500 }];
  assert.equal(pickSpawnLane(occupied, 3, () => 0), 1);
  assert.equal(pickSpawnLane(occupied, 3, () => 0.99), 2);
});

test('la caja de la moto ignora los objetos lejanos y detecta el contacto', () => {
  const moto = { x: 100, y: 400, w: 40, h: 20 };
  assert.equal(rectsOverlap(moto, { x: 100, y: 430, w: 30, h: 40 }), false);
  assert.equal(rectsOverlap(moto, { x: 110, y: 405, w: 30, h: 40 }), true);
  assert.equal(rectsOverlap(moto, { x: 200, y: 405, w: 30, h: 40 }), false);
});

test('una bolsa suma cien puntos más dos por segundo restante', () => {
  assert.equal(deliveryScore(60000), 100 + 60 * 2);
  assert.equal(deliveryScore(0), 100);
  assert.equal(deliveryScore(-500), 100);
});

test('el tope de puntuación y las etiquetas de tiempo son coherentes', () => {
  assert.equal(isScoreWithinLimit(0), true);
  assert.equal(isScoreWithinLimit(MAX_SCORE_PER_GAME), true);
  assert.equal(isScoreWithinLimit(MAX_SCORE_PER_GAME + 1), false);
  assert.equal(isScoreWithinLimit(Number.NaN), false);
  assert.equal(timeBonusLabel(3), '+3 s');
  assert.equal(timeBonusLabel(-10), '−10 s');
  assert.equal(timeBonusLabel(0), '');
});
