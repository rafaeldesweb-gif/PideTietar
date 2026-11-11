/**
 * Constantes del minijuego "Reparto Express" de PideTiétar.
 * Paleta y valores inspirados en la referencia arcade brillante:
 * azul profundo, cian neón, púrpura, naranja y amarillo dorado.
 */

export const GAME_ID = "reparto-express";

// Nombre visible del juego (pantalla de inicio y clasificación).
export const GAME_TITLE = "Reparto Express";

// Tiempo de partida por defecto de cada nivel (segundos).
export const DEFAULT_DURATION_SECONDS = 60;

// Paleta de la referencia (arcade brillante).
export const COLORS = {
  primary: "#ff7a00",
  primaryDark: "#d95a00",
  accent: "#ffd400",
  accentLight: "#ffe14d",
  skyDeep: "#0b2a6b",
  skyMid: "#1e6bff",
  skyLight: "#4fc3f7",
  cloud: "#ffffff",
  cloudShadow: "#cfe8ff",
  hillFar: "#7bed9f",
  hillMid: "#58d68d",
  hillNear: "#2ecc40",
  grass: "#3ecf4f",
  roadTop: "#1a2a5a",
  roadBottom: "#070b18",
  roadGloss: "rgba(120,180,255,0.10)",
  laneLine: "#ffffff",
  railMetal: "#b8c8dc",
  railCyan: "#00e5ff",
  railOrange: "#ff8a00",
  neonPurple: "#b026ff",
  neonCyan: "#00e5ff",
  carOrange: "#ff8a00",
  carOrangeLight: "#ffb300",
  carOrangeDark: "#c25a00",
  carWindow: "#101828",
  carCyan: "#22e0ff",
  text: "#ffffff",
  textMuted: "#bfe9ff",
  success: "#10b981",
  danger: "#ff3b30",
  warning: "#ffb300",
};

// Física del salto y movimiento.
export const GRAVITY = 0.6;
export const JUMP_FORCE = -12;
export const GROUND_Y_FRACTION = 0.79;
export const LANE_EASING = 0.18;

// Cuatro carriles visibles en la carretera.
export const LANES = [0, 1, 2, 3];
export const LANE_COUNT = LANES.length;

// Velocidad base de caída.
export const BASE_FALL_SPEED = 3.4;

// Aceleración de la carretera: cada 10 s sube un 10 %.
export const SPEED_ACCEL_INTERVAL_MS = 10000;
export const SPEED_ACCEL_FACTOR = 1.1;
export const LEVEL_START_SPEED_FACTOR = 1.2;

export interface LevelRule {
  level: number;
  coins: number;
  bags: number;
  obstaclesPerTenSeconds: number;
  /** Cada cuánto sale una bolsa nueva (ms). Se acorta en los niveles altos. */
  deliveryIntervalMs: number;
}

// Las cantidades de obstáculos se redondean al entero más cercano.
// `deliveryIntervalMs` garantiza que la meta de bolsas quepa en el minuto de
// cada nivel sin depender de recoger cubiertos: 10·1,5 s, 15·1,5 s, 20·1,4 s,
// 25·1,3 s y 50·1,0 s quedan por debajo de los 60 s base.
export const LEVEL_RULES: LevelRule[] = [
  { level: 1, coins: 10, bags: 10, obstaclesPerTenSeconds: 15, deliveryIntervalMs: 1500 },
  { level: 2, coins: 15, bags: 15, obstaclesPerTenSeconds: 18, deliveryIntervalMs: 1500 },
  { level: 3, coins: 20, bags: 20, obstaclesPerTenSeconds: 22, deliveryIntervalMs: 1400 },
  { level: 4, coins: 25, bags: 25, obstaclesPerTenSeconds: 28, deliveryIntervalMs: 1300 },
  { level: 5, coins: 30, bags: 50, obstaclesPerTenSeconds: 35, deliveryIntervalMs: 1000 },
];

// Puntuación.
export const DELIVERY_SCORE = 100;
export const TIME_BONUS_PER_SECOND = 2;
export const MAX_SCORE_PER_GAME = 100000;

// Tiempo extra por cubierto.
export const CUTLERY_BONUS_SECONDS: Record<string, number> = {
  cucharilla: 3,
  cuchillo: 3,
  tenedor: 3,
};

// Penalización de tiempo al chocar con un obstáculo.
export const OBSTACLE_TIME_PENALTY_SECONDS = {
  vehicle: 10,
  obstacle: 5,
};

// Puntuación por cubierto.
export const CUTLERY_SCORE: Record<string, number> = {
  cucharilla: 10,
  cuchillo: 15,
  tenedor: 20,
};

// Tamaños base.
export const BASE_SIZES = {
  moto: { w: 82, h: 116 },
  cutlery: { w: 52, h: 52 },
  cone: { w: 48, h: 52 },
  vehicle: { w: 70, h: 102 },
  delivery: { w: 68, h: 76 },
};

// Cada tanda contiene todos los obstáculos antes de volver a mezclarlos.
export const OBSTACLE_KINDS = [
  "cone",
  "vehicle",
  "moto_civil",
  "reductor",
  "flecha_izquierda",
  "flecha_derecha",
  "paso_cerrado",
  "aviso_obras",
];

// Intervalos de aparición en milisegundos.
export const SPAWN_INTERVALS_MS = {
  cutlery: 1300,
};

// Claves de sesión (modo invitado). El récord no se guarda en localStorage:
// AGENTS.md reserva ese almacén para preferencias, no para datos personales.
export const LOCAL_RECORD_KEY = "pidetietar_reparto_express_record";
export const LOCAL_LEVEL_KEY = "pidetietar_reparto_express_level";
export const LEGACY_RECORD_KEY = "pidetietar_reparto_express_record";
export const LEGACY_LEVEL_KEY = "pidetietar_reparto_express_level";

// Máximo de partículas activas.
export const MAX_PARTICLES = 40;

// Máximo de textos flotantes simultáneos (+3 s, −10 s, nivel completado…).
export const MAX_FLOATERS = 8;
