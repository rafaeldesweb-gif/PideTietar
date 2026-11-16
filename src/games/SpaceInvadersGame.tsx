import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, RotateCcw, X, Zap } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './SpaceInvadersGame.css';

interface SpaceInvadersGameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'over' | 'won';
type Aviso = { text: string; until: number; tone: 'vida' | 'logro' };
type Control = 'left' | 'right' | 'fire';

interface Invader { x: number; y: number; alive: boolean; row: number; }
interface Shot { x: number; y: number; speed: number; enemy: boolean; }
/** Nave kamikaze que se desprende de arriba y baja zigzagueando. */
interface Diver {
  x: number;
  y: number;
  baseX: number;
  vy: number;
  amp: number;
  freq: number;
  phase: number;
  t: number;
  angle: number;
}
interface InvadersState {
  playerX: number;
  pointerTarget: number | null;
  invaders: Invader[];
  divers: Diver[];
  diversLeft: number;
  diverCooldown: number;
  shots: Shot[];
  score: number;
  lives: number;
  level: number;
  direction: 1 | -1;
  lastTime: number;
  fireCooldown: number;
  enemyCooldown: number;
  levelTransitionUntil: number;
  ended: boolean;
  invulnerableUntil: number;
  flashUntil: number;
  message: Aviso | null;
}

const WIDTH = 700;
/* 760 × 1,2 = 912: un 10 % más de alto por arriba y otro 10 % por abajo. */
const HEIGHT = 912;
const COLS = 8;
const ROWS = 4;
const SHIP_Y = HEIGHT - 130;
const HORIZONTE = HEIGHT * 0.8;
const INVULNERABLE_MS = 1200;
const MAX_LEVELS = 5;
/** Vidas máximas que se muestran en el dashboard (una extra por nivel superado). */
const MAX_LIVES = 5;
const START_LIVES = 3;
/** Cada nivel acelera un 10 % las naves que bajan (formación, kamikazes y disparos). */
const VELOCIDAD_POR_NIVEL = 0.1;
/** La bajada del muro sube el doble: +20 % por nivel (5, 6, 7, 8 y 9 px/s). */
const BAJADA_POR_NIVEL = 0.2;
/** Marcha lateral de la formación en el nivel 1 (px/s) y acelerón al diezmarla. */
const MARCHA_BASE = 30;
const MARCHA_ACELERON = 48;
/** Bajada de la formación en el nivel 1 (px/s); también sube un 10 % por nivel. */
const DESCENSO_BASE = 5;
const BONO_KAMIKAZE = 150;

/* Paleta del icono: naranja, verde, rosa y cian, con núcleo neón más claro. */
const ROW_COLORS = [
  { main: '#ff8a1f', light: '#ffd9a0', glow: 'rgba(255, 138, 31, .95)' },
  { main: '#8ef23a', light: '#e2ffb8', glow: 'rgba(142, 242, 58, .95)' },
  { main: '#ff3ec3', light: '#ffc4f0', glow: 'rgba(255, 62, 195, .95)' },
  { main: '#26e6ff', light: '#cdd9ff', glow: 'rgba(38, 230, 255, .95)' },
];

/* Alien pixelado clásico (dos fotogramas para el desfile). */
const INVADER_A = [
  [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0],
];
const INVADER_B = [
  [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
];

const PIXEL = 4;
const SPRITE_PAD = 14;

const buildFormation = (): Invader[] => Array.from({ length: COLS * ROWS }, (_, index) => ({
  x: 119 + (index % COLS) * 66,
  y: 174 + Math.floor(index / COLS) * 58,
  alive: true,
  row: Math.floor(index / COLS),
}));

/** Factor de velocidad de las naves que bajan: +10 % por nivel. */
const factorNivel = (level: number) => 1 + VELOCIDAD_POR_NIVEL * (level - 1);

/** Factor de la bajada del muro: +20 % por nivel (hasta el 5). */
const factorBajada = (level: number) => 1 + BAJADA_POR_NIVEL * (level - 1);

const createState = (): InvadersState => ({
  playerX: WIDTH / 2,
  pointerTarget: null,
  invaders: buildFormation(),
  divers: [],
  diversLeft: 1,
  diverCooldown: 3.6,
  shots: [],
  score: 0,
  lives: START_LIVES,
  level: 1,
  direction: 1,
  lastTime: performance.now(),
  fireCooldown: 0,
  enemyCooldown: 1.2,
  levelTransitionUntil: 0,
  ended: false,
  invulnerableUntil: performance.now() + 900,
  flashUntil: 0,
  message: null,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Prepara la formación y los kamikazes de un nivel. */
const prepareLevel = (state: InvadersState, level: number, ahora: number) => {
  state.level = level;
  state.invaders = buildFormation();
  state.divers = [];
  state.diversLeft = level;
  state.diverCooldown = 3.2;
  state.direction = 1;
  state.shots = [];
  state.enemyCooldown = 1.1;
  state.levelTransitionUntil = 0;
  state.message = { text: `Nivel ${level} · ${level} kamikaze${level > 1 ? 's' : ''}`, until: ahora + 1800, tone: 'logro' };
};

/** Suelta una nave kamikaze que baja zigzagueando hacia la nave del jugador. */
const createDiver = (state: InvadersState): Diver => {
  const baseX = clamp(state.playerX + (Math.random() - 0.5) * 150, 70, WIDTH - 70);
  return {
    x: baseX,
    y: -40,
    baseX,
    vy: 120 * factorNivel(state.level),
    amp: 40 + Math.random() * 60,
    freq: 1.4 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    t: 0,
    angle: 0,
  };
};

// ---------------------------------------------------------------------------
// Sprites cacheados de los invasores.
// ---------------------------------------------------------------------------
const spriteCache = new Map<string, HTMLCanvasElement>();

const buildInvaderSprite = (row: number, frame: 0 | 1): HTMLCanvasElement => {
  const bitmap = frame === 0 ? INVADER_A : INVADER_B;
  const cols = bitmap[0].length;
  const rows = bitmap.length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * PIXEL + SPRITE_PAD * 2;
  canvas.height = rows * PIXEL + SPRITE_PAD * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(SPRITE_PAD, SPRITE_PAD);
  const colors = ROW_COLORS[row % ROW_COLORS.length];
  const paint = () => {
    bitmap.forEach((line, y) => line.forEach((cell, x) => {
      if (cell) ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
    }));
  };
  ctx.fillStyle = colors.main;
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 18;
  paint();
  ctx.shadowBlur = 0;
  paint();
  // Núcleo neón: píxeles interiores en tono claro.
  const dentro = (x: number, y: number) => (
    x > 0 && y > 0 && x < cols - 1 && y < rows - 1
    && bitmap[y][x] && bitmap[y - 1][x] && bitmap[y + 1][x] && bitmap[y][x - 1] && bitmap[y][x + 1]
  );
  ctx.fillStyle = colors.light;
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 6;
  bitmap.forEach((line, y) => line.forEach((cell, x) => {
    if (cell && dentro(x, y)) ctx.fillRect(x * PIXEL + 1, y * PIXEL + 1, PIXEL - 2, PIXEL - 2);
  }));
  ctx.shadowBlur = 0;
  // Ojos.
  ctx.fillStyle = '#0a1030';
  ctx.fillRect(4 * PIXEL, 3 * PIXEL, PIXEL, PIXEL);
  ctx.fillRect(6 * PIXEL, 3 * PIXEL, PIXEL, PIXEL);
  return canvas;
};

const invaderSprite = (row: number, frame: 0 | 1) => {
  const key = `${row}-${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const sprite = buildInvaderSprite(row, frame);
  spriteCache.set(key, sprite);
  return sprite;
};

const roundedPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const paintPlanet = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  deep: string,
  bright: string,
  ring = false,
) => {
  const fill = ctx.createRadialGradient(cx - radius * 0.38, cy - radius * 0.42, radius * 0.1, cx, cy, radius);
  fill.addColorStop(0, bright);
  fill.addColorStop(0.55, deep);
  fill.addColorStop(1, 'rgba(10, 6, 30, .95)');
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 200, 255, .28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (!ring) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.42);
  ctx.strokeStyle = 'rgba(255, 170, 240, .5)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.7, radius * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 220, 255, .3)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.9, radius * 0.52, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

const paintGalaxy = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.4);
  halo.addColorStop(0, 'rgba(255, 200, 255, .55)');
  halo.addColorStop(0.45, 'rgba(190, 110, 255, .28)');
  halo.addColorStop(1, 'rgba(120, 40, 200, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (0.35 + i * 0.16), radius * (0.14 + i * 0.1), 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 150, 235, ${0.42 - i * 0.06})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
};

const paintBackdrop = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#0c0628');
  sky.addColorStop(0.42, '#180a45');
  sky.addColorStop(1, '#2a1063');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Nebulosas.
  const nebula = (cx: number, cy: number, r: number, color: string) => {
    const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(20, 8, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
  nebula(WIDTH * 0.2, HEIGHT * 0.16, 260, 'rgba(60, 150, 255, .18)');
  nebula(WIDTH * 0.84, HEIGHT * 0.3, 300, 'rgba(255, 80, 200, .14)');
  nebula(WIDTH * 0.45, HEIGHT * 0.62, 340, 'rgba(120, 60, 255, .16)');

  // Planetas y galaxia del icono.
  paintPlanet(ctx, WIDTH * 0.1, HEIGHT * 0.09, 92, '#122b63', '#3d6fd0', true);
  paintGalaxy(ctx, WIDTH * 0.84, HEIGHT * 0.11, 52);
  paintPlanet(ctx, WIDTH * 1.02, HEIGHT * 0.44, 58, '#3a1568', '#a468ff', true);
  paintPlanet(ctx, WIDTH * 0.02, HEIGHT * 0.5, 36, '#3d1160', '#ff74d6');

  // Estrellas y destellos fijos.
  for (let i = 0; i < 96; i += 1) {
    const x = (i * 137.5 + 31) % WIDTH;
    const y = (i * 91.7 + 17) % (HEIGHT * 0.8);
    const r = i % 7 === 0 ? 1.9 : i % 3 === 0 ? 1.3 : 0.9;
    ctx.globalAlpha = 0.28 + (i % 4) * 0.16;
    ctx.fillStyle = i % 5 === 0 ? '#cfe6ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Resplandor del horizonte.
  const horizonte = ctx.createRadialGradient(WIDTH / 2, HORIZONTE, 8, WIDTH / 2, HORIZONTE, WIDTH * 0.85);
  horizonte.addColorStop(0, 'rgba(255, 90, 220, .5)');
  horizonte.addColorStop(0.35, 'rgba(140, 60, 255, .22)');
  horizonte.addColorStop(1, 'rgba(20, 8, 50, 0)');
  ctx.fillStyle = horizonte;
  ctx.fillRect(0, HORIZONTE - 220, WIDTH, HEIGHT - HORIZONTE + 220);

  // Rejilla neón en perspectiva.
  ctx.save();
  ctx.strokeStyle = 'rgba(140, 235, 255, .32)';
  ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 + i * 13, HORIZONTE);
    ctx.lineTo(WIDTH / 2 + i * 148, HEIGHT + 4);
    ctx.stroke();
  }
  for (let k = 1; k <= 9; k += 1) {
    const t = k / 9;
    const y = HORIZONTE + (HEIGHT - HORIZONTE) * Math.pow(t, 1.9);
    ctx.globalAlpha = 0.12 + t * 0.44;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const linea = ctx.createLinearGradient(0, HORIZONTE - 3, 0, HORIZONTE + 3);
  linea.addColorStop(0, 'rgba(255, 120, 226, 0)');
  linea.addColorStop(0.5, 'rgba(255, 178, 245, .9)');
  linea.addColorStop(1, 'rgba(255, 120, 226, 0)');
  ctx.fillStyle = linea;
  ctx.fillRect(0, HORIZONTE - 3, WIDTH, 6);

  // Viñeta para que los bordes no distraigan.
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.32, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.86);
  vignette.addColorStop(0, 'rgba(6, 3, 20, 0)');
  vignette.addColorStop(1, 'rgba(6, 3, 20, .55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

const SPARKLES = [
  { x: 88, y: 210, r: 8, phase: 0 },
  { x: 300, y: 108, r: 6, phase: 1.2 },
  { x: 560, y: 176, r: 7, phase: 2.4 },
  { x: 646, y: 268, r: 5, phase: 3.1 },
  { x: 210, y: 396, r: 6, phase: 4.2 },
  { x: 480, y: 470, r: 7, phase: 5.3 },
  { x: 120, y: 560, r: 5, phase: 0.6 },
  { x: 612, y: 600, r: 6, phase: 2.9 },
];

const drawSparkles = (ctx: CanvasRenderingContext2D, ahora: number) => {
  SPARKLES.forEach((sparkle) => {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(ahora / 900 + sparkle.phase));
    const r = sparkle.r * (0.7 + pulse * 0.5);
    ctx.save();
    ctx.translate(sparkle.x, sparkle.y);
    ctx.globalAlpha = 0.35 + pulse * 0.5;
    ctx.fillStyle = '#e6f9ff';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.18, -r * 0.18, r, 0);
    ctx.quadraticCurveTo(r * 0.18, r * 0.18, 0, r);
    ctx.quadraticCurveTo(-r * 0.18, r * 0.18, -r, 0);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.18, 0, -r);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalAlpha = 1;
};

const drawShip = (ctx: CanvasRenderingContext2D, x: number, ahora: number) => {
  ctx.save();
  ctx.translate(x, SHIP_Y);

  // Aura neón bajo la nave.
  const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 48);
  aura.addColorStop(0, 'rgba(120, 230, 255, .32)');
  aura.addColorStop(1, 'rgba(120, 230, 255, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();

  // Llama del motor.
  const largo = 22 + Math.sin(ahora / 70) * 6;
  const llama = ctx.createLinearGradient(0, 14, 0, 16 + largo);
  llama.addColorStop(0, 'rgba(225, 255, 255, .95)');
  llama.addColorStop(0.4, 'rgba(94, 224, 255, .8)');
  llama.addColorStop(1, 'rgba(60, 120, 255, 0)');
  ctx.fillStyle = llama;
  ctx.beginPath();
  ctx.moveTo(-9, 12);
  ctx.quadraticCurveTo(0, 16 + largo, 9, 12);
  ctx.closePath();
  ctx.fill();

  // Alas rojas.
  ctx.fillStyle = '#ff3b46';
  ctx.shadowColor = 'rgba(255, 59, 70, .9)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.lineTo(-27, 16);
  ctx.lineTo(-8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, -2);
  ctx.lineTo(27, 16);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Casco.
  const casco = ctx.createLinearGradient(-14, 0, 14, 0);
  casco.addColorStop(0, '#c9d4e8');
  casco.addColorStop(0.35, '#ffffff');
  casco.addColorStop(0.75, '#f2f6ff');
  casco.addColorStop(1, '#b4c2dc');
  ctx.fillStyle = casco;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.quadraticCurveTo(9, -14, 11, 6);
  ctx.lineTo(12, 15);
  ctx.lineTo(4, 19);
  ctx.lineTo(-4, 19);
  ctx.lineTo(-12, 15);
  ctx.lineTo(-11, 6);
  ctx.quadraticCurveTo(-9, -14, 0, -30);
  ctx.closePath();
  ctx.shadowColor = 'rgba(120, 210, 255, .8)';
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Contorno neón.
  ctx.strokeStyle = 'rgba(150, 240, 255, .95)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(95, 230, 255, .95)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Franja roja.
  ctx.fillStyle = 'rgba(255, 59, 70, .85)';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(2.6, 10);
  ctx.lineTo(-2.6, 10);
  ctx.closePath();
  ctx.fill();

  // Cabina cian.
  ctx.fillStyle = '#5ff0ff';
  ctx.shadowColor = 'rgba(95, 240, 255, .95)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(0, -11, 5.2, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
};

const drawShots = (ctx: CanvasRenderingContext2D, shots: Shot[]) => {
  shots.forEach((shot) => {
    if (shot.enemy) {
      const trail = ctx.createLinearGradient(0, shot.y - 16, 0, shot.y + 16);
      trail.addColorStop(0, 'rgba(255, 62, 195, 0)');
      trail.addColorStop(0.5, '#ff8ada');
      trail.addColorStop(1, 'rgba(255, 62, 195, 0)');
      ctx.fillStyle = trail;
      ctx.shadowColor = 'rgba(255, 62, 195, .95)';
      ctx.shadowBlur = 14;
      roundedPath(ctx, shot.x - 3, shot.y - 16, 6, 32, 3);
      ctx.fill();
    } else {
      const trail = ctx.createLinearGradient(0, shot.y - 20, 0, shot.y + 20);
      trail.addColorStop(0, 'rgba(255, 240, 190, 0)');
      trail.addColorStop(0.45, '#fff6cc');
      trail.addColorStop(1, 'rgba(255, 138, 31, 0)');
      ctx.fillStyle = trail;
      ctx.shadowColor = 'rgba(255, 170, 60, 1)';
      ctx.shadowBlur = 16;
      roundedPath(ctx, shot.x - 2.5, shot.y - 18, 5, 36, 2.5);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  });
};

const drawMiniShip = (ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.45, 1.45);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#e8fbff';
    ctx.shadowColor = 'rgba(95, 240, 255, .95)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(150, 245, 255, .9)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(150, 220, 255, .4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
};

/** Nave kamikaze: cápsula roja con núcleo naranja, halo y estela. */
const drawDiver = (ctx: CanvasRenderingContext2D, diver: Diver, ahora: number) => {
  const pulso = 0.5 + 0.5 * Math.sin(ahora / 150);
  ctx.save();
  ctx.translate(diver.x, diver.y);
  ctx.rotate(diver.angle);

  // Estela.
  const estela = ctx.createLinearGradient(0, -14, 0, -64);
  estela.addColorStop(0, 'rgba(255, 120, 60, .55)');
  estela.addColorStop(1, 'rgba(255, 60, 20, 0)');
  ctx.fillStyle = estela;
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.lineTo(0, -64);
  ctx.lineTo(7, -12);
  ctx.closePath();
  ctx.fill();

  // Halo pulsante para distinguirla de los aliens.
  ctx.strokeStyle = `rgba(255, 130, 180, ${0.3 + pulso * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 25 + pulso * 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.scale(1.25, 1.25);

  // Cápsula.
  ctx.fillStyle = '#ff2f6d';
  ctx.shadowColor = 'rgba(255, 47, 109, .95)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(0, 19);
  ctx.lineTo(15, -6);
  ctx.lineTo(6, -13);
  ctx.lineTo(-6, -13);
  ctx.lineTo(-15, -6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Núcleo.
  ctx.fillStyle = '#ffb347';
  ctx.shadowColor = 'rgba(255, 200, 90, .95)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, -2, 4.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Aletas.
  ctx.strokeStyle = 'rgba(255, 214, 130, .85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -7);
  ctx.lineTo(-17, 4);
  ctx.moveTo(11, -7);
  ctx.lineTo(17, 4);
  ctx.stroke();

  ctx.restore();
};

/** Dashboard superior: puntos, nivel, vidas y récord en una barra translúcida. */
const drawDashboard = (ctx: CanvasRenderingContext2D, state: InvadersState | null, bestScore: number) => {
  const x = 16;
  const y = 14;
  const w = WIDTH - 32;
  const h = 88;

  ctx.save();
  roundedPath(ctx, x, y, w, h, 22);
  ctx.fillStyle = 'rgba(9, 5, 28, .7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(94, 226, 255, .5)';
  ctx.lineWidth = 1.4;
  ctx.shadowColor = 'rgba(60, 200, 255, .5)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Puntos.
  ctx.textAlign = 'left';
  ctx.font = '900 13px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(190, 224, 255, .85)';
  ctx.fillText('PUNTOS', x + 24, y + 27);
  ctx.font = '900 38px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(120, 230, 255, .95)';
  ctx.shadowBlur = 18;
  ctx.fillText(String(state?.score ?? 0), x + 24, y + 70);
  ctx.shadowBlur = 0;

  // Récord.
  ctx.textAlign = 'right';
  ctx.font = '900 13px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 200, 242, .9)';
  ctx.fillText('RÉCORD', x + w - 24, y + 27);
  ctx.font = '900 38px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 120, 220, .95)';
  ctx.shadowBlur = 18;
  ctx.fillText(String(bestScore), x + w - 24, y + 70);
  ctx.shadowBlur = 0;

  // Vidas y nivel.
  const lives = state?.lives ?? START_LIVES;
  const centro = WIDTH / 2;
  const hueco = 27;
  const inicioVidas = centro - ((MAX_LIVES - 1) * hueco) / 2;
  for (let i = 0; i < MAX_LIVES; i += 1) {
    drawMiniShip(ctx, inicioVidas + i * hueco, y + 33, i < lives);
  }
  ctx.textAlign = 'center';
  ctx.font = '900 16px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(176, 245, 255, .98)';
  ctx.shadowColor = 'rgba(80, 220, 255, .95)';
  ctx.shadowBlur = 14;
  ctx.fillText(`NIVEL ${state?.level ?? 1}/${MAX_LEVELS}`, centro, y + 74);
  ctx.shadowBlur = 0;
  ctx.restore();
};

const drawMessage = (ctx: CanvasRenderingContext2D, message: Aviso | null, ahora: number) => {
  if (!message || ahora >= message.until) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (message.until - ahora) / 320);
  ctx.font = '900 17px system-ui, -apple-system, "Segoe UI", sans-serif';
  const ancho = ctx.measureText(message.text).width + 42;
  roundedPath(ctx, (WIDTH - ancho) / 2, 108, ancho, 46, 23);
  ctx.fillStyle = 'rgba(12, 5, 32, .85)';
  ctx.fill();
  ctx.strokeStyle = message.tone === 'logro' ? 'rgba(80, 236, 255, .85)' : 'rgba(255, 90, 130, .85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = message.tone === 'logro' ? '#a9fbff' : '#ffd0dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message.text, WIDTH / 2, 132);
  ctx.restore();
};

const drawHitFlash = (ctx: CanvasRenderingContext2D, ahora: number, until: number) => {
  if (ahora >= until) return;
  const fuerza = (until - ahora) / 420;
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.2, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.78);
  gradient.addColorStop(0, 'rgba(255, 40, 90, 0)');
  gradient.addColorStop(1, `rgba(255, 40, 90, ${0.55 * fuerza})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

export default function SpaceInvadersGame({ onClose }: SpaceInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<InvadersState | null>(null);
  const screenRef = useRef<Screen>('start');
  const keysRef = useRef(new Set<string>());
  const controlsRef = useRef(new Set<Control>());
  const draggingRef = useRef(false);
  const backdropRef = useRef<HTMLCanvasElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [tamanio, setTamanio] = useState<{ w: number; h: number } | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('space-invaders', 'pidetietar-game-space-invaders-best-v1');

  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Ajusta el lienzo al hueco disponible conservando la proporción 700 × 912
  // (con `max-height` a secas el navegador aplastaba el dibujo).
  useEffect(() => {
    const contenedor = sectionRef.current;
    if (!contenedor) return undefined;
    const ajustar = () => {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;
      if (!ancho || !alto) return;
      const escala = Math.min(ancho / WIDTH, alto / HEIGHT);
      setTamanio({
        w: Math.max(1, Math.floor(WIDTH * escala)),
        h: Math.max(1, Math.floor(HEIGHT * escala)),
      });
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, []);

  const finishGame = useCallback((next: 'over' | 'won') => {
    const state = stateRef.current;
    if (!state || state.ended) return;
    state.ended = true;
    keysRef.current.clear();
    controlsRef.current.clear();
    screenRef.current = next;
    setScreen(next);
    void saveScore(state.score, state.level);
  }, [saveScore]);

  const startGame = useCallback(() => {
    const state = createState();
    state.message = { text: 'Nivel 1 · 1 kamikaze', until: performance.now() + 1800, tone: 'logro' };
    stateRef.current = state;
    keysRef.current.clear();
    controlsRef.current.clear();
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    if (!backdropRef.current) {
      const backdrop = document.createElement('canvas');
      backdrop.width = WIDTH;
      backdrop.height = HEIGHT;
      paintBackdrop(backdrop);
      backdropRef.current = backdrop;
    }
    const backdrop = backdropRef.current;

    const shoot = () => {
      const state = stateRef.current;
      if (!state || screenRef.current !== 'playing' || state.fireCooldown > 0) return;
      state.shots.push({ x: state.playerX, y: SHIP_Y - 32, speed: -430, enemy: false });
      state.fireCooldown = 0.3;
    };

    let frame = 0;

    const draw = (now: number) => {
      // Red de seguridad ante cualquier transformación sin restaurar.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const state = stateRef.current;
      const delta = state ? Math.min(0.035, Math.max(0.008, (now - state.lastTime) / 1000)) : 0.016;
      if (state) state.lastTime = now;

      if (state && screenRef.current === 'playing') {
        // Cambio de nivel pendiente.
        if (state.levelTransitionUntil && now >= state.levelTransitionUntil) {
          prepareLevel(state, state.level + 1, now);
        }

        const factor = factorNivel(state.level);
        const izquierda = keysRef.current.has('ArrowLeft') || keysRef.current.has('a') || controlsRef.current.has('left');
        const derecha = keysRef.current.has('ArrowRight') || keysRef.current.has('d') || controlsRef.current.has('right');
        if (izquierda || derecha) {
          state.pointerTarget = null;
          state.playerX += (derecha ? 1 : -1) * 330 * delta;
        } else if (state.pointerTarget !== null) {
          state.playerX += (state.pointerTarget - state.playerX) * Math.min(1, delta * 14);
        }
        state.playerX = clamp(state.playerX, 30, WIDTH - 30);

        if (keysRef.current.has(' ') || controlsRef.current.has('fire')) shoot();
        state.fireCooldown = Math.max(0, state.fireCooldown - delta);
        state.enemyCooldown -= delta;

        const alive = state.invaders.filter((invader) => invader.alive);
        const total = state.invaders.length;
        const borde = alive.some((invader) => invader.x > WIDTH - 52 || invader.x < 52);
        if (borde) state.direction = state.direction === 1 ? -1 : 1;
        // Marcha y bajada: la marcha sube un 10 % por nivel y la bajada un 20 %.
        const velocidad = (MARCHA_BASE + (1 - alive.length / total) * MARCHA_ACELERON) * factor;
        const bajada = DESCENSO_BASE * factorBajada(state.level);
        alive.forEach((invader) => {
          invader.x += state.direction * velocidad * delta;
          invader.y += bajada * delta;
        });

        // Kamikazes del nivel.
        if (!state.levelTransitionUntil && state.diversLeft > 0) {
          state.diverCooldown -= delta;
          if (state.diverCooldown <= 0) {
            state.divers.push(createDiver(state));
            state.diversLeft -= 1;
            state.diverCooldown = 6 + Math.random() * 3;
          }
        }
        state.divers.forEach((diver) => {
          diver.t += delta;
          diver.y += diver.vy * delta;
          // El zigzag lateral también se acelera un 10 % por nivel.
          const onda = diver.t * diver.freq * factor + diver.phase;
          diver.x = clamp(diver.baseX + Math.sin(onda) * diver.amp, 30, WIDTH - 30);
          diver.angle = clamp(Math.cos(onda) * diver.amp * diver.freq * factor * 0.004, -0.35, 0.35);
        });
        state.divers = state.divers.filter((diver) => diver.y < HEIGHT + 60);

        if (state.enemyCooldown <= 0 && alive.length) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          state.shots.push({ x: shooter.x, y: shooter.y + 22, speed: 220 * factor, enemy: true });
          state.enemyCooldown = Math.max(0.45, 1.35 - state.score / 900 - state.level * 0.05);
        }

        state.shots.forEach((shot) => { shot.y += shot.speed * delta; });
        state.shots = state.shots.filter((shot) => shot.y > -30 && shot.y < HEIGHT + 30);

        for (let shotIndex = state.shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
          const shot = state.shots[shotIndex];
          if (shot.enemy) continue;
          const objetivo = state.invaders.find(
            (item) => item.alive && Math.abs(item.x - shot.x) < 23 && Math.abs(item.y - shot.y) < 20,
          );
          if (objetivo) {
            objetivo.alive = false;
            state.shots.splice(shotIndex, 1);
            state.score += 10;
            continue;
          }
          // Derribar un kamikaze da un bono.
          const kamikaze = state.divers.findIndex(
            (diver) => Math.abs(diver.x - shot.x) < 26 && Math.abs(diver.y - shot.y) < 24,
          );
          if (kamikaze !== -1) {
            state.divers.splice(kamikaze, 1);
            state.shots.splice(shotIndex, 1);
            state.score += BONO_KAMIKAZE;
            state.message = { text: `¡Bono +${BONO_KAMIKAZE}!`, until: now + 1400, tone: 'logro' };
          }
        }

        if (now > state.invulnerableUntil) {
          const disparoEnemigo = state.shots.find(
            (shot) => shot.enemy && Math.abs(shot.x - state.playerX) < 22 && Math.abs(shot.y - SHIP_Y) < 24,
          );
          const choqueKamikaze = state.divers.find(
            (diver) => Math.abs(diver.x - state.playerX) < 26 && Math.abs(diver.y - SHIP_Y) < 26,
          );
          if (disparoEnemigo || choqueKamikaze) {
            state.shots = state.shots.filter((shot) => !shot.enemy);
            if (choqueKamikaze) {
              state.divers = state.divers.filter((diver) => diver !== choqueKamikaze);
            }
            state.lives -= 1;
            state.flashUntil = now + 420;
            if (state.lives <= 0) {
              finishGame('over');
            } else {
              state.invulnerableUntil = now + INVULNERABLE_MS;
              state.message = { text: '¡Vida perdida!', until: now + 1500, tone: 'vida' };
            }
          }
        }

        if (state.invaders.some((invader) => invader.alive && invader.y > SHIP_Y - 46) && !state.ended) {
          finishGame('over');
        }

        // Nivel despejado o partida ganada.
        if (state.invaders.every((invader) => !invader.alive) && !state.ended && !state.levelTransitionUntil) {
          if (state.level >= MAX_LEVELS) {
            finishGame('won');
          } else {
            state.levelTransitionUntil = now + 1800;
            state.divers = [];
            state.diversLeft = 0;
            state.shots = [];
            // Recompensa: una vida al superar cada nivel (hasta el máximo del HUD).
            const premio = state.lives < MAX_LIVES;
            state.lives = Math.min(MAX_LIVES, state.lives + 1);
            state.message = {
              text: `¡Nivel ${state.level} superado!${premio ? ' · +1 vida' : ''}`,
              until: now + 1700,
              tone: 'logro',
            };
          }
        }
      }

      ctx.drawImage(backdrop, 0, 0);
      drawSparkles(ctx, now);

      if (state) {
        const frameAlien: 0 | 1 = Math.floor(now / 380) % 2 === 0 ? 0 : 1;
        state.invaders.forEach((invader) => {
          if (!invader.alive) return;
          const sprite = invaderSprite(invader.row, frameAlien);
          ctx.drawImage(sprite, invader.x - sprite.width / 2, invader.y - sprite.height / 2);
        });

        state.divers.forEach((diver) => drawDiver(ctx, diver, now));
        drawShots(ctx, state.shots);

        const invulnerable = screenRef.current === 'playing' && now < state.invulnerableUntil;
        ctx.globalAlpha = invulnerable ? 0.45 + 0.4 * Math.abs(Math.sin(now / 90)) : 1;
        drawShip(ctx, state.playerX, now);
        ctx.globalAlpha = 1;

        drawDashboard(ctx, state, bestScore);
        drawMessage(ctx, state.message, now);
        drawHitFlash(ctx, now, state.flashUntil);
      } else {
        drawDashboard(ctx, null, bestScore);
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose?.(); return; }
      if (event.key.toLowerCase() === 'r' && (screenRef.current === 'over' || screenRef.current === 'won')) { startGame(); return; }
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(event.key)) {
        event.preventDefault();
        keysRef.current.add(event.key);
        if (event.key === ' ') shoot();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { keysRef.current.delete(event.key); };

    const pointerX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return clamp(((event.clientX - rect.left) / rect.width) * WIDTH, 30, WIDTH - 30);
    };
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      draggingRef.current = true;
      const state = stateRef.current;
      if (state) state.pointerTarget = pointerX(event);
      shoot();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const state = stateRef.current;
      if (state) state.pointerTarget = pointerX(event);
    };
    const onPointerEnd = () => { draggingRef.current = false; };
    const onBlur = () => { keysRef.current.clear(); controlsRef.current.clear(); draggingRef.current = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('pointerleave', onPointerEnd);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('pointerleave', onPointerEnd);
    };
  }, [bestScore, finishGame, onClose, startGame]);

  const pressControl = (control: Control) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    controlsRef.current.add(control);
  };
  const releaseControl = (control: Control) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    controlsRef.current.delete(control);
  };

  return (
    <section className="pidetietar-space-invaders" aria-label="Juego Space Invaders" ref={sectionRef}>
      <div className="pidetietar-space-invaders__stage">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="pidetietar-space-invaders__canvas"
          style={tamanio ? { width: `${tamanio.w}px`, height: `${tamanio.h}px` } : undefined}
        />
        {screen === 'playing' && (
          <>
            <div className="pidetietar-space-invaders__pad" role="group" aria-label="Mover la nave">
              <button
                type="button"
                className="pidetietar-space-invaders__control"
                aria-label="Mover a la izquierda"
                onPointerDown={pressControl('left')}
                onPointerUp={releaseControl('left')}
                onPointerCancel={releaseControl('left')}
                onPointerLeave={releaseControl('left')}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="pidetietar-space-invaders__control"
                aria-label="Mover a la derecha"
                onPointerDown={pressControl('right')}
                onPointerUp={releaseControl('right')}
                onPointerCancel={releaseControl('right')}
                onPointerLeave={releaseControl('right')}
              >
                <ChevronRight />
              </button>
            </div>
            <button
              type="button"
              className="pidetietar-space-invaders__fire"
              aria-label="Disparar"
              onPointerDown={pressControl('fire')}
              onPointerUp={releaseControl('fire')}
              onPointerCancel={releaseControl('fire')}
              onPointerLeave={releaseControl('fire')}
            >
              <Zap />
            </button>
          </>
        )}
        {screen === 'start' && (
          <div className="pidetietar-space-invaders__panel">
            <span>PideTiétar Play</span>
            <h2>Space Invaders</h2>
            <p>Supera los 5 niveles, esquiva las naves kamikaze y derríbalas para ganar bonos.</p>
            <button type="button" onClick={startGame}><Play /> Empezar</button>
            <small>Botones ◀ ▶ para moverte y el rayo para disparar · teclado A/D y Espacio</small>
          </div>
        )}
        {(screen === 'over' || screen === 'won') && (
          <div className="pidetietar-space-invaders__panel">
            <span>{screen === 'won' ? '¡Misión cumplida!' : 'Fin de la partida'}</span>
            <h2>{screen === 'won' ? '¡Victoria espacial!' : '¡Nave alcanzada!'}</h2>
            <p>
              Nivel {stateRef.current?.level ?? 1}/{MAX_LEVELS} · Puntuación: {stateRef.current?.score ?? 0} · Récord: {bestScore}
            </p>
            <button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button>
            <button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>
            {saving && <small>Guardando puntuación…</small>}
          </div>
        )}
      </div>
    </section>
  );
}
