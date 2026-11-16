/**
 * Catálogo de niveles de Memory.
 *
 * Cada nivel usa una colección de dibujos distinta (frutas, animales, mar,
 * espacio…) y sube el número de parejas: del nivel 1 (8 parejas = tablero 4×4)
 * al 10 (24 parejas = 48 cartas). Los símbolos son emoji para que las cartas
 * reveladas se vean como los dibujos de colores del icono del juego.
 */

export interface MemoryLevel {
  /** Identificador 1–10; también es la clave con la que se guarda el progreso. */
  id: number;
  /** Nombre del tema que se muestra en la cabecera. */
  name: string;
  /** Parejas del nivel (cartas = parejas × 2). */
  pairs: number;
  /** Columnas del tablero en escritorio. */
  columns: number;
  /** Columnas del tablero en pantallas estrechas; se ajustan para que el tablero quepa en una pantalla. */
  compactColumns: number;
  /** Dibujos disponibles; debe haber al menos `pairs` distintos. */
  symbols: string[];
}

/** Diez niveles: de 8 parejas (tablero 4×4) a 24 (48 cartas). */
const PAIRS_PER_LEVEL = [8, 9, 10, 12, 14, 16, 18, 20, 22, 24];

const FRUTAS = [
  '🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝',
  '🍉', '🍊', '🍋', '🍐', '🥥', '🍏', '🍅', '🥕',
  '🌽', '🍄', '🍆', '🥦', '🌶️', '🥒', '🥔', '🍠',
];

const ANIMALES = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🦆', '🦉', '🐺', '🐗', '🐴', '🐢',
];

const MAR = [
  '🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦀', '🦞',
  '🦐', '🐚', '🐬', '🐳', '🐋', '🐢', '🐊', '🦆',
  '🦩', '🦜', '🐧', '⚓', '🌊', '⛵', '🚤', '🏝️',
];

const ESPACIO = [
  '🚀', '🛸', '🌍', '🌙', '⭐', '🌟', '✨', '💫',
  '☄️', '🌞', '🌛', '🌜', '🔭', '👽', '🛰️', '🌠',
  '🌌', '☀️', '🌕', '🌑', '🌗', '🌓', '🌔', '🌘',
];

const CLIMA = [
  '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
  '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️',
  '🌫️', '🌈', '🔥', '💧', '🌊', '⚡', '🌡️', '🌙',
];

const DEPORTES = [
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
  '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏',
  '🥊', '🥋', '🎽', '🛹', '⛳', '🎿', '🏂', '🏆',
];

const VEHICULOS = [
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
  '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵',
  '🏍️', '✈️', '🚀', '🚁', '⛵', '🚤', '🚂', '🚆',
];

const MUSICA = [
  '🎵', '🎶', '🎼', '🎤', '🎧', '🎷', '🎸', '🎹',
  '🎺', '🎻', '🥁', '📯', '🔔', '🎙️', '📻', '🎚️',
  '🎛️', '🔊', '🔉', '🔈', '📢', '📣', '🎬', '🎭',
];

const FANTASIA = [
  '🦄', '🐉', '🧚', '🧜', '🧞', '🧟', '🧛', '🧙',
  '🔮', '⭐', '🌙', '☄️', '🏰', '🗡️', '🛡️', '👑',
  '💎', '👻', '👽', '🎩', '🃏', '🎭', '🎪', '🧸',
];

const GOLOSINAS = [
  '🍩', '🍪', '🎂', '🧁', '🍰', '🍫', '🍬', '🍭',
  '🍮', '🍯', '🥧', '🍦', '🍨', '🍧', '🥞', '🍿',
  '🍡', '🍢', '🧃', '🍓', '🍒', '🍇', '🍉', '🍍',
];

const THEMES = [
  { name: 'Frutas del huerto', symbols: FRUTAS, columns: 4, compactColumns: 4 },
  { name: 'Animales del valle', symbols: ANIMALES, columns: 6, compactColumns: 4 },
  { name: 'Vida marina', symbols: MAR, columns: 5, compactColumns: 4 },
  { name: 'El espacio', symbols: ESPACIO, columns: 6, compactColumns: 4 },
  { name: 'El tiempo', symbols: CLIMA, columns: 7, compactColumns: 4 },
  { name: 'Deportes', symbols: DEPORTES, columns: 8, compactColumns: 5 },
  { name: 'Ruedas y motores', symbols: VEHICULOS, columns: 6, compactColumns: 5 },
  { name: 'Música', symbols: MUSICA, columns: 8, compactColumns: 5 },
  { name: 'Fantasía', symbols: FANTASIA, columns: 9, compactColumns: 6 },
  { name: 'Golosinas', symbols: GOLOSINAS, columns: 8, compactColumns: 6 },
];

export const MEMORY_LEVELS: MemoryLevel[] = THEMES.map((theme, index) => ({
  id: index + 1,
  name: theme.name,
  pairs: PAIRS_PER_LEVEL[index],
  columns: theme.columns,
  compactColumns: theme.compactColumns,
  symbols: theme.symbols,
}));

/** Cartas de una partida: el símbolo se repite dos veces. */
export interface MemoryCard {
  id: number;
  symbol: string;
}

/** Baraja una copia de la lista (Fisher-Yates). */
const shuffle = <T,>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

/**
 * Reparte el tablero de un nivel: elige `pairs` dibujos distintos del tema,
 * los duplica y los desordena.
 */
export const createDeck = (level: MemoryLevel, random: () => number = Math.random): MemoryCard[] => {
  const picked = shuffle(level.symbols, random).slice(0, level.pairs);
  const deck = [...picked, ...picked];
  return shuffle(deck, random).map((symbol, index) => ({ id: index, symbol }));
};

/** Puntuación de la partida: premia los niveles grandes y castiga el tiempo. */
export const memoryScore = (pairs: number, seconds: number, moves: number): number =>
  Math.max(10, Math.round(pairs * 70 + 400 - seconds * 5 - moves * 4));

/**
 * El servidor solo acepta `level_reached` entre 1 y 5, así que los diez
 * niveles del juego se agrupan de dos en dos.
 */
export const serverLevelFor = (levelId: number): number =>
  Math.max(1, Math.min(5, Math.ceil(levelId / 2)));

/** Un nivel se abre al completar el anterior; el 1 siempre está disponible. */
export const isLevelUnlocked = (index: number, completed: number[]): boolean =>
  index === 0 || completed.includes(MEMORY_LEVELS[index - 1].id);

/** Primer nivel pendiente: donde se reanuda la partida al volver al juego. */
export const firstPendingIndex = (completed: number[]): number => {
  const index = MEMORY_LEVELS.findIndex((level) => !completed.includes(level.id));
  return index === -1 ? 0 : index;
};

/** Columnas del tablero según el nivel y el ancho de la pantalla. */
export const boardColumns = (level: MemoryLevel, compact: boolean): number =>
  compact ? level.compactColumns : level.columns;
