/**
 * Progreso de PideTiétar Play.
 *
 * Los niveles completados se guardan como enteros ordenados. El servidor es la
 * fuente definitiva (`/api/game/progress`), pero `sessionStorage` conserva el
 * avance mientras la red no responde o el jugador no tiene sesión.
 */

/** Limpia duplicados, valores no numéricos y niveles fuera del catálogo. */
export const normalizeCompletedLevels = (values: unknown, maxLevel: number): number[] => {
  if (!Array.isArray(values)) return [];
  const safe = values
    .map((value) => Number(value))
    .filter(
      (value) =>
        Number.isInteger(value) && value >= 1 && value <= Math.max(1, maxLevel),
    );
  return Array.from(new Set(safe)).sort((a, b) => a - b);
};

/** Lee la lista guardada en `sessionStorage` («1,3,4»). */
export const parseCompletedLevels = (raw: string | null, maxLevel: number): number[] => {
  if (!raw) return [];
  return normalizeCompletedLevels(raw.split(','), maxLevel);
};

/** Une el avance local y el del servidor: nunca se pierde un nivel. */
export const mergeCompletedLevels = (
  local: unknown,
  remote: unknown,
  maxLevel: number,
): number[] => {
  const parts = [
    ...(Array.isArray(local) ? local : []),
    ...(Array.isArray(remote) ? remote : []),
  ];
  return normalizeCompletedLevels(parts, maxLevel);
};

/** Añade un nivel completado manteniendo la lista ordenada y sin duplicados. */
export const withCompletedLevel = (
  current: number[],
  level: number,
  maxLevel: number,
): number[] => normalizeCompletedLevels([...current, level], maxLevel);
