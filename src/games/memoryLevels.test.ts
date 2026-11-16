import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEMORY_LEVELS,
  boardColumns,
  createDeck,
  firstPendingIndex,
  isLevelUnlocked,
  memoryScore,
  serverLevelFor,
} from './memoryLevels';

test('hay diez niveles que suben de 8 a 24 parejas', () => {
  assert.equal(MEMORY_LEVELS.length, 10);
  assert.deepEqual(
    MEMORY_LEVELS.map((level) => level.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  // El nivel 1 es un tablero 4×4 (8 parejas) y el 10 llega a 24 parejas.
  assert.equal(MEMORY_LEVELS[0].pairs, 8);
  assert.equal(MEMORY_LEVELS[0].columns, 4);
  assert.equal(MEMORY_LEVELS[0].pairs * 2, 16);
  assert.equal(MEMORY_LEVELS[MEMORY_LEVELS.length - 1].pairs, 24);

  for (let index = 1; index < MEMORY_LEVELS.length; index += 1) {
    assert.ok(
      MEMORY_LEVELS[index].pairs > MEMORY_LEVELS[index - 1].pairs,
      `el nivel ${index + 1} debe tener más parejas que el anterior`,
    );
  }
});

test('cada nivel tiene dibujos distintos y suficientes para todas sus parejas', () => {
  for (const level of MEMORY_LEVELS) {
    assert.ok(level.symbols.length >= level.pairs, `nivel ${level.id}`);
    assert.equal(
      new Set(level.symbols).size,
      level.symbols.length,
      `el nivel ${level.id} repite algún dibujo`,
    );
    assert.ok(level.symbols.length >= 24, `el nivel ${level.id} necesita 24 dibujos distintos`);
  }

  const temas = MEMORY_LEVELS.map((level) => level.symbols.join(''));
  for (let index = 1; index < temas.length; index += 1) {
    assert.notEqual(temas[index], temas[index - 1], `el nivel ${index + 1} repite el tema anterior`);
  }
});

test('el reparto duplica cada dibujo exactamente dos veces', () => {
  for (const level of MEMORY_LEVELS) {
    const deck = createDeck(level);
    assert.equal(deck.length, level.pairs * 2, `nivel ${level.id}`);

    const counts = new Map<string, number>();
    for (const card of deck) counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
    assert.equal(counts.size, level.pairs);
    assert.ok([...counts.values()].every((count) => count === 2));

    assert.equal(new Set(deck.map((card) => card.id)).size, deck.length);
  }
});

test('los niveles se desbloquean en orden', () => {
  assert.equal(isLevelUnlocked(0, []), true);
  assert.equal(isLevelUnlocked(1, []), false);
  assert.equal(isLevelUnlocked(1, [1]), true);
  assert.equal(isLevelUnlocked(2, [1]), false);
  assert.equal(isLevelUnlocked(2, [1, 2]), true);

  assert.equal(firstPendingIndex([]), 0);
  assert.equal(firstPendingIndex([1, 2]), 2);
  // Con todo superado se reanuda en el primero.
  assert.equal(firstPendingIndex(MEMORY_LEVELS.map((level) => level.id)), 0);
});

test('la puntuación premia los niveles grandes y penaliza tiempo y movimientos', () => {
  assert.ok(memoryScore(16, 60, 40) >= 10);
  assert.ok(memoryScore(24, 60, 40) > memoryScore(16, 60, 40));
  assert.ok(memoryScore(16, 120, 40) < memoryScore(16, 60, 40));
  assert.ok(memoryScore(16, 60, 80) < memoryScore(16, 60, 40));
  // Partidas desastrosas nunca bajan de 10 puntos.
  assert.equal(memoryScore(16, 9999, 9999), 10);
});

test('el nivel enviado al servidor se queda entre 1 y 5', () => {
  assert.equal(serverLevelFor(1), 1);
  assert.equal(serverLevelFor(2), 1);
  assert.equal(serverLevelFor(3), 2);
  assert.equal(serverLevelFor(10), 5);
  assert.equal(serverLevelFor(99), 5);
});

test('el tablero usa menos columnas en pantallas estrechas', () => {
  for (const level of MEMORY_LEVELS) {
    assert.ok(level.compactColumns <= level.columns, `nivel ${level.id}`);
    assert.equal(boardColumns(level, false), level.columns);
    assert.equal(boardColumns(level, true), level.compactColumns);
  }
});

test('cada nivel cabe en una pantalla de móvil sin desplazarse', () => {
  // Caja de referencia de un móvil de 390 × 799 dentro de la app: 332 px de
  // ancho útil y 479 de alto (el límite que aplica el CSS), con 4 px entre
  // cartas y 6 px de marco.
  const usableWidth = 332;
  const availableHeight = 479;
  const gap = 4;
  const padding = 6;
  const usableHeight = availableHeight - padding * 2;

  for (const level of MEMORY_LEVELS) {
    const columns = level.compactColumns;
    const cards = level.pairs * 2;
    const rows = Math.ceil(cards / columns);
    const card = Math.min(
      (usableWidth - (columns - 1) * gap) / columns,
      (usableHeight - (rows - 1) * gap) / rows,
    );
    const boardHeight = rows * card + (rows - 1) * gap + padding * 2;
    assert.ok(
      boardHeight <= availableHeight + 1,
      `el nivel ${level.id} ocuparía ${Math.round(boardHeight)} px de alto`,
    );
    assert.ok(card >= 45, `las cartas del nivel ${level.id} quedarían en ${Math.round(card)} px`);
  }

  // Los niveles grandes usan más columnas para no crecer hacia abajo.
  for (let index = 1; index < MEMORY_LEVELS.length; index += 1) {
    assert.ok(
      MEMORY_LEVELS[index].compactColumns >= MEMORY_LEVELS[index - 1].compactColumns,
      `el nivel ${index + 1} no puede tener menos columnas que el anterior`,
    );
  }
});
