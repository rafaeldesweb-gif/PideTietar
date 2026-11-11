/**
 * Motor del minijuego "Reparto Express".
 * Un único bucle requestAnimationFrame, canvas responsive y una escena
 * arcade brillante inspirada en la referencia: cielo azul profundo, sol
 * radiante, colinas verdes, carretera en perspectiva con quitamiedos
 * metálicos y neón cian/naranja, y moto de reparto vista desde atrás.
 *
 * Lógica: recoger la mayor cantidad de pedidos express antes de que se
 * agote el tiempo. La carretera acelera un 10 % cada 10 s. Hay conos y
 * vehículos como obstáculos, todos evitables mediante el salto hacia delante.
 */

import {
  DEFAULT_DURATION_SECONDS,
  COLORS,
  GRAVITY,
  JUMP_FORCE,
  GROUND_Y_FRACTION,
  LANE_EASING,
  LANE_COUNT,
  BASE_FALL_SPEED,
  LEVEL_RULES,
  CUTLERY_SCORE,
  OBSTACLE_KINDS,
  OBSTACLE_TIME_PENALTY_SECONDS,
  SPAWN_INTERVALS_MS,
  MAX_FLOATERS,
  MAX_PARTICLES,
} from "./gameConstants";
import {
  cutleryBonusSeconds,
  deliveryIntervalFor,
  deliveryScore,
  levelGoal,
  levelRule,
  pickSpawnLane,
  rectsOverlap,
  speedMultiplier as computeSpeedMultiplier,
  timeBonusLabel,
} from "./gameLogic";
import type { Rect } from "./gameLogic";

let canvas: HTMLCanvasElement | null = null;
let ctx!: CanvasRenderingContext2D;
let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.max(1, window.devicePixelRatio || 1);

// Estado del juego
let running = false;
let paused = false;
let gameOver = false;
let lastFrameTime = 0;
let elapsedMs = 0;
let levelElapsedMs = 0;
let baseDurationMs = DEFAULT_DURATION_SECONDS * 1000;
let durationMs = DEFAULT_DURATION_SECONDS * 1000;
let victory = false;
let rafId: number | null = null;

// Coche del jugador
let motoLane = 1;
let targetLaneX = 0;
let motoX = 0;
let groundY = 0;

// Física del salto
let jumpVel = 0;
let isJumping = false;
let jumpOffsetY = 0;
let jumpTargetId: string | null = null;

// Objetos en pantalla
interface GameObject {
  id: string;
  type: "delivery" | "obstacle" | "cucharilla" | "cuchillo" | "tenedor";
  kind: string | null;
  vehicleModel?: string;
  tint?: string | null;
  lane: number;
  x: number;
  y: number;
  w: number;
  h: number;
  aspect: number;
  baseSpeed: number;
  collected: boolean;
}

let objects: GameObject[] = [];
let obstaclePool: string[] = [];

// Puntuación y progreso
let score = 0;
let deliveries = 0;
let levelDeliveries = 0;
let level = 1;
let timeBonusSeconds = 0;
let coinsSent = 0;
let obstaclesSent = 0;
let bagsSent = 0;

// Temporizadores de aparición (ms acumulados)
let cutleryTimer = 0;
let obstacleTimer = 0;
let deliveryTimer = 0;

// Efectos visuales
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

let particles: Particle[] = [];
let floaters: Floater[] = [];
let shakeX = 0;
let shakeY = 0;
let roadOffset = 0;

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onTimeChange?: (remainingMs: number) => void;
  onGameOver?: (summary: {
    score: number;
    deliveries: number;
    level: number;
    timeBonusSeconds: number;
    victory: boolean;
  }) => void;
  onLevelChange?: (level: number) => void;
  onDelivery?: (deliveries: number, levelDeliveries: number, targetBags: number) => void;
}

// Callbacks
let onScoreChange: (score: number) => void = () => {};
let onTimeChange: (remainingMs: number) => void = () => {};
let onGameOver: (summary: {
  score: number;
  deliveries: number;
  level: number;
  timeBonusSeconds: number;
  victory: boolean;
}) => void = () => {};
let onLevelChange: (level: number) => void = () => {};
let onDelivery: (deliveries: number, levelDeliveries: number, targetBags: number) => void = () => {};

// Audio breve generado con Web Audio: no añade archivos ni cambia la escena,
// y solo se activa después de la pulsación que inicia/interactúa con el juego.
let audioContext: AudioContext | null = null;

function ensureAudioContext() {
  if (audioContext) return audioContext;
  if (typeof window === "undefined") return null;
  const AudioContextCtor =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  try {
    audioContext = new AudioContextCtor();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(
  frequency: number,
  duration = 0.1,
  type: OscillatorType = "sine",
  volume = 0.035,
  endFrequency: number | null = null,
) {
  const audio = ensureAudioContext();
  if (!audio) return;
  try {
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  } catch {
    // El sonido es opcional: un navegador sin Web Audio no debe interrumpir
    // la partida ni la animación.
  }
}

type Note = [number, number, number, OscillatorType, number];

function playSequence(notes: Note[]) {
  notes.forEach(([frequency, delay, duration, type, volume]) => {
    setTimeout(() => playTone(frequency, duration, type, volume), delay);
  });
}

// Altura del horizonte como fracción del alto.
// El asfalto del fondo comienza en torno al 20 % de la altura de la imagen.
const HORIZON_FRACTION = 0.205;
const ROAD_FULL_WIDTH_FRACTION = 0.42;
const GAME_ASSET_BASE = "/assets/games/reparto-express/";
const gameImages: Record<string, HTMLImageElement> = {};
const imageFiles: Record<string, string> = {
  background: "carretera-neon-v3.webp",
  moto: "moto-neon-v2.webp",
  cone: "cono-neon-v2.webp",
  delivery: "bolsa-neon-v2.webp",
  cutlery: "moneda-neon-v2.webp",
  vehicle: "coche-neon-v2.webp",
  van: "furgoneta-neon-v2.webp",
  moto_civil: "moto-civil-neon.webp",
  reductor: "reductor-neon.webp",
  flecha_izquierda: "flecha-cambio-neon.webp",
  flecha_derecha: "flecha-derecha-neon.webp",
  paso_cerrado: "paso-cerrado-neon.webp",
  aviso_obras: "aviso-obras-neon.webp",
};

// El fondo y los sprites más frecuentes se cargan al abrir; el resto se pide
// justo después para no competir con el primer fotograma en móviles lentos.
const PRIORITY_IMAGES = ["background", "moto", "delivery", "cone"];

function loadImage(key: string) {
  if (gameImages[key]) return;
  const image = new Image();
  image.decoding = "async";
  image.src = GAME_ASSET_BASE + imageFiles[key];
  gameImages[key] = image;
}

function preloadImages() {
  PRIORITY_IMAGES.forEach(loadImage);
  const loadRest = () => {
    Object.keys(imageFiles).forEach(loadImage);
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(loadRest);
  } else {
    window.setTimeout(loadRest, 120);
  }
}

function imageReady(key: string): HTMLImageElement | null {
  const image = gameImages[key];
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

// ---------------------------------------------------------------------------
// Utilidades de escena
// ---------------------------------------------------------------------------

function carSize() {
  const h = Math.min(Math.max(height * 0.27, 170), 450) * 0.75;
  return {
    w: h * 0.5,
    h,
  };
}

function horizonY() {
  return height * HORIZON_FRACTION;
}

// Semiancho de la carretera en una coordenada Y (perspectiva).
function roadHalfAt(y: number) {
  const fraction = Math.max(HORIZON_FRACTION, Math.min(1, y / height));
  const approach = Math.min(1, (fraction - HORIZON_FRACTION) /
    (ROAD_FULL_WIDTH_FRACTION - HORIZON_FRACTION));
  // Sigue los bordes naranjas hasta que el asfalto llena la pantalla.
  // Después reserva cuatro carriles enteros dentro de la zona visible.
  const visibleTail = Math.max(0, (fraction - ROAD_FULL_WIDTH_FRACTION) /
    (1 - ROAD_FULL_WIDTH_FRACTION));
  return width * (0.16 + 0.34 * Math.pow(approach, 0.85) + 0.02 * visibleTail);
}

function laneWidthAt(y: number) {
  return (roadHalfAt(y) * 2) / LANE_COUNT;
}

function laneCenterAt(lane: number, y: number) {
  return width / 2 + (lane - (LANE_COUNT - 1) / 2) * laneWidthAt(y);
}

// Cada objeto conserva la anchura de su carril mientras crece al acercarse.
function objectSizeAt(obj: { aspect: number }, y: number) {
  const w = laneWidthAt(y) * 0.86;
  return { w, h: w * obj.aspect };
}

function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Puntos a lo largo del borde de la carretera (side = -1 izquierda, 1 derecha).
function edgePoints(side: number) {
  const hy = horizonY();
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = hy + Math.pow(t, 1.6) * (height - hy);
    const half = roadHalfAt(y);
    pts.push({ x: width / 2 + side * half, y, t });
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Inicialización y ciclo de vida
// ---------------------------------------------------------------------------

export function init(
  canvasEl: HTMLCanvasElement,
  opts: { durationSeconds?: number } = {},
) {
  canvas = canvasEl;
  ctx = canvasEl.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  resizeCanvas();
  baseDurationMs = (opts.durationSeconds || DEFAULT_DURATION_SECONDS) * 1000;
  durationMs = baseDurationMs;
  preloadImages();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  if (canvas) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  groundY = height * (height < 650 ? 0.76 : GROUND_Y_FRACTION);
  resetMotoPosition();
}

export function setCallbacks(cb: GameCallbacks) {
  onScoreChange = cb.onScoreChange || (() => {});
  onTimeChange = cb.onTimeChange || (() => {});
  onGameOver = cb.onGameOver || (() => {});
  onLevelChange = cb.onLevelChange || (() => {});
  onDelivery = cb.onDelivery || (() => {});
}

function resetMotoPosition() {
  motoLane = 1;
  targetLaneX = laneCenterAt(1, groundY);
  motoX = targetLaneX;
  jumpVel = 0;
  isJumping = false;
  jumpOffsetY = 0;
  jumpTargetId = null;
}

export function start() {
  if (rafId) cancelAnimationFrame(rafId);
  running = true;
  paused = false;
  gameOver = false;
  victory = false;
  elapsedMs = 0;
  levelElapsedMs = 0;
  durationMs = baseDurationMs;
  lastFrameTime = performance.now();
  score = 0;
  deliveries = 0;
  levelDeliveries = 0;
  level = 1;
  timeBonusSeconds = 0;
  coinsSent = 0;
  obstaclesSent = 0;
  bagsSent = 0;
  objects = [];
  obstaclePool = [];
  particles = [];
  floaters = [];
  shakeX = 0;
  shakeY = 0;
  roadOffset = 0;
  cutleryTimer = 0;
  obstacleTimer = 0;
  deliveryTimer = 0;
  resetMotoPosition();
  playSequence([
    [392, 0, 0.08, "triangle", 0.035],
    [523, 90, 0.1, "triangle", 0.04],
    [659, 190, 0.14, "triangle", 0.045],
  ]);
  onScoreChange(score);
  onLevelChange(level);
  onDelivery(deliveries, levelDeliveries, LEVEL_RULES[0].bags);
  onTimeChange(durationMs);
  rafId = requestAnimationFrame(loop);
}

export function pause() {
  if (!running || gameOver) return;
  paused = true;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function resume() {
  if (!running || !paused) return;
  paused = false;
  lastFrameTime = performance.now();
  if (!rafId) rafId = requestAnimationFrame(loop);
}

export function togglePause() {
  if (paused) resume();
  else pause();
}

export function stop() {
  running = false;
  paused = false;
  gameOver = true;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("orientationchange", resizeCanvas);
}

export function moveToLane(laneIndex: number) {
  if (!running || paused || gameOver) return;
  const idx = Math.max(0, Math.min(LANE_COUNT - 1, laneIndex));
  if (idx === motoLane) return;
  motoLane = idx;
  targetLaneX = laneCenterAt(idx, groundY);
}

export function moveLeft() {
  moveToLane(motoLane - 1);
}

export function moveRight() {
  moveToLane(motoLane + 1);
}

export function toggleJump() {
  if (!running || paused || gameOver) return;
  if (!isJumping) {
    isJumping = true;
    jumpVel = JUMP_FORCE;
    const wheelY = groundY - carSize().h * 0.14;
    const candidate = objects
      .filter((obj) =>
        obj.type === "obstacle" &&
        obj.lane === motoLane &&
        obj.y + obj.h >= wheelY - height * 0.32 &&
        obj.y <= groundY
      )
      .sort((a, b) => b.y - a.y)[0];
    jumpTargetId = candidate?.id || null;
    playTone(430, 0.14, "triangle", 0.045, 720);
  }
}

// ---------------------------------------------------------------------------
// Efectos
// ---------------------------------------------------------------------------

function addParticles(x: number, y: number, color: string, count = 6) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      life: 1.0,
      color,
      size: Math.random() * 4 + 2,
    });
  }
  if (particles.length > MAX_PARTICLES) {
    particles.splice(0, particles.length - MAX_PARTICLES);
  }
}

function addShake(intensity = 6, durationMs = 250) {
  shakeX = intensity;
  shakeY = intensity;
  setTimeout(() => {
    shakeX = 0;
    shakeY = 0;
  }, durationMs);
}

/**
 * Texto flotante sobre la carretera ("+3 s", "−10 s", "NIVEL 2"…). Se dibuja
 * en el canvas para no añadir estado de React en cada impacto.
 */
function addFloater(x: number, y: number, text: string, color: string) {
  if (!text) return;
  floaters.push({ x, y, text, color, life: 1 });
  if (floaters.length > MAX_FLOATERS) {
    floaters.splice(0, floaters.length - MAX_FLOATERS);
  }
}

function currentLevelRule() {
  return levelRule(level);
}

// La velocidad inicial sube un 20 % por nivel; durante cada nivel, un 10 % cada
// 10 s. La fórmula vive en gameLogic para poder probarla sin canvas.
function currentSpeed() {
  return computeSpeedMultiplier(level, levelElapsedMs);
}

function advanceLevel() {
  level += 1;
  levelDeliveries = 0;
  elapsedMs = 0;
  levelElapsedMs = 0;
  durationMs = baseDurationMs;
  coinsSent = 0;
  obstaclesSent = 0;
  bagsSent = 0;
  cutleryTimer = 0;
  obstacleTimer = 0;
  deliveryTimer = 0;
  objects = [];
  obstaclePool = [];
  particles = [];
  floaters = [];
  isJumping = false;
  jumpVel = 0;
  jumpOffsetY = 0;
  jumpTargetId = null;
  addFloater(width / 2, height * 0.32, `NIVEL ${level}`, COLORS.accentLight);
  playSequence([
    [660, 0, 0.08, "triangle", 0.035],
    [880, 100, 0.14, "triangle", 0.045],
  ]);
  onLevelChange(level);
  onDelivery(deliveries, levelDeliveries, currentLevelRule().bags);
  onTimeChange(durationMs);
}

// ---------------------------------------------------------------------------
// Lógica del juego
// ---------------------------------------------------------------------------

function spawnObject(type: GameObject["type"], kind: string | null = null) {
  // El carril con más espacio libre evita que dos elementos cercanos se tapen.
  const lane = pickSpawnLane(
    objects.filter((obj) => !obj.collected).map(({ lane: occupiedLane, y }) => ({
      lane: occupiedLane,
      y,
    })),
    LANE_COUNT,
  );
  const vehicleModel = kind === "vehicle" && Math.random() < 0.5 ? "van" : "car";
  const obstacleAspects = {
    cone: 1.08,
    moto_civil: 1.5,
    reductor: 0.38,
    flecha_izquierda: 0.95,
    flecha_derecha: 0.95,
    paso_cerrado: 0.95,
    aviso_obras: 1.1,
  };
  const aspect = type === "delivery" ? 1.1
    : kind === "vehicle" ? vehicleModel === "van" ? 1.18 : 0.82
      : (kind ? obstacleAspects[kind as keyof typeof obstacleAspects] : 0) || 1;
  const y = horizonY();
  const vehicleTints = ["#1e88e5", "#8e24aa", "#e53935", "#00897b"];
  const obj: GameObject = {
    id: Math.random().toString(36).slice(2),
    type,
    kind,
    vehicleModel,
    tint: kind === "vehicle" ? vehicleTints[Math.floor(Math.random() * vehicleTints.length)] : null,
    lane,
    x: 0,
    y,
    w: 0,
    h: 0,
    aspect,
    baseSpeed: BASE_FALL_SPEED * (type === "obstacle" ? 1.5 : 1),
    collected: false,
  };
  const size = objectSizeAt(obj, y);
  obj.w = size.w;
  obj.h = size.h;
  obj.x = laneCenterAt(lane, y) - obj.w / 2;
  objects.push(obj);
}

function spawnCutlery() {
  const types: GameObject["type"][] = ["cucharilla", "cuchillo", "tenedor"];
  spawnObject(types[Math.floor(Math.random() * types.length)]);
}

function spawnObstacle() {
  if (obstaclePool.length === 0) {
    obstaclePool = [...OBSTACLE_KINDS];
    for (let i = obstaclePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [obstaclePool[i], obstaclePool[j]] = [obstaclePool[j], obstaclePool[i]];
    }
  }
  spawnObject("obstacle", obstaclePool.pop());
}

function update(dt: number) {
  if (paused || gameOver) return;

  elapsedMs += dt;
  levelElapsedMs += dt;
  if (elapsedMs >= durationMs) {
    onTimeChange(0);
    finishGame(false);
    return;
  }

  // Movimiento suave de la moto entre carriles.
  const diff = targetLaneX - motoX;
  motoX += diff * LANE_EASING;

  const car = carSize();
  // El salto avanza hacia el horizonte. Al descender, la moto espera a que el
  // obstáculo elegido pase completamente detrás de la rueda antes de tocar
  // el asfalto. La sombra sigue anclada al suelo durante todo el salto.
  if (isJumping) {
    const nextOffset = jumpOffsetY + jumpVel * (dt / 16.67);
    jumpVel += GRAVITY * (dt / 16.67);
    const target = objects.find((obj) => obj.id === jumpTargetId && !obj.collected);
    const targetStillBelow = target && target.lane === motoLane && target.y < groundY + 12;
    if (jumpVel >= 0 && targetStillBelow && nextOffset >= -car.h * 0.22) {
      jumpOffsetY = -car.h * 0.22;
      jumpVel = 0;
    } else if (nextOffset >= 0) {
      jumpOffsetY = 0;
      isJumping = false;
      jumpVel = 0;
      jumpTargetId = null;
    } else {
      jumpOffsetY = nextOffset;
    }
  }

  const motoIsAirborne = isJumping || jumpOffsetY < -1;
  const mult = currentSpeed();

  // Animar líneas de la carretera
  roadOffset = (roadOffset + BASE_FALL_SPEED * mult * (dt / 16.67) * 0.65) % 100;

  // Monedas limitadas por nivel; las bolsas salen según el ritmo de cada nivel
  // (LEVEL_RULES.deliveryIntervalMs), más rápido en los últimos.
  const rules = currentLevelRule();
  const deliveryInterval = deliveryIntervalFor(level);
  cutleryTimer += dt;
  obstacleTimer += dt;
  deliveryTimer += dt;
  while (cutleryTimer >= SPAWN_INTERVALS_MS.cutlery && coinsSent < rules.coins) {
    cutleryTimer -= SPAWN_INTERVALS_MS.cutlery;
    spawnCutlery();
    coinsSent += 1;
  }
  const obstacleInterval = 10000 / rules.obstaclesPerTenSeconds;
  while (obstacleTimer >= obstacleInterval) {
    obstacleTimer -= obstacleInterval;
    spawnObstacle();
    obstaclesSent += 1;
  }
  while (deliveryTimer >= deliveryInterval) {
    deliveryTimer -= deliveryInterval;
    spawnObject("delivery");
    bagsSent += 1;
  }

  // Actualizar objetos
  for (const obj of objects) {
    if (obj.collected) continue;
    obj.y += obj.baseSpeed * mult * (dt / 16.67);
    const size = objectSizeAt(obj, obj.y);
    obj.w = size.w;
    obj.h = size.h;
    obj.x = laneCenterAt(obj.lane, obj.y) - obj.w / 2;

    // El contacto con el asfalto se mide en la rueda, no en toda la altura
    // del casco y la caja. Así el cono visible delante no golpea al piloto.
    const motoRect: Rect = {
      x: motoX - car.w * 0.31,
      y: groundY - car.h * 0.18,
      w: car.w * 0.62,
      h: car.h * 0.18,
    };
    const objRect: Rect = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };

    const hit = rectsOverlap(motoRect, objRect);

    // Mientras la moto está adelantada en el aire, el objeto sigue su
    // recorrido hacia abajo y pasa por debajo de ella. Esto se aplica a
    // obstáculos, pedidos y cubiertos para que el salto sea coherente con
    // la perspectiva y no haya recogidas/penalizaciones a mitad del salto.
    if (hit && !motoIsAirborne) {
      if (obj.type === "delivery") {
        // La meta de bolsas se comprueba en este mismo fotograma.
        const points = deliveryScore(durationMs - elapsedMs);
        deliveries += 1;
        levelDeliveries += 1;
        score += points;
        obj.collected = true;
        addParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, COLORS.success, 12);
        addFloater(obj.x + obj.w / 2, obj.y, `+${points}`, COLORS.accentLight);
        addShake(4, 180);
        playTone(760, 0.12, "sine", 0.045, 1040);
        onDelivery(deliveries, levelDeliveries, rules.bags);
        onScoreChange(score);
        if (levelDeliveries >= levelGoal(level)) {
          if (level === LEVEL_RULES.length) finishGame(true);
          else advanceLevel();
          return;
        }
      } else if (obj.type === "obstacle") {
        // En el suelo, cualquier obstáculo impacta; en el aire ya se ha
        // dejado pasar por debajo y no entra en esta rama.
        const isVehicle = obj.kind === "vehicle" || obj.kind === "moto_civil";
        const penaltySeconds = isVehicle
          ? OBSTACLE_TIME_PENALTY_SECONDS.vehicle
          : OBSTACLE_TIME_PENALTY_SECONDS.obstacle;
        score = Math.max(0, score - 20);
        elapsedMs += penaltySeconds * 1000;
        obj.collected = true;
        addParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, COLORS.danger, 8);
        addFloater(obj.x + obj.w / 2, obj.y, timeBonusLabel(-penaltySeconds), COLORS.danger);
        addShake(isVehicle ? 12 : 8, 300);
        playTone(110, 0.22, "sawtooth", 0.04, 60);
        onScoreChange(score);
      } else {
        const bonusSec = cutleryBonusSeconds(obj.type);
        const bonusPts = CUTLERY_SCORE[obj.type] || 0;
        durationMs += bonusSec * 1000;
        score += bonusPts;
        timeBonusSeconds += bonusSec;
        const color =
          obj.type === "cucharilla"
            ? COLORS.accent
            : obj.type === "cuchillo"
              ? COLORS.warning
              : COLORS.success;
        addParticles(obj.x + obj.w / 2, obj.y + obj.h / 2, color, 8);
        addFloater(
          obj.x + obj.w / 2,
          obj.y,
          `${timeBonusLabel(bonusSec)} · +${bonusPts}`,
          COLORS.accent,
        );
        obj.collected = true;
        playTone(520, 0.1, "sine", 0.03, 800);
        onScoreChange(score);
      }
    }

    if (obj.y > height) obj.collected = true;
  }

  objects = objects.filter((o) => !o.collected);

  // Partículas
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    p.vy += 0.15;
  }
  particles = particles.filter((p) => p.life > 0);

  // Textos flotantes: suben lentamente y se desvanecen.
  for (const floater of floaters) {
    floater.y -= 0.55 * (dt / 16.67);
    floater.life -= 0.018 * (dt / 16.67);
  }
  floaters = floaters.filter((floater) => floater.life > 0);

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  onTimeChange(remainingMs);
  if (remainingMs <= 0) finishGame(false);
}

function finishGame(won: boolean) {
  if (gameOver) return;
  running = false;
  gameOver = true;
  victory = won;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  playSequence(won ? [
    [523, 0, 0.12, "triangle", 0.04],
    [659, 130, 0.12, "triangle", 0.04],
    [784, 260, 0.12, "triangle", 0.04],
    [1047, 400, 0.3, "triangle", 0.05],
  ] : [
    [520, 0, 0.1, "triangle", 0.03],
    [392, 120, 0.12, "triangle", 0.03],
    [262, 260, 0.18, "triangle", 0.035],
  ]);
  onGameOver({
    score,
    deliveries,
    level,
    timeBonusSeconds,
    victory: won,
  });
}

// ---------------------------------------------------------------------------
// Dibujo: cielo, sol y nubes
// ---------------------------------------------------------------------------

function drawReferenceBackground() {
  const image = imageReady("background");
  if (!image) return false;
  ctx.drawImage(image, 0, 0, width, height);

  // Las marcas se dibujan sobre el asfalto limpio y avanzan hacia abajo.
  for (let lane = 1; lane < LANE_COUNT; lane++) drawDashes(lane / LANE_COUNT);

  // Destellos que recorren los bordes del asfalto.
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const phase = ((elapsedMs * 0.00022 + i * 0.17) % 1 + 1) % 1;
    const y = horizonY() + Math.pow(phase, 1.55) * (height - horizonY());
    const side = i % 2 ? 1 : -1;
    const x = width / 2 + side * roadHalfAt(y) * 0.98;
    const radius = 1 + phase * 3;
    ctx.globalAlpha = 0.24 + phase * 0.3;
    ctx.fillStyle = i % 3 ? "#ffb300" : "#fff2b2";
    ctx.shadowColor = "#ff8a00";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}

function drawSky() {
  const hy = horizonY();

  const grad = ctx.createLinearGradient(0, 0, 0, hy);
  grad.addColorStop(0, COLORS.skyDeep);
  grad.addColorStop(0.55, COLORS.skyMid);
  grad.addColorStop(1, COLORS.skyLight);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, hy + 2);

  // Sol con halo radiante (arriba a la derecha, como la referencia).
  const sunX = width * 0.8;
  const sunY = height * 0.22;
  const glowR = Math.max(80, width * 0.17);
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
  sunGlow.addColorStop(0, "rgba(255, 250, 200, 0.95)");
  sunGlow.addColorStop(0.22, "rgba(255, 225, 90, 0.6)");
  sunGlow.addColorStop(0.6, "rgba(255, 200, 60, 0.18)");
  sunGlow.addColorStop(1, "rgba(255, 200, 60, 0)");
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff6b0";
  ctx.beginPath();
  ctx.arc(sunX, sunY, Math.max(16, width * 0.028), 0, Math.PI * 2);
  ctx.fill();

  drawHexBackdrop();
  drawClouds();
}

function drawCloudShape(x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x - r * 1.4, y, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x - r * 0.4, y - r * 0.5, r * 1.0, 0, Math.PI * 2);
  ctx.arc(x + r * 0.8, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
  ctx.arc(x + r * 1.6, y + r * 0.15, r * 0.65, 0, Math.PI * 2);
  ctx.arc(x, y + r * 0.35, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds() {
  const cloudTime = elapsedMs * 0.00002;
  const bases = [
    { x: 0.12, y: 0.1, s: 1.0 },
    { x: 0.36, y: 0.06, s: 0.8 },
    { x: 0.58, y: 0.13, s: 1.1 },
    { x: 0.76, y: 0.05, s: 0.7 },
  ];
  const scale = Math.min(Math.max(width / 420, 0.8), 1.7);
  for (const c of bases) {
    const cx = ((c.x + cloudTime) % 1.2) * width - width * 0.1;
    const cy = height * c.y;
    const r = 22 * c.s * scale;
    ctx.fillStyle = "rgba(190, 225, 255, 0.85)";
    drawCloudShape(cx, cy + r * 0.28, r * 0.95);
    ctx.fillStyle = "#ffffff";
    drawCloudShape(cx, cy, r);
  }
}

function drawHexBackdrop() {
  const radius = Math.max(12, width * 0.028);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#2e8bd8";
  ctx.lineWidth = 1;
  for (let row = -1; row < 7; row++) {
    for (let col = -1; col < 12; col++) {
      const x = col * radius * 2.2 + (row % 2 ? radius : 0);
      const y = row * radius * 1.9;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTownAndCastle(hy: number) {
  const baseY = hy + height * 0.055;
  const townScale = Math.min(Math.max(width / 420, 0.8), 1.7);
  ctx.save();
  ctx.globalAlpha = 0.92;

  // Pueblo claro del Valle del Tiétar, con tejados cálidos como en la imagen.
  const buildings = [
    [0.07, 0.035, 0.035],
    [0.12, 0.052, 0.045],
    [0.17, 0.028, 0.03],
    [0.22, 0.06, 0.04],
    [0.28, 0.04, 0.035],
    [0.34, 0.065, 0.042],
    [0.4, 0.035, 0.03],
    [0.46, 0.05, 0.04],
    [0.53, 0.032, 0.03],
    [0.59, 0.055, 0.04],
    [0.65, 0.03, 0.03],
    [0.7, 0.06, 0.042],
  ];
  for (const [xFrac, hFrac, wFrac] of buildings) {
    const bw = width * wFrac * townScale;
    const bh = height * hFrac * townScale;
    const x = width * xFrac;
    ctx.fillStyle = "#f5e4d0";
    ctx.fillRect(x, baseY - bh, bw, bh);
    ctx.fillStyle = "#b65a49";
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.08, baseY - bh);
    ctx.lineTo(x + bw * 0.5, baseY - bh - bh * 0.32);
    ctx.lineTo(x + bw * 1.08, baseY - bh);
    ctx.closePath();
    ctx.fill();
  }

  // Castillo en la colina derecha.
  const castleX = width * 0.82;
  const castleY = baseY - height * 0.055;
  const towerW = width * 0.026;
  ctx.fillStyle = "#f3d8b4";
  ctx.fillRect(castleX - towerW * 1.8, castleY - towerW * 3.2, towerW * 3.8, towerW * 3.2);
  for (const offset of [-towerW * 2.0, towerW * 1.25]) {
    ctx.fillRect(castleX + offset, castleY - towerW * 4.5, towerW * 0.9, towerW * 4.5);
    ctx.fillStyle = "#b95d50";
    ctx.beginPath();
    ctx.moveTo(castleX + offset - towerW * 0.08, castleY - towerW * 4.5);
    ctx.lineTo(castleX + offset + towerW * 0.45, castleY - towerW * 5.1);
    ctx.lineTo(castleX + offset + towerW * 0.98, castleY - towerW * 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f3d8b4";
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Dibujo: colinas, campo y árboles
// ---------------------------------------------------------------------------

function drawHills() {
  const hy = horizonY();

  // Colinas lejanas (verde claro).
  ctx.fillStyle = COLORS.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  for (let x = 0; x <= width; x += 24) {
    const y =
      hy -
      height * 0.02 -
      Math.sin(x * 0.006 + 0.5) * height * 0.042 -
      Math.sin(x * 0.013) * height * 0.016;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, hy);
  ctx.lineTo(0, hy);
  ctx.closePath();
  ctx.fill();

  // Colinas cercanas (verde intenso).
  ctx.fillStyle = COLORS.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  for (let x = 0; x <= width; x += 24) {
    const y =
      hy -
      Math.sin(x * 0.008 + 1.7) * height * 0.03 -
      Math.sin(x * 0.02) * height * 0.012;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, hy);
  ctx.lineTo(0, hy);
  ctx.closePath();
  ctx.fill();

  // Brillo en la cresta de las colinas cercanas.
  ctx.strokeStyle = "rgba(160, 255, 170, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 24) {
    const y =
      hy -
      Math.sin(x * 0.008 + 1.7) * height * 0.03 -
      Math.sin(x * 0.02) * height * 0.012;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  drawTownAndCastle(hy);

  // Campo de hierba hasta el borde inferior (la carretera se dibuja encima).
  const grassGrad = ctx.createLinearGradient(0, hy, 0, height);
  grassGrad.addColorStop(0, COLORS.hillMid);
  grassGrad.addColorStop(0.35, COLORS.grass);
  grassGrad.addColorStop(1, "#1f8f2e");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, hy, width, height - hy);

  // Árboles a los lados, cerca del horizonte.
  const treeScale = Math.min(Math.max(width / 420, 0.7), 1.5);
  drawTree(width * 0.07, hy + height * 0.03, 1.0 * treeScale);
  drawTree(width * 0.14, hy + height * 0.05, 0.8 * treeScale);
  drawTree(width * 0.93, hy + height * 0.03, 1.0 * treeScale);
  drawTree(width * 0.86, hy + height * 0.05, 0.8 * treeScale);
}

function drawTree(x: number, baseY: number, s: number) {
  // Tronco
  ctx.fillStyle = "#7a4a1e";
  ctx.fillRect(x - 3 * s, baseY - 10 * s, 6 * s, 12 * s);
  // Follaje
  ctx.fillStyle = "#2ecc40";
  ctx.beginPath();
  ctx.arc(x, baseY - 22 * s, 12 * s, 0, Math.PI * 2);
  ctx.arc(x - 9 * s, baseY - 14 * s, 9 * s, 0, Math.PI * 2);
  ctx.arc(x + 9 * s, baseY - 14 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  // Brillo
  ctx.fillStyle = "rgba(170, 255, 180, 0.55)";
  ctx.beginPath();
  ctx.arc(x - 3 * s, baseY - 26 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Dibujo: carretera en perspectiva, líneas y quitamiedos
// ---------------------------------------------------------------------------

function drawEdgeNeon(side: number, color: string) {
  const pts = edgePoints(side);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, width * 0.006);
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

function drawGuardrail(side: number) {
  const pts = edgePoints(side);

  // Banda metálica exterior.
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => {
    const off = side * (width * 0.012 + p.t * width * 0.022);
    const x = p.x + off;
    if (i) ctx.lineTo(x, p.y);
    else ctx.moveTo(x, p.y);
  });
  ctx.lineWidth = Math.max(2, width * 0.011);
  ctx.strokeStyle = "rgba(190, 210, 235, 0.55)";
  ctx.shadowColor = "rgba(0, 229, 255, 0.55)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // Segmentos de luz cian sobre el quitamiedos.
  ctx.save();
  ctx.fillStyle = COLORS.railCyan;
  ctx.shadowColor = COLORS.railCyan;
  ctx.shadowBlur = 12;
  for (let i = 2; i < pts.length; i += 2) {
    const p = pts[i];
    const off = side * (width * 0.012 + p.t * width * 0.022);
    const size = 3 + p.t * 9;
    ctx.fillRect(p.x + off - size / 2, p.y - size / 2, size, size * 0.8);
  }
  ctx.restore();
}

function drawDashes(frac: number) {
  const hy = horizonY();
  const N = 12;
  const phase = (roadOffset / 100) % 1;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
  ctx.shadowBlur = 6;

  for (let i = -1; i < N; i++) {
    const t0 = (i + phase) / N;
    const t1 = t0 + 0.045;
    if (t1 <= 0 || t0 >= 1) continue;
    const y0 = hy + Math.pow(Math.max(0, t0), 1.6) * (height - hy);
    const y1 = hy + Math.pow(Math.min(t1, 1), 1.6) * (height - hy);
    const half0 = roadHalfAt(y0);
    const half1 = roadHalfAt(y1);
    const x0 = width / 2 + (frac * 2 - 1) * half0;
    const x1 = width / 2 + (frac * 2 - 1) * half1;
    ctx.lineWidth = 1.5 + Math.max(0, t0) * 9;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoad() {
  const hy = horizonY();

  // Asfalto en perspectiva.
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHalfAt(hy), hy);
  ctx.lineTo(width / 2 + roadHalfAt(hy), hy);
  ctx.lineTo(width / 2 + roadHalfAt(height), height);
  ctx.lineTo(width / 2 - roadHalfAt(height), height);
  ctx.closePath();

  const roadGrad = ctx.createLinearGradient(0, hy, 0, height);
  roadGrad.addColorStop(0, COLORS.roadTop);
  roadGrad.addColorStop(0.45, "#122046");
  roadGrad.addColorStop(1, "#0d1836");
  ctx.fillStyle = roadGrad;
  ctx.fill();

  // Reflejos brillantes sobre el asfalto.
  ctx.save();
  ctx.clip();

  // Halo púrpura/azul en el centro de la calzada.
  const centerGlow = ctx.createRadialGradient(
    width / 2,
    height * 0.78,
    0,
    width / 2,
    height * 0.78,
    width * 0.55
  );
  centerGlow.addColorStop(0, "rgba(120, 90, 255, 0.12)");
  centerGlow.addColorStop(1, "rgba(120, 90, 255, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, hy, width, height - hy);

  for (let i = 0; i < 5; i++) {
    const x = width * 0.5 + (i - 2) * width * 0.16;
    const g = ctx.createLinearGradient(x, hy, x + width * 0.05, height);
    g.addColorStop(0, "rgba(120, 180, 255, 0)");
    g.addColorStop(0.5, "rgba(120, 180, 255, 0.14)");
    g.addColorStop(1, "rgba(120, 180, 255, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, hy);
    ctx.lineTo(x + width * 0.04, hy);
    ctx.lineTo(x + width * 0.17, height);
    ctx.lineTo(x + width * 0.09, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Líneas discontinuas de los carriles.
  for (let lane = 1; lane < LANE_COUNT; lane++) drawDashes(lane / LANE_COUNT);

  // Neón naranja en los bordes.
  drawEdgeNeon(-1, COLORS.railOrange);
  drawEdgeNeon(1, COLORS.railOrange);

  // Quitamiedos metálicos con luces cian.
  drawGuardrail(-1);
  drawGuardrail(1);
}

// ---------------------------------------------------------------------------
// Dibujo: coche naranja del jugador
// ---------------------------------------------------------------------------

function drawMoto() {
  const { w, h } = carSize();
  const cx = motoX;
  const cy = groundY + jumpOffsetY; // rueda trasera de la moto

  // Estela y halo de aceleración naranja, como el escape de la referencia.
  const glow = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, w * 0.8);
  glow.addColorStop(0, "rgba(255, 150, 0, 0.38)");
  glow.addColorStop(1, "rgba(255, 150, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w * 0.8, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "#ff9d00";
  ctx.shadowBlur = 18;
  const exhaust = ctx.createLinearGradient(cx, groundY, cx, groundY + h * 0.55);
  exhaust.addColorStop(0, "rgba(255, 255, 130, 0.95)");
  exhaust.addColorStop(0.4, "rgba(255, 140, 0, 0.8)");
  exhaust.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = exhaust;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.08, groundY - h * 0.02);
  ctx.lineTo(cx + w * 0.08, groundY - h * 0.02);
  ctx.lineTo(cx + w * 0.17, groundY + h * 0.52);
  ctx.lineTo(cx - w * 0.17, groundY + h * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // La sombra permanece en el suelo cuando la moto salta hacia delante.
  ctx.fillStyle = `rgba(0, 0, 0, ${isJumping ? 0.12 : 0.3})`;
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 5, w * 0.42, h * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();

  const motoSprite = imageReady("moto");
  if (motoSprite) {
    ctx.save();
    const tilt = ((targetLaneX - motoX) / width) * 0.14;
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.drawImage(motoSprite, -w / 2, -h, w, h);
    ctx.restore();
    return;
  }

  // Inclinación suave al cambiar de carril.
  const tilt = ((targetLaneX - motoX) / width) * 10;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((tilt * Math.PI) / 180);
  // Rueda trasera y chasis.
  ctx.fillStyle = "#080e1d";
  ctx.strokeStyle = "#91a4c4";
  ctx.lineWidth = Math.max(2, w * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.02, w * 0.13, h * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff4b20";
  roundRectPath(-w * 0.22, -h * 0.34, w * 0.44, h * 0.18, w * 0.06);
  ctx.fill();

  // Brazos, hombros y chaqueta del repartidor.
  ctx.strokeStyle = "#101c3a";
  ctx.lineWidth = Math.max(4, w * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, -h * 0.57);
  ctx.lineTo(-w * 0.45, -h * 0.44);
  ctx.moveTo(w * 0.12, -h * 0.57);
  ctx.lineTo(w * 0.45, -h * 0.44);
  ctx.stroke();
  ctx.fillStyle = COLORS.carOrange;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.62, w * 0.29, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a83b00";
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.stroke();

  // Caja/bolsa amarilla de reparto con sello PideTiétar.
  const bagY = -h * 0.47;
  const bagGrad = ctx.createLinearGradient(0, bagY - h * 0.18, 0, bagY + h * 0.2);
  bagGrad.addColorStop(0, "#ffe04b");
  bagGrad.addColorStop(0.5, "#ffad00");
  bagGrad.addColorStop(1, "#ec6500");
  ctx.fillStyle = bagGrad;
  ctx.shadowColor = "rgba(255, 160, 0, 0.75)";
  ctx.shadowBlur = 12;
  roundRectPath(-w * 0.37, bagY - h * 0.2, w * 0.74, h * 0.36, w * 0.06);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#7f3100";
  ctx.lineWidth = Math.max(2, w * 0.03);
  ctx.stroke();
  ctx.strokeStyle = "#26324d";
  ctx.lineWidth = Math.max(2, w * 0.045);
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, bagY - h * 0.2);
  ctx.quadraticCurveTo(-w * 0.2, bagY - h * 0.36, 0, bagY - h * 0.36);
  ctx.quadraticCurveTo(w * 0.2, bagY - h * 0.36, w * 0.2, bagY - h * 0.2);
  ctx.stroke();

  // Sello gastronómico y texto naranja en la caja.
  ctx.fillStyle = "#fff8de";
  ctx.beginPath();
  ctx.arc(0, bagY - h * 0.04, w * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e84612";
  ctx.lineWidth = Math.max(1.5, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(-w * 0.035, bagY - h * 0.12);
  ctx.lineTo(-w * 0.035, bagY + h * 0.03);
  ctx.moveTo(w * 0.035, bagY - h * 0.12);
  ctx.quadraticCurveTo(w * 0.11, bagY - h * 0.07, w * 0.035, bagY + h * 0.03);
  ctx.stroke();
  ctx.fillStyle = "#c94310";
  ctx.font = `900 ${Math.max(7, w * 0.1)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PideTiétar", 0, bagY + h * 0.14);

  // Casco naranja con reflejo blanco.
  ctx.fillStyle = "#ff4a13";
  ctx.shadowColor = "#ff7300";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(0, -h * 0.92, w * 0.22, Math.PI, Math.PI * 2);
  ctx.lineTo(w * 0.2, -h * 0.82);
  ctx.lineTo(-w * 0.2, -h * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  roundRectPath(-w * 0.13, -h * 0.94, w * 0.19, h * 0.035, w * 0.02);
  ctx.fill();

  // Retrovisores y manillar.
  ctx.strokeStyle = "#91a4c4";
  ctx.lineWidth = Math.max(2, w * 0.025);
  ctx.beginPath();
  ctx.moveTo(-w * 0.25, -h * 0.68);
  ctx.lineTo(-w * 0.47, -h * 0.78);
  ctx.moveTo(w * 0.25, -h * 0.68);
  ctx.lineTo(w * 0.47, -h * 0.78);
  ctx.stroke();
  ctx.fillStyle = "#dbe8ff";
  ctx.beginPath();
  ctx.ellipse(-w * 0.51, -h * 0.8, w * 0.1, h * 0.045, -0.18, 0, Math.PI * 2);
  ctx.ellipse(w * 0.51, -h * 0.8, w * 0.1, h * 0.045, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Dibujo: objetos (conos, vehículos, pedidos y cubiertos)
// ---------------------------------------------------------------------------

function drawCone(obj: GameObject) {
  const w = obj.w;
  const h = obj.h;

  ctx.shadowColor = "rgba(255, 80, 40, 0.75)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ff5a2a";
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Franja blanca.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h * 0.02);
  ctx.lineTo(w * 0.22, -h * 0.02);
  ctx.lineTo(w * 0.28, h * 0.12);
  ctx.lineTo(-w * 0.28, h * 0.12);
  ctx.closePath();
  ctx.fill();

  // Base.
  ctx.fillStyle = "#c22a10";
  roundRectPath(-w * 0.55, h * 0.4, w * 1.1, h * 0.16, 4);
  ctx.fill();

  // Brillo.
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, -h * 0.36);
  ctx.lineTo(-w * 0.02, -h * 0.36);
  ctx.lineTo(w * 0.1, h * 0.36);
  ctx.lineTo(-w * 0.04, h * 0.36);
  ctx.closePath();
  ctx.fill();
}

function drawVehicle(obj: GameObject) {
  const w = obj.w;
  const h = obj.h;
  const tint = obj.tint || "#1e88e5";

  // Halo de color.
  ctx.shadowColor = tint;
  ctx.shadowBlur = 16;
  ctx.fillStyle = tint;
  roundRectPath(-w / 2, -h / 2, w, h, w * 0.18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Brillo superior y sombra inferior dentro de la carrocería.
  ctx.save();
  roundRectPath(-w / 2, -h / 2, w, h, w * 0.18);
  ctx.clip();
  const bodyShade = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  bodyShade.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  bodyShade.addColorStop(0.45, "rgba(255, 255, 255, 0)");
  bodyShade.addColorStop(0.7, "rgba(0, 0, 0, 0)");
  bodyShade.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = bodyShade;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();

  // Luna trasera.
  ctx.fillStyle = "#0b1020";
  roundRectPath(-w * 0.34, -h * 0.3, w * 0.68, h * 0.26, w * 0.08);
  ctx.fill();
  ctx.fillStyle = "rgba(120, 200, 255, 0.28)";
  roundRectPath(-w * 0.3, -h * 0.27, w * 0.26, h * 0.08, w * 0.03);
  ctx.fill();

  // Brillo del techo.
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  roundRectPath(-w * 0.3, -h * 0.4, w * 0.6, h * 0.08, w * 0.03);
  ctx.fill();

  // Pilotos rojos.
  ctx.fillStyle = "#ff3b30";
  ctx.shadowColor = "#ff3b30";
  ctx.shadowBlur = 10;
  roundRectPath(-w * 0.4, h * 0.16, w * 0.22, h * 0.08, 3);
  ctx.fill();
  roundRectPath(w * 0.18, h * 0.16, w * 0.22, h * 0.08, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Matrícula.
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  roundRectPath(-w * 0.14, h * 0.22, w * 0.28, h * 0.07, 2);
  ctx.fill();

  // Parachoques.
  ctx.fillStyle = "#0b0f1a";
  roundRectPath(-w * 0.44, h * 0.34, w * 0.88, h * 0.1, 4);
  ctx.fill();

  // Ruedas.
  ctx.fillStyle = "#0b0f1a";
  roundRectPath(-w * 0.58, h * 0.04, w * 0.15, h * 0.36, 4);
  ctx.fill();
  roundRectPath(w * 0.43, h * 0.04, w * 0.15, h * 0.36, 4);
  ctx.fill();

  // Bujes.
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.arc(-w * 0.505, h * 0.2, w * 0.035, 0, Math.PI * 2);
  ctx.arc(w * 0.505, h * 0.2, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

function drawDelivery(obj: GameObject) {
  const w = obj.w;
  const h = obj.h;

  // Bolsa verde de reparto, con asas y marca, como los pedidos de la
  // referencia. El halo se conserva para que el objeto destaque al avanzar.
  ctx.shadowColor = "#b6ff00";
  ctx.shadowBlur = 18;
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#d2ff42");
  g.addColorStop(0.46, "#7acb00");
  g.addColorStop(1, "#267b18");
  ctx.fillStyle = g;
  roundRectPath(-w / 2, -h * 0.28, w, h * 0.72, w * 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Asas altas.
  ctx.strokeStyle = "#466b00";
  ctx.lineWidth = Math.max(3, w * 0.075);
  ctx.beginPath();
  ctx.moveTo(-w * 0.27, -h * 0.22);
  ctx.lineTo(-w * 0.22, -h * 0.48);
  ctx.quadraticCurveTo(0, -h * 0.7, w * 0.22, -h * 0.48);
  ctx.lineTo(w * 0.27, -h * 0.22);
  ctx.stroke();

  ctx.strokeStyle = "#154d1f";
  ctx.lineWidth = Math.max(2, w * 0.05);
  ctx.stroke();

  // Sello gastronómico blanco/naranja y nombre de marca.
  ctx.fillStyle = "#fff8db";
  ctx.beginPath();
  ctx.arc(0, h * 0.02, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e64b12";
  ctx.lineWidth = Math.max(2, w * 0.035);
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.11);
  ctx.lineTo(-w * 0.05, h * 0.13);
  ctx.moveTo(w * 0.05, -h * 0.11);
  ctx.quadraticCurveTo(w * 0.13, -h * 0.03, w * 0.05, h * 0.13);
  ctx.stroke();
  ctx.fillStyle = "#fff4b0";
  ctx.font = `900 ${Math.max(7, w * 0.17)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PideTiétar", 0, h * 0.3);

  // Brillo.
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  roundRectPath(-w * 0.36, -h * 0.2, w * 0.72, h * 0.1, w * 0.08);
  ctx.fill();
}

function drawCutlery(obj: GameObject) {
  const w = obj.w;
  const h = obj.h;
  const isFork = obj.type === "tenedor";
  const base = isFork ? "#fff5ce" : "#ffe9a0";
  const glow = "rgba(255, 162, 0, 0.95)";

  ctx.shadowColor = glow;
  ctx.shadowBlur = 20;
  const g = ctx.createRadialGradient(-w * 0.2, -h * 0.2, w * 0.05, 0, 0, w * 0.55);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, base);
  g.addColorStop(1, "#f6a600");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = Math.max(1.5, w * 0.05);
  ctx.stroke();

  // Icono de cubiertos: tenedor o cuchara, no una letra, para acercarlo a la
  // ficha dorada de la imagen de referencia.
  ctx.strokeStyle = "#d44216";
  ctx.fillStyle = "#d44216";
  ctx.lineWidth = Math.max(2, w * 0.055);
  ctx.lineCap = "round";
  if (isFork) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w * 0.08, -h * 0.25);
      ctx.lineTo(i * w * 0.08, h * 0.08);
      ctx.stroke();
    }
    roundRectPath(-w * 0.11, h * 0.04, w * 0.22, h * 0.3, w * 0.08);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(w * 0.06, -h * 0.15, w * 0.16, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.06, h * 0.04);
    ctx.lineTo(w * 0.06, h * 0.31);
    ctx.stroke();
  }

  // Brillo superior.
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.ellipse(-w * 0.18, -h * 0.2, w * 0.18, h * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawObject(obj: GameObject) {
  ctx.save();
  ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
  const imageKey = obj.type === "delivery"
    ? "delivery"
    : obj.type === "obstacle"
      ? obj.kind === "vehicle" ? obj.vehicleModel === "van" ? "van" : "vehicle" : obj.kind || "cone"
      : "cutlery";
  const sprite = imageReady(imageKey);
  if (sprite) {
    const pulse = imageKey === "cutlery" ? 1 + Math.sin(elapsedMs * 0.008 + obj.y) * 0.05 : 1;
    ctx.drawImage(sprite, -obj.w * pulse / 2, -obj.h * pulse / 2, obj.w * pulse, obj.h * pulse);
    ctx.restore();
    return;
  }
  if (obj.type === "delivery") drawDelivery(obj);
  else if (obj.type === "obstacle") {
    if (obj.kind === "vehicle" || obj.kind === "moto_civil") drawVehicle(obj);
    else drawCone(obj);
  } else drawCutlery(obj);
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawFloaters() {
  if (!floaters.length) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const baseSize = Math.max(16, Math.min(30, width * 0.045));
  for (const floater of floaters) {
    const alpha = Math.max(0, Math.min(1, floater.life));
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${baseSize}px system-ui, sans-serif`;
    ctx.lineWidth = Math.max(3, baseSize * 0.16);
    ctx.strokeStyle = "rgba(3, 10, 28, 0.85)";
    ctx.shadowColor = floater.color;
    ctx.shadowBlur = 14;
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------------------
// Bucle principal (único)
// ---------------------------------------------------------------------------

export function loop() {
  if (!running) return;

  const now = performance.now();
  let dt = now - lastFrameTime;
  lastFrameTime = now;
  if (dt > 100) dt = 100;

  update(dt);

  if (gameOver) return;

  const sx = shakeX ? (Math.random() - 0.5) * shakeX : 0;
  const sy = shakeY ? (Math.random() - 0.5) * shakeY : 0;
  ctx.save();
  ctx.translate(sx, sy);

  if (!drawReferenceBackground()) {
    drawSky();
    drawHills();
    drawRoad();
  }
  // Los objetos quedan en la capa de la carretera; la moto se pinta después
  // para que, al saltar hacia delante, se vea cómo pasan por debajo.
  for (const obj of objects) drawObject(obj);
  drawMoto();
  drawParticles();
  drawFloaters();

  ctx.restore();

  rafId = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export function getState() {
  return {
    running,
    paused,
    gameOver,
    victory,
    score,
    level,
    deliveries,
    levelDeliveries,
    targetBags: currentLevelRule().bags,
    coinsSent,
    obstaclesSent,
    bagsSent,
    levelElapsedMs,
    speedMultiplier: currentSpeed(),
    timeBonusSeconds,
    remainingMs: Math.max(0, durationMs - elapsedMs),
    durationMs,
    moto: { lane: motoLane, x: motoX, groundY, jumpOffsetY, isJumping, jumpTargetId },
    objects: objects.map(({ id, type, kind, lane, x, y, w, h }) =>
      ({ id, type, kind, lane, x, y, w, h })),
  };
}
