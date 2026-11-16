import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, Play, RotateCcw, X, Zap } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './AsteroidsHtml5Game.css';

interface AsteroidsHtml5GameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'paused' | 'over';
type ControlKey = 'left' | 'right' | 'thrust' | 'fire';
type AsteroidKind = 'rock' | 'special';

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  spin: number;
  kind: AsteroidKind;
  palette: number;
  shape: number;
}
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }
interface Ship { x: number; y: number; angle: number; vx: number; vy: number; thrusting: boolean; }
interface Aviso { text: string; until: number; tone: 'nivel' | 'arma' | 'vida'; }
interface Star { x: number; y: number; r: number; alpha: number; phase: number; }
interface Sparkle { x: number; y: number; r: number; phase: number; }

interface SpaceState {
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  score: number;
  lives: number;
  level: number;
  weapon: number;
  lastTime: number;
  fireCooldown: number;
  ended: boolean;
  victory: boolean;
  invulnerableUntil: number;
  flashUntil: number;
  message: Aviso | null;
}

const WIDTH = 780;
const HEIGHT = 780;
const SHIP_RADIUS = 13;
const MAX_BULLETS = 12;
const SPECIALS_POR_NIVEL = 2;
const ARMA_MAXIMA = 4;
const HORIZONTE = HEIGHT * 0.72;

/* 5 niveles: cada uno trae más cristales y van un 10 % más rápidos. */
const LEVELS = [
  { rocas: 8, velocidad: 1 },
  { rocas: 10, velocidad: 1.1 },
  { rocas: 12, velocidad: 1.2 },
  { rocas: 14, velocidad: 1.3 },
  { rocas: 16, velocidad: 1.4 },
] as const;

/* Niveles de arma: cadencia, después doble y triple disparo. */
const ARMAS = [
  { cooldown: 0.22, angulos: [0] },
  { cooldown: 0.14, angulos: [0] },
  { cooldown: 0.17, angulos: [-0.08, 0.08] },
  { cooldown: 0.16, angulos: [-0.16, 0, 0.16] },
];

const PALETTES = [
  { rim: '#c084fc', light: '#f3e8ff', mid: '#8b5cf6', deep: '#3b0f6b' },
  { rim: '#67e8f9', light: '#cffafe', mid: '#06b6d4', deep: '#083344' },
  { rim: '#fdba74', light: '#ffedd5', mid: '#f97316', deep: '#431407' },
  { rim: '#f9a8d4', light: '#fce7f3', mid: '#ec4899', deep: '#4a0d2b' },
];

const SHAPES = [
  [1, 0.84, 1.04, 0.92, 0.86, 1.02, 0.9, 1.06, 0.88, 0.98],
  [0.9, 1.05, 0.88, 1.03, 0.92, 0.85, 1.06, 0.9, 1.02, 0.87],
  [1.02, 0.9, 0.86, 1.05, 0.94, 1.03, 0.87, 0.98, 1.06, 0.9],
  [0.88, 1.02, 0.94, 0.86, 1.04, 0.9, 1.05, 0.88, 1, 1.03],
];

const wrap = (value: number, max: number) => ((value % max) + max) % max;
const levelConfig = (level: number) => LEVELS[Math.min(LEVELS.length, Math.max(1, level)) - 1];
const newShip = (): Ship => ({ x: WIDTH / 2, y: HEIGHT / 2, angle: -Math.PI / 2, vx: 0, vy: 0, thrusting: false });

const newAsteroid = (
  radius: number,
  x: number,
  y: number,
  velocidad: number,
  kind: AsteroidKind = 'rock',
): Asteroid => {
  const angle = Math.random() * Math.PI * 2;
  const speed = (28 + Math.random() * 40) * velocidad;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.7,
    kind,
    palette: Math.floor(Math.random() * PALETTES.length),
    shape: Math.floor(Math.random() * SHAPES.length),
  };
};

/** Un nivel = una oleada con 2 cristales dorados que mejoran el arma. */
const spawnWave = (level: number): Asteroid[] => {
  const config = levelConfig(level);
  const total = config.rocas + SPECIALS_POR_NIVEL;
  const especiales = new Set<number>();
  while (especiales.size < SPECIALS_POR_NIVEL) especiales.add(Math.floor(Math.random() * total));
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < total; i += 1) {
    let x = 0;
    let y = 0;
    let intentos = 0;
    do {
      x = 46 + Math.random() * (WIDTH - 92);
      y = 46 + Math.random() * (HEIGHT - 92);
      intentos += 1;
    } while (Math.hypot(x - WIDTH / 2, y - HEIGHT / 2) < 145 && intentos < 40);
    asteroids.push(newAsteroid(24 + Math.random() * 12, x, y, config.velocidad, especiales.has(i) ? 'special' : 'rock'));
  }
  return asteroids;
};

const createState = (): SpaceState => ({
  ship: newShip(),
  asteroids: spawnWave(1),
  bullets: [],
  score: 0,
  lives: 3,
  level: 1,
  weapon: 1,
  lastTime: performance.now(),
  fireCooldown: 0,
  ended: false,
  victory: false,
  invulnerableUntil: performance.now() + 1200,
  flashUntil: 0,
  message: { text: '¡Nivel 1!', until: performance.now() + 1500, tone: 'nivel' },
});

// ---------------------------------------------------------------------------
// Sprites cacheados: cristales, nave y balas se pintan una vez por tamaño.
// ---------------------------------------------------------------------------
const spriteCache = new Map<string, HTMLCanvasElement>();

const bucketRadius = (radius: number) => Math.max(12, Math.round(radius / 4) * 4);

const buildAsteroidSprite = (
  kind: AsteroidKind,
  palette: number,
  radius: number,
  shapeIndex: number,
): HTMLCanvasElement => {
  const pad = Math.ceil(radius * 0.75) + 6;
  const size = Math.ceil((radius + pad) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(size / 2, size / 2);
  const shape = SHAPES[shapeIndex % SHAPES.length];

  ctx.beginPath();
  shape.forEach((factor, index) => {
    const angle = (index / shape.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius * factor;
    const y = Math.sin(angle) * radius * factor;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  if (kind === 'special') {
    const fill = ctx.createLinearGradient(-radius, -radius, radius, radius);
    fill.addColorStop(0, '#fff4c2');
    fill.addColorStop(0.42, '#ffc233');
    fill.addColorStop(1, '#b4310a');
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(255, 196, 70, .95)';
    ctx.shadowBlur = 26;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Núcleo de energía.
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.52);
    ctx.lineTo(radius * 0.34, 0);
    ctx.lineTo(0, radius * 0.52);
    ctx.lineTo(-radius * 0.34, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, .92)';
    ctx.shadowColor = 'rgba(255, 250, 205, 1)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    return canvas;
  }

  const colors = PALETTES[palette % PALETTES.length];
  const fill = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.12, 0, 0, radius * 1.06);
  fill.addColorStop(0, colors.light);
  fill.addColorStop(0.42, colors.mid);
  fill.addColorStop(1, colors.deep);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.strokeStyle = colors.rim;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = colors.rim;
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Facetas del cristal.
  ctx.strokeStyle = 'rgba(255, 255, 255, .3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < shape.length; i += 3) {
    const angle = (i / shape.length) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.14, Math.sin(angle) * radius * 0.14);
    ctx.lineTo(Math.cos(angle) * radius * shape[i] * 0.94, Math.sin(angle) * radius * shape[i] * 0.94);
    ctx.stroke();
  }

  // Reflejo superior.
  ctx.strokeStyle = 'rgba(255, 255, 255, .55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.82, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  return canvas;
};

const asteroidSprite = (asteroid: Asteroid): HTMLCanvasElement => {
  const radius = bucketRadius(asteroid.radius);
  const key = `${asteroid.kind}-${asteroid.palette}-${radius}-${asteroid.shape}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const sprite = buildAsteroidSprite(asteroid.kind, asteroid.palette, radius, asteroid.shape);
  spriteCache.set(key, sprite);
  return sprite;
};

const paintBackdrop = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#140a30');
  sky.addColorStop(0.5, '#1c0f4a');
  sky.addColorStop(1, '#2b1166');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = ctx.createRadialGradient(WIDTH / 2, HORIZONTE, 12, WIDTH / 2, HORIZONTE, WIDTH * 0.78);
  glow.addColorStop(0, 'rgba(255, 78, 205, .45)');
  glow.addColorStop(0.32, 'rgba(126, 58, 255, .2)');
  glow.addColorStop(1, 'rgba(18, 6, 54, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Rejilla neón en perspectiva.
  ctx.save();
  ctx.strokeStyle = 'rgba(124, 234, 255, .34)';
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 + i * 16, HORIZONTE);
    ctx.lineTo(WIDTH / 2 + i * 168, HEIGHT + 4);
    ctx.stroke();
  }
  for (let k = 1; k <= 8; k += 1) {
    const t = k / 8;
    const y = HORIZONTE + (HEIGHT - HORIZONTE) * Math.pow(t, 1.9);
    ctx.globalAlpha = 0.12 + t * 0.42;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Brillo del horizonte y desvanecido hacia arriba.
  const linea = ctx.createLinearGradient(0, HORIZONTE - 3, 0, HORIZONTE + 3);
  linea.addColorStop(0, 'rgba(255, 120, 226, 0)');
  linea.addColorStop(0.5, 'rgba(255, 168, 240, .85)');
  linea.addColorStop(1, 'rgba(255, 120, 226, 0)');
  ctx.fillStyle = linea;
  ctx.fillRect(0, HORIZONTE - 3, WIDTH, 6);

  const fade = ctx.createLinearGradient(0, HORIZONTE - 90, 0, HORIZONTE + 10);
  fade.addColorStop(0, 'rgba(24, 12, 60, 0)');
  fade.addColorStop(1, 'rgba(24, 12, 60, .9)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, HORIZONTE - 90, WIDTH, 100);
};

const buildStars = (): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < 70; i += 1) {
    stars.push({
      x: (i * 137.5 + 23) % WIDTH,
      y: (i * 71.3 + 17) % HORIZONTE,
      r: i % 5 === 0 ? 1.8 : 1.1,
      alpha: 0.35 + (i % 4) * 0.16,
      phase: (i % 9) * 0.7,
    });
  }
  return stars;
};

const buildSparkles = (): Sparkle[] => [
  { x: 92, y: 118, r: 9, phase: 0 },
  { x: 268, y: 72, r: 6, phase: 1.4 },
  { x: 520, y: 158, r: 8, phase: 2.3 },
  { x: 690, y: 92, r: 7, phase: 3.4 },
  { x: 624, y: 322, r: 5, phase: 4.1 },
  { x: 148, y: 392, r: 6, phase: 5.2 },
  { x: 350, y: 486, r: 7, phase: 0.8 },
  { x: 706, y: 508, r: 5, phase: 2.9 },
];

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

const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[], sparkles: Sparkle[], now: number) => {
  stars.forEach((star) => {
    const twinkle = 0.55 + 0.45 * Math.sin(now / 700 + star.phase);
    ctx.globalAlpha = star.alpha * twinkle;
    ctx.fillStyle = star.r > 1.5 ? '#dff6ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  sparkles.forEach((sparkle) => {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + sparkle.phase));
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

const drawShip = (ctx: CanvasRenderingContext2D, ship: Ship, ahora: number) => {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (ship.thrusting) {
    const largo = 16 + Math.sin(ahora / 60) * 5;
    const llama = ctx.createLinearGradient(-12, 0, -12 - largo, 0);
    llama.addColorStop(0, 'rgba(220, 254, 255, .95)');
    llama.addColorStop(0.45, 'rgba(90, 214, 255, .7)');
    llama.addColorStop(1, 'rgba(120, 60, 255, 0)');
    ctx.fillStyle = llama;
    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-13 - largo, 0);
    ctx.lineTo(-13, 6);
    ctx.closePath();
    ctx.fill();
  }

  // Motores cian.
  [-7, 7].forEach((offset) => {
    ctx.beginPath();
    ctx.arc(-13, offset, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#9df6ff';
    ctx.shadowColor = 'rgba(103, 232, 249, .95)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Casco.
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-5, -13);
  ctx.lineTo(-12, -6);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-12, 6);
  ctx.lineTo(-5, 13);
  ctx.closePath();
  const hull = ctx.createLinearGradient(0, -13, 0, 13);
  hull.addColorStop(0, '#ffffff');
  hull.addColorStop(0.5, '#eef4ff');
  hull.addColorStop(1, '#b6c6ee');
  ctx.fillStyle = hull;
  ctx.shadowColor = 'rgba(140, 210, 255, .85)';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, .95)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Franjas naranjas.
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(-11, -7);
  ctx.lineTo(-7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, 12);
  ctx.lineTo(-11, 7);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();

  // Cabina.
  ctx.beginPath();
  ctx.ellipse(3, 0, 7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7ef0ff';
  ctx.shadowColor = 'rgba(103, 232, 249, .95)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
};

const drawBullets = (ctx: CanvasRenderingContext2D, bullets: Bullet[]) => {
  bullets.forEach((bullet) => {
    const angle = Math.atan2(bullet.vy, bullet.vx);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(angle);
    const trail = ctx.createLinearGradient(-16, 0, 6, 0);
    trail.addColorStop(0, 'rgba(120, 230, 255, 0)');
    trail.addColorStop(1, 'rgba(255, 246, 176, .9)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(-6, 0, 12, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffbe0';
    ctx.shadowColor = 'rgba(255, 196, 60, 1)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  });
};

const drawAsteroids = (ctx: CanvasRenderingContext2D, asteroids: Asteroid[], ahora: number) => {
  asteroids.forEach((asteroid) => {
    const sprite = asteroidSprite(asteroid);
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);
    if (asteroid.kind === 'special') {
      const pulse = 0.5 + 0.5 * Math.sin(ahora / 240 + asteroid.rotation);
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(0, 0, asteroid.radius * 0.35, 0, 0, asteroid.radius * 2);
      halo.addColorStop(0, `rgba(255, 208, 96, ${0.32 + pulse * 0.22})`);
      halo.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, asteroid.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
  });
};

const drawLifeShip = (ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-5, -6);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#eaf7ff';
    ctx.shadowColor = 'rgba(126, 240, 255, .95)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, .45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
};

const drawHud = (ctx: CanvasRenderingContext2D, state: SpaceState | null, bestScore: number) => {
  const shade = ctx.createLinearGradient(0, 0, 0, 92);
  shade.addColorStop(0, 'rgba(9, 3, 26, .62)');
  shade.addColorStop(1, 'rgba(9, 3, 26, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, 92);

  ctx.save();
  ctx.font = '900 20px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(120, 230, 255, .75)';
  ctx.shadowBlur = 12;
  ctx.fillText(`Puntos ${state?.score ?? 0}`, 20, 34);
  ctx.textAlign = 'right';
  ctx.fillText(`Récord ${bestScore}`, WIDTH - 20, 34);
  ctx.shadowBlur = 0;

  ctx.font = '800 13px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`Nivel ${state?.level ?? 1}/${LEVELS.length}`, 20, 58);
  ctx.restore();

  // Nivel de arma: 4 rombos.
  const weapon = state?.weapon ?? 1;
  for (let i = 0; i < ARMA_MAXIMA; i += 1) {
    const x = 108 + i * 16;
    ctx.beginPath();
    ctx.moveTo(x, 47);
    ctx.lineTo(x + 5, 53);
    ctx.lineTo(x, 59);
    ctx.lineTo(x - 5, 53);
    ctx.closePath();
    const activo = i < weapon;
    ctx.fillStyle = activo ? '#7ef0ff' : 'rgba(255, 255, 255, .18)';
    if (activo) {
      ctx.shadowColor = 'rgba(126, 240, 255, .9)';
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < 3; i += 1) {
    drawLifeShip(ctx, WIDTH - 26 - i * 26, 53, i < (state?.lives ?? 3));
  }
};

const drawMessage = (ctx: CanvasRenderingContext2D, message: Aviso | null, ahora: number) => {
  if (!message || ahora >= message.until) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (message.until - ahora) / 320);
  ctx.font = '900 17px system-ui, -apple-system, "Segoe UI", sans-serif';
  const ancho = ctx.measureText(message.text).width + 42;
  const x = (WIDTH - ancho) / 2;
  roundedPath(ctx, x, 96, ancho, 44, 22);
  ctx.fillStyle = 'rgba(12, 5, 32, .85)';
  ctx.fill();
  const tono = message.tone === 'nivel'
    ? 'rgba(80, 236, 255, .85)'
    : message.tone === 'arma'
      ? 'rgba(255, 206, 84, .9)'
      : 'rgba(255, 90, 130, .85)';
  ctx.strokeStyle = tono;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = message.tone === 'nivel' ? '#a9fbff' : message.tone === 'arma' ? '#ffe9b0' : '#ffd0dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message.text, WIDTH / 2, 119);
  ctx.restore();
};

/** Destello rojo en los bordes al perder una vida. */
const drawHitFlash = (ctx: CanvasRenderingContext2D, ahora: number, until: number) => {
  if (ahora >= until) return;
  const fuerza = (until - ahora) / 420;
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.22, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.78);
  gradient.addColorStop(0, 'rgba(255, 40, 90, 0)');
  gradient.addColorStop(1, `rgba(255, 40, 90, ${0.55 * fuerza})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

export default function AsteroidsHtml5Game({ onClose }: AsteroidsHtml5GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SpaceState | null>(null);
  const screenRef = useRef<Screen>('start');
  const controlsRef = useRef<Set<ControlKey>>(new Set());
  const backdropRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('asteroids-html5', 'pidetietar-game-asteroids-html5-best-v1');

  useEffect(() => { screenRef.current = screen; }, [screen]);

  const finishGame = useCallback((victory: boolean) => {
    const state = stateRef.current;
    if (!state || state.ended) return;
    state.ended = true;
    state.victory = victory;
    controlsRef.current.clear();
    screenRef.current = 'over';
    setScreen('over');
    void saveScore(state.score, state.level);
  }, [saveScore]);

  const startGame = useCallback(() => {
    stateRef.current = createState();
    controlsRef.current.clear();
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  const pressControl = (control: ControlKey) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    controlsRef.current.add(control);
  };
  const releaseControl = (control: ControlKey) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    controlsRef.current.delete(control);
  };

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
    if (!starsRef.current.length) starsRef.current = buildStars();
    if (!sparklesRef.current.length) sparklesRef.current = buildSparkles();
    const stars = starsRef.current;
    const sparkles = sparklesRef.current;

    const fireBullet = (state: SpaceState) => {
      if (state.fireCooldown > 0 || state.bullets.length >= MAX_BULLETS) return;
      const arma = ARMAS[Math.min(ARMAS.length, Math.max(1, state.weapon)) - 1];
      const { ship } = state;
      arma.angulos.forEach((desvio) => {
        const angle = ship.angle + desvio;
        state.bullets.push({
          x: ship.x + Math.cos(angle) * 20,
          y: ship.y + Math.sin(angle) * 20,
          vx: ship.vx + Math.cos(angle) * 345,
          vy: ship.vy + Math.sin(angle) * 345,
          life: 1.15,
        });
      });
      state.fireCooldown = arma.cooldown;
    };

    let frame = 0;
    const draw = (now: number) => {
      // Red de seguridad ante cualquier transformación sin restaurar.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const state = stateRef.current;
      const delta = state ? Math.min(0.035, Math.max(0.008, (now - state.lastTime) / 1000)) : 0.016;
      if (state) state.lastTime = now;

      if (state && screenRef.current === 'playing') {
        const controls = controlsRef.current;
        const ship = state.ship;
        const giro = 3.6 * delta;
        if (controls.has('left')) ship.angle -= giro;
        if (controls.has('right')) ship.angle += giro;
        ship.thrusting = controls.has('thrust');
        if (ship.thrusting) {
          ship.vx += Math.cos(ship.angle) * 130 * delta;
          ship.vy += Math.sin(ship.angle) * 130 * delta;
        }
        if (controls.has('fire')) fireBullet(state);
        state.fireCooldown = Math.max(0, state.fireCooldown - delta);

        const frenado = Math.pow(0.988, delta * 60);
        ship.vx *= frenado;
        ship.vy *= frenado;
        ship.x = wrap(ship.x + ship.vx * delta, WIDTH);
        ship.y = wrap(ship.y + ship.vy * delta, HEIGHT);

        state.bullets.forEach((bullet) => {
          bullet.x = wrap(bullet.x + bullet.vx * delta, WIDTH);
          bullet.y = wrap(bullet.y + bullet.vy * delta, HEIGHT);
          bullet.life -= delta;
        });
        state.bullets = state.bullets.filter((bullet) => bullet.life > 0);

        state.asteroids.forEach((asteroid) => {
          asteroid.x = wrap(asteroid.x + asteroid.vx * delta, WIDTH);
          asteroid.y = wrap(asteroid.y + asteroid.vy * delta, HEIGHT);
          asteroid.rotation += asteroid.spin * delta;
        });

        // Disparos contra cristales.
        const velocidad = levelConfig(state.level).velocidad;
        for (let ai = state.asteroids.length - 1; ai >= 0; ai -= 1) {
          const asteroid = state.asteroids[ai];
          const bulletIndex = state.bullets.findIndex(
            (bullet) => Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < asteroid.radius + 2,
          );
          if (bulletIndex < 0) continue;
          state.bullets.splice(bulletIndex, 1);
          state.asteroids.splice(ai, 1);

          if (asteroid.kind === 'special') {
            if (state.weapon < ARMA_MAXIMA) {
              state.weapon += 1;
              state.score += 80;
              state.message = { text: `¡Arma ${state.weapon}!`, until: now + 1600, tone: 'arma' };
            } else {
              state.score += 120;
              state.message = { text: '¡Arma al máximo! +120', until: now + 1600, tone: 'arma' };
            }
            continue;
          }

          state.score += asteroid.radius > 22 ? 20 : asteroid.radius > 14 ? 35 : 60;
          if (asteroid.radius > 14) {
            const radio = asteroid.radius > 22 ? 17 : 11;
            state.asteroids.push(
              newAsteroid(radio, asteroid.x, asteroid.y, velocidad),
              newAsteroid(radio, asteroid.x, asteroid.y, velocidad),
            );
          }
        }

        // Choque con la nave.
        if (now > state.invulnerableUntil) {
          const golpe = state.asteroids.some(
            (asteroid) => Math.hypot(asteroid.x - ship.x, asteroid.y - ship.y) < asteroid.radius + SHIP_RADIUS,
          );
          if (golpe) {
            state.lives -= 1;
            state.flashUntil = now + 420;
            if (state.lives <= 0) {
              finishGame(false);
            } else {
              state.ship = { ...newShip(), angle: ship.angle };
              state.invulnerableUntil = now + 1800;
              state.message = { text: '¡Vida perdida!', until: now + 1600, tone: 'vida' };
            }
          }
        }

        // Nivel superado.
        if (state.asteroids.length === 0 && !state.ended) {
          if (state.level < LEVELS.length) {
            state.level += 1;
            state.asteroids = spawnWave(state.level);
            state.bullets = [];
            state.ship = newShip();
            state.invulnerableUntil = now + 1500;
            state.message = { text: `¡Nivel ${state.level}!`, until: now + 1800, tone: 'nivel' };
          } else {
            finishGame(true);
          }
        }
      }

      ctx.drawImage(backdrop, 0, 0);
      drawStars(ctx, stars, sparkles, now);
      if (state) drawAsteroids(ctx, state.asteroids, now);
      if (state) drawBullets(ctx, state.bullets);

      const playing = screenRef.current === 'playing';
      const invulnerable = Boolean(state) && playing && now < state!.invulnerableUntil;
      ctx.globalAlpha = invulnerable ? 0.45 + 0.4 * Math.abs(Math.sin(now / 90)) : 1;
      drawShip(ctx, state?.ship ?? newShip(), now);
      ctx.globalAlpha = 1;

      drawHud(ctx, state, bestScore);
      if (state) {
        drawMessage(ctx, state.message, now);
        drawHitFlash(ctx, now, state.flashUntil);
      }

      frame = window.requestAnimationFrame(draw);
    };

    const CONTROL_KEYS: Record<string, ControlKey> = {
      arrowleft: 'left', a: 'left',
      arrowright: 'right', d: 'right',
      arrowup: 'thrust', w: 'thrust',
      ' ': 'fire', f: 'fire',
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose?.(); return; }
      const tecla = event.key.toLowerCase();
      if (tecla === 'p' && (screenRef.current === 'playing' || screenRef.current === 'paused')) {
        const next = screenRef.current === 'playing' ? 'paused' : 'playing';
        screenRef.current = next;
        controlsRef.current.clear();
        setScreen(next);
        return;
      }
      if (tecla === 'r' && screenRef.current === 'over') { startGame(); return; }
      const control = CONTROL_KEYS[tecla];
      if (!control) return;
      event.preventDefault();
      controlsRef.current.add(control);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const control = CONTROL_KEYS[event.key.toLowerCase()];
      if (control) controlsRef.current.delete(control);
    };
    const onBlur = () => controlsRef.current.clear();
    const onPointerDown = () => controlsRef.current.add('fire');
    const onPointerUp = () => controlsRef.current.delete('fire');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [bestScore, finishGame, onClose, startGame]);

  return (
    <section className="pidetietar-asteroids" aria-label="Juego Asteroids">
      <div className="pidetietar-asteroids__stage">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pidetietar-asteroids__canvas" />
        {screen === 'playing' && (
          <div className="pidetietar-asteroids__controls">
            <div className="pidetietar-asteroids__pad">
              <button
                type="button"
                className="pidetietar-asteroids__btn"
                aria-label="Girar a la izquierda"
                onPointerDown={pressControl('left')}
                onPointerUp={releaseControl('left')}
                onPointerCancel={releaseControl('left')}
                onPointerLeave={releaseControl('left')}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="pidetietar-asteroids__btn"
                aria-label="Girar a la derecha"
                onPointerDown={pressControl('right')}
                onPointerUp={releaseControl('right')}
                onPointerCancel={releaseControl('right')}
                onPointerLeave={releaseControl('right')}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="pidetietar-asteroids__pad">
              <button
                type="button"
                className="pidetietar-asteroids__btn"
                aria-label="Avanzar"
                onPointerDown={pressControl('thrust')}
                onPointerUp={releaseControl('thrust')}
                onPointerCancel={releaseControl('thrust')}
                onPointerLeave={releaseControl('thrust')}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                className="pidetietar-asteroids__btn pidetietar-asteroids__btn--fire"
                aria-label="Disparar"
                onPointerDown={pressControl('fire')}
                onPointerUp={releaseControl('fire')}
                onPointerCancel={releaseControl('fire')}
                onPointerLeave={releaseControl('fire')}
              >
                <Zap />
              </button>
            </div>
          </div>
        )}
        {screen === 'start' && (
          <div className="pidetietar-asteroids__panel">
            <span>PideTiétar Play</span>
            <h2>Asteroids</h2>
            <p>Rompe los cristales y esquiva la lluvia. Cada nivel trae dos asteroides dorados que mejoran tu arma.</p>
            <button type="button" onClick={startGame}><Play /> Empezar</button>
            <small>Botones en pantalla o A/D, W y Espacio</small>
          </div>
        )}
        {screen === 'over' && (
          <div className="pidetietar-asteroids__panel">
            <span>{stateRef.current?.victory ? 'Sector despejado' : 'Fin de la partida'}</span>
            <h2>{stateRef.current?.victory ? '¡Misión cumplida!' : '¡Nave destruida!'}</h2>
            <p>Puntuación: {stateRef.current?.score ?? 0} · Nivel {stateRef.current?.level ?? 1}/{LEVELS.length} · Récord: {bestScore}</p>
            <button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button>
            <button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>
            {saving && <small>Guardando puntuación…</small>}
          </div>
        )}
        {screen === 'paused' && <div className="pidetietar-asteroids__pause">Pausa · pulsa P para continuar</div>}
      </div>
    </section>
  );
}
