/**
 * Lógica pura del minijuego Reparto Express.
 *
 * Vive fuera del motor de canvas para poder probarla con `node --test`:
 * velocidad, reparto de carriles, colisiones, puntuación y equilibrio de
 * niveles. El motor solo se encarga de dibujar y de mutar su estado.
 */

import {
  CUTLERY_BONUS_SECONDS,
  DELIVERY_SCORE,
  LEVEL_RULES,
  LEVEL_START_SPEED_FACTOR,
  MAX_SCORE_PER_GAME,
  SPEED_ACCEL_FACTOR,
  SPEED_ACCEL_INTERVAL_MS,
  TIME_BONUS_PER_SECOND,
} from "./gameConstants";
import type { LevelRule } from "./gameConstants";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OccupiedLane {
  lane: number;
  y: number;
}

/** Regla del nivel indicado (1–5). Fuera de rango devuelve la última. */
export function levelRule(level: number): LevelRule {
  const index = Math.max(0, Math.min(LEVEL_RULES.length - 1, Math.floor(level) - 1));
  return LEVEL_RULES[index];
}

/** Meta de bolsas del nivel. */
export function levelGoal(level: number): number {
  return levelRule(level).bags;
}

/** Cada cuánto aparece una bolsa en el nivel. */
export function deliveryIntervalFor(level: number): number {
  return levelRule(level).deliveryIntervalMs;
}

/**
 * Multiplicador de velocidad: +20 % al empezar cada nivel y +10 % cada 10 s
 * dentro del propio nivel.
 */
export function speedMultiplier(level: number, levelElapsedMs: number): number {
  const steps = Math.max(0, Math.floor(levelElapsedMs / SPEED_ACCEL_INTERVAL_MS));
  return (
    Math.pow(LEVEL_START_SPEED_FACTOR, Math.max(0, level - 1)) *
    Math.pow(SPEED_ACCEL_FACTOR, steps)
  );
}

/**
 * Elige el carril con más espacio libre delante. Si hay varios empatados,
 * reparte al azar entre ellos para que la partida no sea predecible.
 * `random` se inyecta en las pruebas para obtener resultados estables.
 */
export function pickSpawnLane(
  occupied: OccupiedLane[],
  laneCount: number,
  random: () => number = Math.random,
): number {
  const clearance = Array.from({ length: laneCount }, (_, lane) => ({
    lane,
    y: occupied.reduce(
      (nearest, item) => (item.lane === lane ? Math.min(nearest, item.y) : nearest),
      Number.POSITIVE_INFINITY,
    ),
  }));
  const mostSpace = Math.max(...clearance.map(({ y }) => y));
  const freeLanes = clearance.filter(({ y }) => y === mostSpace);
  const index = Math.min(
    freeLanes.length - 1,
    Math.max(0, Math.floor(random() * freeLanes.length)),
  );
  return freeLanes[index].lane;
}

/** Colisión AABB entre la caja de la moto y un objeto de la carretera. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Puntos de una bolsa: base + bonus por el tiempo que quedaba en el nivel. */
export function deliveryScore(remainingMs: number): number {
  const seconds = Math.floor(Math.max(0, remainingMs) / 1000);
  return DELIVERY_SCORE + seconds * TIME_BONUS_PER_SECOND;
}

/** Tope de puntuación aceptado por el cliente y por el servidor. */
export function isScoreWithinLimit(score: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= MAX_SCORE_PER_GAME;
}

/** Segundos extra que concede un cubierto (0 si el tipo no existe). */
export function cutleryBonusSeconds(type: string): number {
  return CUTLERY_BONUS_SECONDS[type] || 0;
}

/**
 * Comprueba que la meta de un nivel se puede cumplir dentro del tiempo base,
 * sin contar los segundos extra de los cubiertos. Es la red que evita metas
 * imposibles al ajustar `LEVEL_RULES`.
 */
export function levelIsReachable(level: number, durationSeconds: number): boolean {
  const rule = levelRule(level);
  return rule.bags * rule.deliveryIntervalMs <= durationSeconds * 1000;
}

/** Texto del aviso flotante de tiempo: "+3 s" o "−10 s". */
export function timeBonusLabel(seconds: number): string {
  if (seconds === 0) return "";
  return seconds > 0 ? `+${seconds} s` : `−${Math.abs(seconds)} s`;
}
