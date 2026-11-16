import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './FlappyBirdGame.css';

interface FlappyBirdGameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'over';
interface Pipe { x: number; gapY: number; passed: boolean; damaged: boolean; }
interface Aviso { text: string; until: number; tone: 'nivel' | 'vida'; }
interface BirdState {
  y: number; velocity: number; score: number; pipes: Pipe[]; lastTime: number; ended: boolean;
  lives: number; hits: number; level: number; pipesPassed: number;
  invulnerableUntil: number; hitFlashUntil: number; message: Aviso | null;
}
interface Star { x: number; y: number; r: number; alpha: number; phase: number; }
interface Cloud { x: number; y: number; scale: number; alpha: number; speed: number; }

const WIDTH = 460;
const HEIGHT = 600;
const BIRD_X = 120;
const BIRD_RADIUS = 18;
const PIPE_WIDTH = 58;
const PIPE_GAP = 145;
const PIPE_SPEED = 165;
const FLOOR_Y = HEIGHT - 54;
const HORIZON_Y = FLOOR_Y - 118;
const CAP_HEIGHT = 20;
const CAP_EXTRA = 8;

/* Vidas: 3 de partida, 7 golpes gastan una vida y cada nivel regala una (máximo 3). */
const VIDAS_INICIALES = 3;
const VIDAS_MAXIMAS = 3;
const GOLPES_POR_VIDA = 7;
const PIPES_POR_NIVEL = 5;
const NIVEL_MAXIMO = 5;
const INVULNERABLE_MS = 950;

/* Paleta tomada de la portada: cielo índigo, tubo cian arriba y naranja abajo. */
const GRID_RGB = '255, 79, 216';
const PIPE_TOP = { edge: '#05465a', body: '#11b3c9', light: '#2ed3e8', shine: '#c6f8ff', glow: 'rgba(64, 236, 255, .5)' };
const PIPE_BOTTOM = { edge: '#6d2703', body: '#ef6f0a', light: '#ff9a2e', shine: '#ffe3b4', glow: 'rgba(255, 146, 42, .5)' };

const createPipe = (x: number): Pipe => ({ x, gapY: 145 + Math.random() * 220, passed: false, damaged: false });
const createState = (): BirdState => ({
  y: HEIGHT / 2,
  velocity: 0,
  score: 0,
  pipes: [createPipe(WIDTH + 55), createPipe(WIDTH + 300)],
  lastTime: performance.now(),
  ended: false,
  lives: VIDAS_INICIALES,
  hits: 0,
  level: 1,
  pipesPassed: 0,
  invulnerableUntil: 0,
  hitFlashUntil: 0,
  message: null,
});

const roundedPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

const buildStars = (): Star[] => Array.from({ length: 56 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * (HORIZON_Y - 30),
  r: 0.6 + Math.random() * 1.5,
  alpha: 0.35 + Math.random() * 0.55,
  phase: Math.random() * Math.PI * 2,
}));

const buildClouds = (): Cloud[] => [
  { x: 50, y: 92, scale: 1.1, alpha: 0.3, speed: 0.006 },
  { x: 300, y: 156, scale: 0.82, alpha: 0.24, speed: 0.0042 },
  { x: 150, y: 250, scale: 1.3, alpha: 0.22, speed: 0.0075 },
  { x: 360, y: 322, scale: 1, alpha: 0.26, speed: 0.005 },
  { x: 30, y: 374, scale: 0.85, alpha: 0.2, speed: 0.009 },
];

/** Cielo, resplandor del horizonte y rejilla en perspectiva: es estático, así que se pinta una sola vez. */
const paintBackdrop = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, '#150a30');
  sky.addColorStop(0.45, '#2a0f55');
  sky.addColorStop(0.8, '#451579');
  sky.addColorStop(1, '#5c1a86');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HORIZON_Y);

  const halo = ctx.createLinearGradient(0, HORIZON_Y - 96, 0, HORIZON_Y + 6);
  halo.addColorStop(0, 'rgba(190, 60, 255, 0)');
  halo.addColorStop(0.6, 'rgba(200, 70, 255, .22)');
  halo.addColorStop(1, 'rgba(255, 80, 220, .5)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, HORIZON_Y - 96, WIDTH, 102);

  const floor = ctx.createLinearGradient(0, HORIZON_Y, 0, FLOOR_Y);
  floor.addColorStop(0, '#2c0b48');
  floor.addColorStop(1, '#120322');
  ctx.fillStyle = floor;
  ctx.fillRect(0, HORIZON_Y, WIDTH, FLOOR_Y - HORIZON_Y);

  ctx.save();
  ctx.strokeStyle = `rgba(${GRID_RGB}, .8)`;
  ctx.shadowColor = `rgba(${GRID_RGB}, .9)`;
  ctx.shadowBlur = 7;
  ctx.lineWidth = 1.4;
  const depth = FLOOR_Y - HORIZON_Y;
  for (let i = 1; i <= 8; i += 1) {
    const t = i / 8;
    const y = HORIZON_Y + depth * t ** 2.1;
    ctx.globalAlpha = 0.18 + t * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  const vanishX = WIDTH / 2;
  ctx.globalAlpha = 0.5;
  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(vanishX, HORIZON_Y);
    ctx.lineTo(vanishX + i * 108, FLOOR_Y);
    ctx.stroke();
  }
  ctx.restore();

  const band = ctx.createLinearGradient(0, FLOOR_Y, 0, HEIGHT);
  band.addColorStop(0, '#2a0846');
  band.addColorStop(1, '#120322');
  ctx.fillStyle = band;
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

  ctx.strokeStyle = `rgba(${GRID_RGB}, .95)`;
  ctx.shadowColor = `rgba(${GRID_RGB}, 1)`;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(WIDTH, FLOOR_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
};

const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[], now: number) => {
  ctx.fillStyle = '#ffffff';
  stars.forEach((star) => {
    ctx.globalAlpha = star.alpha * (0.6 + 0.4 * Math.sin(now / 700 + star.phase));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Destellos de cuatro puntas, como los de la portada.
  const destellos: Array<[number, number, number]> = [[86, 62, 8], [352, 128, 10], [250, 38, 7], [412, 306, 6]];
  destellos.forEach(([x, y, size], index) => {
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 900 + index * 1.7);
    ctx.fillStyle = '#e9e2ff';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const drawClouds = (ctx: CanvasRenderingContext2D, clouds: Cloud[], now: number) => {
  clouds.forEach((cloud) => {
    const x = ((cloud.x + now * cloud.speed) % (WIDTH + 240)) - 120;
    const s = cloud.scale;
    ctx.fillStyle = `rgba(150, 88, 232, ${cloud.alpha})`;
    ctx.beginPath();
    [[0, 0, 40, 17], [-26, 4, 22, 12], [26, 4, 22, 12], [-8, -9, 20, 14], [12, -7, 18, 12]].forEach(([dx, dy, rx, ry]) => {
      const cx = x + dx * s;
      const cy = cloud.y + dy * s;
      ctx.moveTo(cx + rx * s, cy);
      ctx.ellipse(cx, cy, rx * s, ry * s, 0, 0, Math.PI * 2);
    });
    ctx.fill();
  });
};

const drawPipe = (ctx: CanvasRenderingContext2D, pipe: Pipe, isTop: boolean) => {
  const palette = isTop ? PIPE_TOP : PIPE_BOTTOM;
  const capX = pipe.x - CAP_EXTRA;
  const capW = PIPE_WIDTH + CAP_EXTRA * 2;
  const capY = isTop ? pipe.gapY - CAP_HEIGHT : pipe.gapY + PIPE_GAP;
  const bodyY = isTop ? 0 : pipe.gapY + PIPE_GAP + CAP_HEIGHT;
  const bodyH = Math.max(0, isTop ? capY : HEIGHT - bodyY);

  const cylinder = (x: number, w: number) => {
    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, palette.edge);
    gradient.addColorStop(0.07, palette.body);
    gradient.addColorStop(0.18, palette.light);
    gradient.addColorStop(0.28, palette.shine);
    gradient.addColorStop(0.36, palette.light);
    gradient.addColorStop(0.46, palette.body);
    gradient.addColorStop(0.8, palette.edge);
    gradient.addColorStop(0.96, palette.body);
    return gradient;
  };

  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = cylinder(pipe.x, PIPE_WIDTH);
  ctx.fillRect(pipe.x, bodyY, PIPE_WIDTH, bodyH);

  ctx.shadowBlur = 22;
  ctx.fillStyle = cylinder(capX, capW);
  roundedPath(ctx, capX, capY, capW, CAP_HEIGHT, 7);
  ctx.fill();
  ctx.restore();

  // Contorno y reflejos de la boca del tubo.
  ctx.strokeStyle = 'rgba(0, 0, 0, .28)';
  ctx.lineWidth = 1.2;
  roundedPath(ctx, capX, capY, capW, CAP_HEIGHT, 7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, .55)';
  roundedPath(ctx, capX + 4, capY + 2.5, capW - 8, 3.6, 1.8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, .2)';
  roundedPath(ctx, capX + 4, capY + CAP_HEIGHT - 6, capW - 8, 3.2, 1.6);
  ctx.fill();
};

const drawBird = (ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number, wingAngle: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Cola: abanico de plumas naranjas hacia atrás.
  const plumas: Array<[number, number, number]> = [[-0.5, 30, 9], [-0.12, 36, 10], [0.32, 27, 8]];
  plumas.forEach(([angulo, largo, ancho]) => {
    ctx.save();
    ctx.translate(-13, 1);
    ctx.rotate(angulo);
    ctx.fillStyle = '#ff8a00';
    ctx.beginPath();
    ctx.moveTo(0, -ancho / 2);
    ctx.quadraticCurveTo(-largo * 0.62, -ancho * 0.85, -largo, -ancho * 0.2);
    ctx.quadraticCurveTo(-largo * 0.55, ancho * 0.4, 0, ancho / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 55, 0, .45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // Cresta del moño.
  ctx.fillStyle = '#ff9500';
  [[-7, -25, 4], [1, -29, 4.6], [9, -24, 3.8]].forEach(([cx, cy, masa], index) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, masa, 8.5 - index * 0.6, 0.4 - index * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });

  // Cuerpo.
  ctx.save();
  ctx.shadowColor = 'rgba(255, 196, 0, .55)';
  ctx.shadowBlur = 22;
  const body = ctx.createRadialGradient(-8, -11, 3, 0, 2, 31);
  body.addColorStop(0, '#fffbd0');
  body.addColorStop(0.35, '#ffe45c');
  body.addColorStop(0.72, '#ffd21e');
  body.addColorStop(1, '#f2a800');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120, 60, 0, .24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 21, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Vientre.
  ctx.fillStyle = 'rgba(255, 250, 214, .7)';
  ctx.beginPath();
  ctx.ellipse(7, 9, 14, 8, -0.14, 0, Math.PI * 2);
  ctx.fill();

  // Brillo del lomo.
  ctx.fillStyle = 'rgba(255, 255, 255, .3)';
  ctx.beginPath();
  ctx.ellipse(-3, -12, 9, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Ala: abanico de plumas naranjas sobre el costado.
  const plumasAla: Array<[number, number, number]> = [[0.42, 19, 7], [0.06, 24, 8.5], [-0.3, 18, 6.5]];
  plumasAla.forEach(([angulo, largo, alto]) => {
    ctx.save();
    ctx.translate(-2, 3);
    ctx.rotate(angulo + wingAngle * 0.7);
    ctx.fillStyle = '#ff9d00';
    ctx.beginPath();
    ctx.moveTo(0, -alto / 2);
    ctx.quadraticCurveTo(-largo * 0.72, -alto * 0.6, -largo, 0);
    ctx.quadraticCurveTo(-largo * 0.72, alto * 0.6, 0, alto / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 222, 162, .6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // Ojo.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(9.5, -6, 10, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 60, 0, .3)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#241605';
  ctx.beginPath();
  ctx.arc(11, -6, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(13, -8.3, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, -3.4, 1, 0, Math.PI * 2);
  ctx.fill();

  // Ceja.
  ctx.strokeStyle = '#d9700a';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1, -20);
  ctx.quadraticCurveTo(8, -22, 15, -19);
  ctx.stroke();

  // Pico: dos piezas con la boca en medio.
  ctx.fillStyle = '#ff8a00';
  ctx.beginPath();
  ctx.moveTo(16, -8);
  ctx.quadraticCurveTo(28, -9, 35, -1);
  ctx.quadraticCurveTo(29, 2, 16, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 55, 0, .4)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = '#e2540a';
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.quadraticCurveTo(27, 1.4, 32, 2.4);
  ctx.quadraticCurveTo(26, 9, 15, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
};

const heartPath = (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.moveTo(0, 6.5);
  ctx.bezierCurveTo(-8, 0.5, -8.5, -6, -4.2, -7.6);
  ctx.bezierCurveTo(-1.6, -8.6, 0, -6.6, 0, -5);
  ctx.bezierCurveTo(0, -6.6, 1.6, -8.6, 4.2, -7.6);
  ctx.bezierCurveTo(8.5, -6, 8, 0.5, 0, 6.5);
  ctx.closePath();
};

const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, filled: boolean) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  heartPath(ctx);
  if (filled) {
    const gradient = ctx.createLinearGradient(0, -9, 0, 7);
    gradient.addColorStop(0, '#ff8aa8');
    gradient.addColorStop(1, '#e01e4f');
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(255, 60, 110, .85)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, .6)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, .1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, .38)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
};

/** Marcador: puntos, récord, nivel, corazones y la barra de 7 golpes de la vida actual. */
const drawHud = (ctx: CanvasRenderingContext2D, state: BirdState | null, bestScore: number) => {
  const lives = state?.lives ?? VIDAS_INICIALES;
  const hits = state?.hits ?? 0;
  const level = state?.level ?? 1;

  const sombra = ctx.createLinearGradient(0, 0, 0, 92);
  sombra.addColorStop(0, 'rgba(8, 2, 20, .6)');
  sombra.addColorStop(1, 'rgba(8, 2, 20, 0)');
  ctx.fillStyle = sombra;
  ctx.fillRect(0, 0, WIDTH, 92);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .6)';
  ctx.shadowBlur = 8;
  ctx.font = '900 20px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Puntos ${state?.score ?? 0}`, 18, 34);
  ctx.textAlign = 'right';
  ctx.fillText(`Récord ${bestScore}`, WIDTH - 18, 34);

  ctx.shadowBlur = 4;
  ctx.font = '800 13px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`Nivel ${level}/${NIVEL_MAXIMO}`, 18, 58);
  ctx.restore();

  // Corazones.
  for (let i = 0; i < VIDAS_MAXIMAS; i += 1) {
    drawHeart(ctx, WIDTH - 22 - i * 20, 50, 1.15, i < lives);
  }

  // Barra de vida: 7 segmentos que se vacían con los golpes.
  const segmento = 9;
  const hueco = 3;
  const ancho = GOLPES_POR_VIDA * segmento + (GOLPES_POR_VIDA - 1) * hueco;
  const inicio = WIDTH - 18 - ancho;
  for (let i = 0; i < GOLPES_POR_VIDA; i += 1) {
    const vivo = i < GOLPES_POR_VIDA - hits;
    ctx.fillStyle = vivo ? '#3ef0a8' : 'rgba(255, 255, 255, .16)';
    if (vivo) {
      ctx.shadowColor = 'rgba(62, 240, 168, .8)';
      ctx.shadowBlur = 7;
    }
    roundedPath(ctx, inicio + i * (segmento + hueco), 62, segmento, 7, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
};

const drawMessage = (ctx: CanvasRenderingContext2D, message: Aviso | null, now: number) => {
  if (!message || now >= message.until) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (message.until - now) / 320);
  ctx.font = '900 17px system-ui, -apple-system, "Segoe UI", sans-serif';
  const ancho = ctx.measureText(message.text).width + 42;
  const x = (WIDTH - ancho) / 2;
  roundedPath(ctx, x, 100, ancho, 44, 22);
  ctx.fillStyle = 'rgba(12, 5, 32, .85)';
  ctx.fill();
  ctx.strokeStyle = message.tone === 'nivel' ? 'rgba(80, 236, 255, .85)' : 'rgba(255, 90, 130, .85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = message.tone === 'nivel' ? '#a9fbff' : '#ffd0dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message.text, WIDTH / 2, 123);
  ctx.restore();
};

/** Destello rojo en los bordes cuando el ave recibe un golpe. */
const drawHitFlash = (ctx: CanvasRenderingContext2D, now: number, until: number) => {
  if (now >= until) return;
  const fuerza = (until - now) / 260;
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.24, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.74);
  gradient.addColorStop(0, 'rgba(255, 40, 90, 0)');
  gradient.addColorStop(1, `rgba(255, 40, 90, ${0.5 * fuerza})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

export default function FlappyBirdGame({ onClose }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BirdState | null>(null);
  const screenRef = useRef<Screen>('start');
  const backdropRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('flappy-bird', 'pidetietar-game-flappy-bird-best-v1');

  useEffect(() => { screenRef.current = screen; }, [screen]);

  const finishGame = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.ended) return;
    state.ended = true;
    screenRef.current = 'over';
    setScreen('over');
    void saveScore(state.score, state.level);
  }, [saveScore]);

  const startGame = useCallback(() => {
    stateRef.current = createState();
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  const flap = useCallback(() => {
    const state = stateRef.current;
    if (!state || screenRef.current !== 'playing') return;
    state.velocity = -330;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    if (!starsRef.current.length) starsRef.current = buildStars();
    if (!cloudsRef.current.length) cloudsRef.current = buildClouds();
    if (!backdropRef.current) {
      const backdrop = document.createElement('canvas');
      backdrop.width = WIDTH;
      backdrop.height = HEIGHT;
      paintBackdrop(backdrop);
      backdropRef.current = backdrop;
    }
    const backdrop = backdropRef.current;
    const stars = starsRef.current;
    const clouds = cloudsRef.current;

    let frame = 0;

    /** Un golpe resta 1/7 de la barra; a los 7 se pierde una vida y el ave vuelve al centro. */
    const golpear = (state: BirdState, momento: number, empuje = 0) => {
      state.hits += 1;
      state.hitFlashUntil = momento + 260;
      state.invulnerableUntil = momento + INVULNERABLE_MS;
      if (empuje) state.velocity = empuje;
      if (state.hits < GOLPES_POR_VIDA) return;
      state.hits = 0;
      state.lives -= 1;
      if (state.lives <= 0) { finishGame(); return; }
      state.y = HEIGHT / 2;
      state.velocity = 0;
      state.pipes = [createPipe(WIDTH + 60), createPipe(WIDTH + 330)];
      state.message = { text: '¡Has perdido una vida!', until: momento + 1600, tone: 'vida' };
      state.invulnerableUntil = momento + 1700;
    };

    const draw = (now: number) => {
      // Red de seguridad: si algún dibujo deja una transformación sin restaurar,
      // el siguiente fotograma no debe arrastrarla.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const state = stateRef.current;
      const delta = state ? Math.min(0.035, Math.max(0.008, (now - state.lastTime) / 1000)) : 0.016;
      if (state) state.lastTime = now;

      if (state && screenRef.current === 'playing') {
        const puedeDanio = () => now > state.invulnerableUntil;
        state.velocity += 850 * delta;
        state.y += state.velocity * delta;
        const speed = PIPE_SPEED * (1 + 0.05 * (state.level - 1));
        state.pipes.forEach((pipe) => { pipe.x -= speed * delta; });
        const last = state.pipes[state.pipes.length - 1];
        if (last && last.x < WIDTH - 190) state.pipes.push(createPipe(WIDTH + 35));
        state.pipes = state.pipes.filter((pipe) => pipe.x > -70);
        state.pipes.forEach((pipe) => {
          const hitX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
          const clearGap = state.y - BIRD_RADIUS > pipe.gapY && state.y + BIRD_RADIUS < pipe.gapY + PIPE_GAP;
          if (hitX && !clearGap) pipe.damaged = true;

          // Un tubo en el que te has estrellado no da puntos ni cuenta para el nivel.
          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            if (!pipe.damaged) {
              state.score += 10;
              state.pipesPassed += 1;
              const nivel = Math.min(NIVEL_MAXIMO, 1 + Math.floor(state.pipesPassed / PIPES_POR_NIVEL));
              if (nivel > state.level) {
                state.level = nivel;
                state.lives = Math.min(VIDAS_MAXIMAS, state.lives + 1);
                state.message = { text: `¡Nivel ${nivel}! +1 vida`, until: now + 1700, tone: 'nivel' };
              }
            }
          }

          if (!(hitX && !clearGap) || !puedeDanio()) return;
          // Lo empujamos al interior del hueco para que el golpe no se repita dentro del tubo.
          state.y = state.y < pipe.gapY ? pipe.gapY + BIRD_RADIUS + 4 : pipe.gapY + PIPE_GAP - BIRD_RADIUS - 4;
          state.velocity = 0;
          golpear(state, now);
        });
        if (state.y > FLOOR_Y) {
          state.y = FLOOR_Y;
          if (puedeDanio()) golpear(state, now, -340);
        } else if (state.y < BIRD_RADIUS) {
          state.y = BIRD_RADIUS;
          if (puedeDanio()) golpear(state, now, 60);
        }
      }

      ctx.drawImage(backdrop, 0, 0);
      drawStars(ctx, stars, now);
      drawClouds(ctx, clouds, now);

      state?.pipes.forEach((pipe) => {
        drawPipe(ctx, pipe, true);
        drawPipe(ctx, pipe, false);
      });

      const playing = screenRef.current === 'playing';
      const birdY = state ? state.y : HEIGHT / 2 + Math.sin(now / 420) * 6;
      const tilt = playing && state
        ? Math.max(-0.32, Math.min(0.55, state.velocity / 620))
        : Math.sin(now / 520) * 0.08;
      // Parpadeo mientras es invulnerable, como aviso de que acaba de recibir un golpe.
      const herido = Boolean(state) && playing && now < state!.invulnerableUntil;
      ctx.globalAlpha = herido ? 0.45 + 0.35 * Math.abs(Math.sin(now / 90)) : 1;
      drawBird(ctx, BIRD_X, birdY, tilt, Math.sin(now / 95) * 0.45);
      ctx.globalAlpha = 1;

      drawHud(ctx, state, bestScore);
      drawMessage(ctx, state?.message ?? null, now);
      drawHitFlash(ctx, now, state?.hitFlashUntil ?? 0);

      frame = window.requestAnimationFrame(draw);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose?.(); return; } if (event.key === ' ' || event.key === 'ArrowUp') { event.preventDefault(); flap(); } };
    window.addEventListener('keydown', onKeyDown); canvas.addEventListener('pointerdown', flap); frame = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); canvas.removeEventListener('pointerdown', flap); };
  }, [bestScore, finishGame, flap, onClose]);

  return (
    <section className="pidetietar-flappy" aria-label="Juego Flappy Bird">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pidetietar-flappy__canvas" />
      {screen === 'start' && <div className="pidetietar-flappy__panel"><span>PideTiétar Play</span><h2>Flappy Bird</h2><p>Empiezas con 3 vidas y 7 golpes por vida. Cada nivel te regala una vida extra.</p><button type="button" onClick={startGame}><Play /> Empezar</button><small>Espacio, flecha arriba o toque para volar</small></div>}
      {screen === 'over' && <div className="pidetietar-flappy__panel"><span>Fin de la partida</span><h2>¡Sigue volando!</h2><p>Puntuación: {stateRef.current?.score ?? 0} · Nivel {stateRef.current?.level ?? 1}/5 · Récord: {bestScore}</p><button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button><button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>{saving && <small>Guardando puntuación…</small>}</div>}
    </section>
  );
}
