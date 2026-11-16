import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './BreakoutGame.css';

interface BreakoutGameProps {
  onClose?: () => void;
}

type BreakoutScreen = 'start' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'won';

interface Brick {
  row: number;
  col: number;
  alive: boolean;
  /** Bloque neón: al romperse revienta uno a cada lado y el de detrás. */
  special: boolean;
  /** Momento (ms) en que se convirtió en especial, para animar el pulso. */
  bornAt: number;
}

interface Burst {
  x: number;
  y: number;
  startedAt: number;
}

interface BreakoutState {
  level: number;
  ballX: number;
  ballY: number;
  ballDx: number;
  ballDy: number;
  paddleX: number;
  score: number;
  lives: number;
  bricks: Brick[];
  /** Unidades lógicas que ha descendido todo el muro de bloques. */
  fieldDrop: number;
  /** Descenso en unidades lógicas por segundo. */
  dropSpeed: number;
  /** Momento del último bloque especial creado. */
  lastSpecialAt: number;
  /** Milisegundos de juego acumulados en este nivel (la pausa no cuenta). */
  playTime: number;
  /** Ya se aplicó el +50 % de los 30 s. */
  boosted: boolean;
  /** Momento del aviso «la bola acelera» (0 = todavía no). */
  boostedAt: number;
  lastTime: number;
  ended: boolean;
  reason: 'lives' | 'crush' | null;
  bursts: Burst[];
}

/**
 * Ancho lógico fijo: la física y los tamaños se expresan en estas unidades.
 * El alto lógico NO es fijo: se calcula con el tamaño real del lienzo, así el
 * campo de juego ocupa todo el alto disponible (más largo arriba y abajo).
 */
interface BreakoutGeometry {
  width: number;
  height: number;
  /** Píxeles CSS por unidad lógica. */
  scale: number;
  marginX: number;
  hudHeight: number;
  paddleY: number;
  brickTop: number;
  brickWidth: number;
  brickHeight: number;
  brickGap: number;
}

interface BrickPalette {
  top: string;
  mid: string;
  bottom: string;
  rim: string;
  glow: string;
}

const LOGICAL_WIDTH = 810;
const PADDLE_WIDTH = 118;
const PADDLE_HEIGHT = 14;
const BALL_RADIUS = 10;
/** 8 filas × 9 columnas = 72 bloques (antes 45: un 60 % más). */
const BRICK_ROWS = 8;
const BRICK_COLUMNS = 9;
const BRICK_ASPECT = 0.4;
/** Margen lateral en píxeles CSS: deja libres los laterales del marco. */
const SIDE_PADDING_CSS = 18;
/** Franja superior (en píxeles CSS) reservada al marcador. */
const HUD_HEIGHT_CSS = 46;
const HUD_PADDING_CSS = 18;
const PADDLE_BOTTOM_LOGICAL = 56;
const BRICK_SCORE = 10;
const SPECIAL_SCORE = 30;
/** Cada 15 s un bloque al azar se convierte en especial neón. */
const SPECIAL_INTERVAL_MS = 15000;
/** A los 30 s de juego de cada nivel la bola pega otro estirón del 50 %. */
const SPEED_BOOST_AFTER_MS = 30000;
const SPEED_BOOST_FACTOR = 1.5;
const SPEED_BOOST_NOTICE_MS = 2400;
const BURST_MS = 520;

/** Colores neón del icono del juego: cian, magenta, naranja y violeta. */
const BRICK_PALETTE: BrickPalette[] = [
  { top: '#c8f8ff', mid: '#25c9ff', bottom: '#0a63c8', rim: '#a9edff', glow: '#00d4ff' }, // cian
  { top: '#ffc9e8', mid: '#ff3d9e', bottom: '#b4006b', rim: '#ffa8d4', glow: '#ff2d95' }, // magenta
  { top: '#ffe3a8', mid: '#ff9b21', bottom: '#c25000', rim: '#ffcf87', glow: '#ff9500' }, // naranja
  { top: '#ead0ff', mid: '#a94bff', bottom: '#6a1bbd', rim: '#d9a8ff', glow: '#a855f7' }, // violeta
  { top: '#ccffe0', mid: '#2dff8f', bottom: '#00a84f', rim: '#a4ffc7', glow: '#39ff88' }, // verde
  { top: '#fff6bc', mid: '#ffd400', bottom: '#c99a00', rim: '#ffec9c', glow: '#ffd400' }, // amarillo
  { top: '#ffcfcf', mid: '#ff4d4d', bottom: '#b81414', rim: '#ffaaaa', glow: '#ff4d4d' }, // rojo
  { top: '#cfdbff', mid: '#4f7cff', bottom: '#1c3fb0', rim: '#a8bdff', glow: '#4f7cff' }, // azul
];

const SPECIAL_PALETTE: BrickPalette = {
  top: '#ff7ae0',
  mid: '#ffffff',
  bottom: '#19d4ff',
  rim: '#ffffff',
  glow: '#00e5ff',
};

interface LevelConfig {
  /** Multiplicador de velocidad de la bola. */
  ballSpeed: number;
  /** Segundos que tarda el muro en llegar a la pala. 0 = ese nivel no aplasta. */
  dropSeconds: number;
}

/** La bola va un 50 % más rápida que antes, otro 30 % más y acelera un 5 % por nivel. */
const BALL_SPEED_BASE = 1.95;
const BALL_SPEED_STEP = 1.05;
/** El nivel 1 no aplasta; desde el 2 el muro es un 5 % más rápido en cada nivel. */
const CRUSH_BASE_SECONDS = 65;
const CRUSH_STEP = 1.05;
const LEVEL_COUNT = 5;

const LEVELS: LevelConfig[] = Array.from({ length: LEVEL_COUNT }, (_, index) => ({
  ballSpeed: BALL_SPEED_BASE * BALL_SPEED_STEP ** index,
  dropSeconds: index === 0 ? 0 : CRUSH_BASE_SECONDS / CRUSH_STEP ** (index - 1),
}));

const buildGeometry = (cssWidth: number, cssHeight: number): BreakoutGeometry => {
  const scale = Math.max(0.15, cssWidth / LOGICAL_WIDTH);
  const width = LOGICAL_WIDTH;
  const height = Math.max(300, cssHeight / scale);
  const marginX = SIDE_PADDING_CSS / scale;
  const hudHeight = HUD_HEIGHT_CSS / scale;
  const brickGap = Math.max(6, width * 0.011);
  const brickWidth = (width - marginX * 2 - brickGap * (BRICK_COLUMNS - 1)) / BRICK_COLUMNS;
  const paddleY = Math.max(hudHeight + brickWidth, height - PADDLE_BOTTOM_LOGICAL);
  const brickTop = hudHeight + brickGap;
  // Los bloques nunca invaden la zona de juego: como mucho ocupan el 72 % del hueco.
  const freeSpace = paddleY - brickTop - brickGap * (BRICK_ROWS + 1);
  const maxBrickHeight = (freeSpace * 0.72) / BRICK_ROWS;
  const brickHeight = Math.max(6, Math.min(brickWidth * BRICK_ASPECT, maxBrickHeight));

  return { width, height, scale, marginX, hudHeight, paddleY, brickTop, brickWidth, brickHeight, brickGap };
};

const brickLeft = (geometry: BreakoutGeometry, col: number) =>
  geometry.marginX + col * (geometry.brickWidth + geometry.brickGap);

const brickBottom = (geometry: BreakoutGeometry, row: number, drop: number) =>
  geometry.brickTop + row * (geometry.brickHeight + geometry.brickGap) + geometry.brickHeight + drop;

const clampPaddle = (x: number, geometry: BreakoutGeometry) =>
  Math.max(geometry.marginX, Math.min(geometry.width - geometry.marginX - PADDLE_WIDTH, x));

const createBricks = (): Brick[] => Array.from(
  { length: BRICK_ROWS * BRICK_COLUMNS },
  (_, index) => ({
    row: Math.floor(index / BRICK_COLUMNS),
    col: index % BRICK_COLUMNS,
    alive: true,
    special: false,
    bornAt: 0,
  }),
);

/** Distancia que puede bajar el muro antes de aplastar la pala. */
const crushDistance = (geometry: BreakoutGeometry) => Math.max(
  90,
  geometry.paddleY - brickBottom(geometry, BRICK_ROWS - 1, 0) - BALL_RADIUS,
);

const createState = (
  level: number,
  score: number,
  lives: number,
  geometry: BreakoutGeometry,
): BreakoutState => ({
  level,
  ballX: geometry.width / 2,
  ballY: geometry.paddleY - BALL_RADIUS * 3,
  ballDx: 2.5,
  ballDy: -2.8,
  paddleX: clampPaddle((geometry.width - PADDLE_WIDTH) / 2, geometry),
  score,
  lives,
  bricks: createBricks(),
  fieldDrop: 0,
  dropSpeed: LEVELS[level - 1].dropSeconds > 0
    ? crushDistance(geometry) / LEVELS[level - 1].dropSeconds
    : 0,
  lastSpecialAt: performance.now(),
  playTime: 0,
  boosted: false,
  boostedAt: 0,
  lastTime: performance.now(),
  ended: false,
  reason: null,
  bursts: [],
});

const roundedPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

/** Genera una vez el bloque brillante (bisel + reflejo + borde neón). */
const buildBrickSprite = (palette: BrickPalette, wPx: number, hPx: number): HTMLCanvasElement => {
  const sprite = document.createElement('canvas');
  sprite.width = Math.max(2, Math.round(wPx));
  sprite.height = Math.max(2, Math.round(hPx));
  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;

  const w = sprite.width;
  const h = sprite.height;
  const radius = Math.max(2, h * 0.3);

  // Halo exterior neón
  ctx.save();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = h * 0.55;
  roundedPath(ctx, 1, 1, w - 2, h - 2, radius);
  ctx.fillStyle = palette.bottom;
  ctx.fill();
  ctx.restore();

  // Cuerpo con gradiente vertical
  const body = ctx.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, palette.top);
  body.addColorStop(0.42, palette.mid);
  body.addColorStop(1, palette.bottom);
  roundedPath(ctx, 0, 0, w, h, radius);
  ctx.fillStyle = body;
  ctx.fill();

  // Reflejo glossy de la mitad superior
  const gloss = ctx.createLinearGradient(0, h * 0.06, 0, h * 0.58);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  gloss.addColorStop(0.6, 'rgba(255, 255, 255, 0.18)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  roundedPath(ctx, w * 0.06, h * 0.09, w * 0.88, h * 0.48, radius * 0.75);
  ctx.fillStyle = gloss;
  ctx.fill();

  // Borde luminoso
  roundedPath(ctx, w * 0.02, h * 0.04, w * 0.96, h * 0.92, radius * 0.95);
  ctx.strokeStyle = palette.rim;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, h * 0.07);
  ctx.stroke();
  ctx.globalAlpha = 1;

  return sprite;
};

export default function BreakoutGame({ onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BreakoutState | null>(null);
  const geometryRef = useRef<BreakoutGeometry>(buildGeometry(LOGICAL_WIDTH, 540));
  const screenRef = useRef<BreakoutScreen>('start');
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const spriteKeyRef = useRef('');
  const [screen, setScreen] = useState<BreakoutScreen>('start');
  const { bestScore, saving, saveScore } = useGameScore('breakout', 'pidetietar-game-breakout-best-v1');

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const finishGame = useCallback((nextScreen: 'gameover' | 'won') => {
    const state = stateRef.current;
    if (!state || state.ended) return;
    state.ended = true;
    screenRef.current = nextScreen;
    setScreen(nextScreen);
    void saveScore(state.score, state.level);
  }, [saveScore]);

  const startGame = useCallback(() => {
    stateRef.current = createState(1, 0, 3, geometryRef.current);
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  const nextLevel = useCallback(() => {
    const previous = stateRef.current;
    const level = Math.min(LEVEL_COUNT, (previous?.level ?? 1) + 1);
    stateRef.current = createState(
      level,
      previous?.score ?? 0,
      previous?.lives ?? 3,
      geometryRef.current,
    );
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frame = 0;
    let box = { width: canvas.clientWidth, height: canvas.clientHeight };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) box = { width: rect.width, height: rect.height };
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(canvas);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    const movePaddle = (clientX: number) => {
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
      state.paddleX = clampPaddle(x - PADDLE_WIDTH / 2, geometryRef.current);
    };

    const spriteFor = (key: string, palette: BrickPalette, wPx: number, hPx: number) => {
      const cached = spriteCacheRef.current.get(key);
      if (cached) return cached;
      const sprite = buildBrickSprite(palette, wPx, hPx);
      spriteCacheRef.current.set(key, sprite);
      return sprite;
    };

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const pixelWidth = Math.max(1, Math.round(box.width * dpr));
      const pixelHeight = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const geometry = buildGeometry(box.width, box.height);
      geometryRef.current = geometry;

      // Un cambio de tamaño invalida los sprites (se generan a tamaño real).
      const spriteKey = `${dpr}|${Math.round(geometry.brickWidth * geometry.scale * dpr)}x${Math.round(geometry.brickHeight * geometry.scale * dpr)}`;
      if (spriteKeyRef.current !== spriteKey) {
        spriteKeyRef.current = spriteKey;
        spriteCacheRef.current.clear();
      }

      const state = stateRef.current;
      const delta = state ? Math.min(2.2, Math.max(0.4, (now - state.lastTime) / 16.67)) : 1;
      if (state) state.lastTime = now;

      const leftBound = geometry.marginX + BALL_RADIUS;
      const rightBound = geometry.width - geometry.marginX - BALL_RADIUS;
      const topBound = geometry.hudHeight + BALL_RADIUS;

      ctx.setTransform(dpr * geometry.scale, 0, 0, dpr * geometry.scale, 0, 0);

      const background = ctx.createLinearGradient(0, 0, geometry.width, geometry.height);
      background.addColorStop(0, '#061432');
      background.addColorStop(0.55, '#14104a');
      background.addColorStop(1, '#32104e');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, geometry.width, geometry.height);

      ctx.strokeStyle = 'rgba(0, 229, 255, .08)';
      ctx.lineWidth = 1;
      const gridStep = 48;
      for (let x = 0; x < geometry.width; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, geometry.height); ctx.stroke();
      }
      for (let y = 0; y < geometry.height; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(geometry.width, y); ctx.stroke();
      }

      if (state && screenRef.current === 'playing' && !state.ended) {
        // Tiempo de juego del nivel: la pausa no cuenta para los 30 s del +50 %.
        state.playTime += delta * 16.67;
        if (!state.boosted && state.playTime >= SPEED_BOOST_AFTER_MS) {
          state.boosted = true;
          state.boostedAt = now;
        }

        // En campos largos la bola viaja más despacio en proporción: se compensa.
        const pace = Math.min(2.4, Math.max(1, geometry.height / 760))
          * LEVELS[state.level - 1].ballSpeed
          * (state.boosted ? SPEED_BOOST_FACTOR : 1);
        state.ballX += state.ballDx * delta * pace;
        state.ballY += state.ballDy * delta * pace;

        if (state.ballX < leftBound) { state.ballX = leftBound; state.ballDx = Math.abs(state.ballDx); }
        if (state.ballX > rightBound) { state.ballX = rightBound; state.ballDx = -Math.abs(state.ballDx); }
        if (state.ballY < topBound) { state.ballY = topBound; state.ballDy = Math.abs(state.ballDy); }

        if (
          state.ballDy > 0
          && state.ballY + BALL_RADIUS >= geometry.paddleY
          && state.ballY - BALL_RADIUS <= geometry.paddleY + PADDLE_HEIGHT
          && state.ballX >= state.paddleX - BALL_RADIUS
          && state.ballX <= state.paddleX + PADDLE_WIDTH + BALL_RADIUS
        ) {
          state.ballY = geometry.paddleY - BALL_RADIUS;
          state.ballDy = -Math.abs(state.ballDy);
          const offset = (state.ballX - (state.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
          const kick = Math.max(-1, Math.min(1, offset)) * 3.2;
          // Evita una bola completamente vertical que nunca vuelva a bajar.
          state.ballDx = Math.abs(kick) < 0.9 ? (kick < 0 ? -0.9 : 0.9) : kick;
        }

        if (state.ballY - BALL_RADIUS > geometry.height) {
          state.lives -= 1;
          if (state.lives <= 0) {
            state.reason = 'lives';
            finishGame('gameover');
          } else {
            state.ballX = geometry.width / 2;
            state.ballY = geometry.paddleY - BALL_RADIUS * 3;
            state.ballDx = 2.5;
            state.ballDy = -2.8;
          }
        }

        // El muro desciende (desde el nivel 2): si llega a la pala, aplasta.
        if (state.dropSpeed > 0) {
          state.fieldDrop += state.dropSpeed * (delta * 16.67 / 1000);
          if (brickBottom(geometry, BRICK_ROWS - 1, state.fieldDrop) >= geometry.paddleY - PADDLE_HEIGHT) {
            state.reason = 'crush';
            finishGame('gameover');
          }
        }

        // Un bloque neón nuevo cada 15 s.
        if (now - state.lastSpecialAt >= SPECIAL_INTERVAL_MS) {
          const candidates = state.bricks.filter((brick) => brick.alive && !brick.special);
          if (candidates.length > 0) {
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            chosen.special = true;
            chosen.bornAt = now;
            state.lastSpecialAt = now;
          }
        }

        // Destruye un bloque. Si es especial arrastra a izquierda, derecha y detrás.
        const destroyBrick = (initial: Brick) => {
          const queue: Brick[] = [initial];
          while (queue.length > 0) {
            const brick = queue.shift();
            if (!brick || !brick.alive) continue;
            brick.alive = false;
            state.score += brick.special ? SPECIAL_SCORE : BRICK_SCORE;
            if (!brick.special) continue;
            state.bursts.push({
              x: brickLeft(geometry, brick.col) + geometry.brickWidth / 2,
              y: geometry.brickTop
                + brick.row * (geometry.brickHeight + geometry.brickGap)
                + geometry.brickHeight / 2
                + state.fieldDrop,
              startedAt: now,
            });
            const neighbours = [
              { row: brick.row, col: brick.col - 1 },
              { row: brick.row, col: brick.col + 1 },
              { row: brick.row - 1, col: brick.col },
            ];
            for (const position of neighbours) {
              if (position.row < 0 || position.col < 0 || position.col >= BRICK_COLUMNS) continue;
              const neighbour = state.bricks[position.row * BRICK_COLUMNS + position.col];
              if (neighbour && neighbour.alive) queue.push(neighbour);
            }
          }
        };

        let remaining = 0;
        for (const brick of state.bricks) {
          if (!brick.alive) continue;
          remaining += 1;
          const bx = brickLeft(geometry, brick.col);
          const by = geometry.brickTop + brick.row * (geometry.brickHeight + geometry.brickGap) + state.fieldDrop;
          if (
            state.ballX + BALL_RADIUS >= bx
            && state.ballX - BALL_RADIUS <= bx + geometry.brickWidth
            && state.ballY + BALL_RADIUS >= by
            && state.ballY - BALL_RADIUS <= by + geometry.brickHeight
          ) {
            destroyBrick(brick);
            state.ballDy *= -1;
          }
        }

        if (remaining === 0) {
          if (state.level >= LEVEL_COUNT) {
            finishGame('won');
          } else {
            state.ended = true;
            screenRef.current = 'levelup';
            setScreen('levelup');
          }
        }
      }

      // Bloques (también en pausa, para que el campo no parpadee).
      if (state) {
        const wPx = geometry.brickWidth * geometry.scale * dpr;
        const hPx = geometry.brickHeight * geometry.scale * dpr;
        for (let row = 0; row < BRICK_ROWS; row += 1) {
          const y = geometry.brickTop + row * (geometry.brickHeight + geometry.brickGap) + state.fieldDrop;
          if (y > geometry.height) continue;
          const palette = BRICK_PALETTE[row % BRICK_PALETTE.length];
          const sprite = spriteFor(`${spriteKey}|${row}`, palette, wPx, hPx);
          for (let col = 0; col < BRICK_COLUMNS; col += 1) {
            const brick = state.bricks[row * BRICK_COLUMNS + col];
            if (!brick || !brick.alive) continue;
            const x = brickLeft(geometry, col);
            if (brick.special) {
              const pulse = 0.5 + 0.5 * Math.sin((now - brick.bornAt) / 150);
              const specialSprite = spriteFor(`${spriteKey}|special`, SPECIAL_PALETTE, wPx, hPx);
              // Halo neón pulsante alrededor del bloque especial.
              ctx.save();
              ctx.shadowColor = pulse > 0.5 ? '#ff5ad6' : '#00e5ff';
              ctx.shadowBlur = 16 + 20 * pulse;
              ctx.drawImage(specialSprite, x, y, geometry.brickWidth, geometry.brickHeight);
              ctx.restore();
              ctx.save();
              ctx.globalAlpha = 0.35 + 0.35 * pulse;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              roundedPath(ctx, x, y, geometry.brickWidth, geometry.brickHeight, geometry.brickHeight * 0.3);
              ctx.stroke();
              ctx.restore();
            } else {
              ctx.drawImage(sprite, x, y, geometry.brickWidth, geometry.brickHeight);
            }
          }
        }

        // Onda expansiva de los bloques neón
        for (const burst of state.bursts) {
          const progress = Math.min(1, (now - burst.startedAt) / BURST_MS);
          if (progress >= 1) continue;
          ctx.globalAlpha = 1 - progress;
          ctx.strokeStyle = '#7df9ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(burst.x, burst.y, geometry.brickWidth * (0.35 + progress * 1.4), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (state.bursts.length > 0 && now - state.bursts[0].startedAt > BURST_MS) {
          state.bursts = state.bursts.filter((burst) => now - burst.startedAt <= BURST_MS);
        }

        // Pala estilo icono: cian con reflejo
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 22;
        roundedPath(ctx, state.paddleX, geometry.paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        const paddleGloss = ctx.createLinearGradient(0, geometry.paddleY, 0, geometry.paddleY + PADDLE_HEIGHT);
        paddleGloss.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        paddleGloss.addColorStop(0.6, 'rgba(255, 255, 255, 0.12)');
        paddleGloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
        roundedPath(ctx, state.paddleX + 2, geometry.paddleY + 1, PADDLE_WIDTH - 4, PADDLE_HEIGHT - 3, 5);
        ctx.fillStyle = paddleGloss;
        ctx.fill();

        const ballGlow = ctx.createRadialGradient(
          state.ballX - 3, state.ballY - 3, 1,
          state.ballX, state.ballY, BALL_RADIUS * 2.2,
        );
        ballGlow.addColorStop(0, '#fff7b2');
        ballGlow.addColorStop(0.3, '#ffb000');
        ballGlow.addColorStop(1, 'rgba(255, 78, 0, 0)');
        ctx.fillStyle = ballGlow;
        ctx.beginPath(); ctx.arc(state.ballX, state.ballY, BALL_RADIUS * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff4ad';
        ctx.beginPath(); ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
      }

      // Marcador en píxeles CSS: siempre completo dentro del marco, también en móvil.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hudSize = Math.max(13, Math.min(19, box.width * 0.038));
      const hudY = HUD_PADDING_CSS + Math.round(hudSize * 0.75);
      ctx.font = `800 ${hudSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.fillStyle = '#dffbff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(`Puntos ${state?.score ?? 0}`, HUD_PADDING_CSS, hudY);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`Nivel ${state?.level ?? 1}/${LEVEL_COUNT}`, box.width / 2, hudY);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#dffbff';
      ctx.fillText(`Vidas ${state?.lives ?? 3}`, box.width - HUD_PADDING_CSS, hudY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Aviso del estirón de velocidad a los 30 s de juego del nivel.
      if (state && screenRef.current === 'playing' && state.boostedAt > 0) {
        const aviso = now - state.boostedAt;
        if (aviso < SPEED_BOOST_NOTICE_MS) {
          const desvanecido = aviso < 260
            ? aviso / 260
            : 1 - (aviso - 260) / (SPEED_BOOST_NOTICE_MS - 260);
          const size = Math.max(15, Math.min(26, box.width * 0.055));
          const texto = '¡La bola acelera un 50 %!';
          ctx.globalAlpha = Math.max(0, Math.min(1, desvanecido));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `900 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          const ancho = ctx.measureText(texto).width;
          const centroY = box.height * 0.46;
          roundedPath(
            ctx,
            Math.max(10, box.width / 2 - ancho / 2 - 14),
            centroY - size,
            Math.min(box.width - 20, ancho + 28),
            size * 2,
            size * 0.6,
          );
          ctx.fillStyle = 'rgba(6, 18, 44, 0.62)';
          ctx.fill();
          ctx.shadowColor = '#ff9500';
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#ffe066';
          ctx.fillText(texto, box.width / 2, centroY);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const state = stateRef.current;
      if (event.key === 'Escape') { onClose?.(); return; }
      if (event.key.toLowerCase() === 'p' && state && (screenRef.current === 'playing' || screenRef.current === 'paused')) {
        const next = screenRef.current === 'playing' ? 'paused' : 'playing';
        screenRef.current = next;
        setScreen(next);
        return;
      }
      if (!state || screenRef.current !== 'playing') return;
      if (event.key === 'ArrowLeft') state.paddleX = clampPaddle(state.paddleX - 28, geometryRef.current);
      if (event.key === 'ArrowRight') state.paddleX = clampPaddle(state.paddleX + 28, geometryRef.current);
    };
    const onPointerMove = (event: PointerEvent) => movePaddle(event.clientX);

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerMove);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      observer?.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerMove);
    };
  }, [finishGame, onClose]);

  const state = stateRef.current;
  return (
    <section className="pidetietar-breakout" aria-label="Juego Breakout">
      <canvas ref={canvasRef} className="pidetietar-breakout__canvas" width={LOGICAL_WIDTH} height={540} />
      <div className="pidetietar-breakout__frame" aria-hidden="true" />
      {screen === 'start' && (
        <div className="pidetietar-breakout__panel">
          <span className="pidetietar-breakout__eyebrow">PideTiétar Play</span>
          <h2>Breakout</h2>
          <p>
            Rompe los 72 bloques. En el primer nivel no hay prisa; a partir del segundo el muro
            empieza a bajar hasta aplastarte. La bola acelera un 5 % en cada nivel y otro 50 % a
            los 30 segundos de juego. Cada 15 segundos aparece un bloque neón que revienta a su
            alrededor.
          </p>
          <div className="pidetietar-breakout__actions">
            <button type="button" onClick={startGame}><Play /> Jugar</button>
          </div>
          <small>Récord de sesión: {bestScore} puntos</small>
        </div>
      )}
      {screen === 'levelup' && (
        <div className="pidetietar-breakout__panel">
          <span className="pidetietar-breakout__eyebrow">Nivel {state?.level ?? 1} superado</span>
          <h2>¡Siguiente!</h2>
          <p>
            La bola irá un 5 % más rápida
            {(state?.level ?? 1) === 1
              ? ' y desde ahora el muro empieza a bajar.'
              : ' y el muro bajará otro 5 % más rápido.'}
            {' '}Mantienes {state?.lives ?? 3} vidas y {state?.score ?? 0} puntos.
          </p>
          <div className="pidetietar-breakout__actions">
            <button type="button" onClick={nextLevel}><Play /> Nivel {(state?.level ?? 1) + 1}</button>
            <button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>
          </div>
        </div>
      )}
      {(screen === 'gameover' || screen === 'won') && (
        <div className="pidetietar-breakout__panel">
          <span className="pidetietar-breakout__eyebrow">
            {screen === 'won' ? '¡Los cinco niveles superados!' : state?.reason === 'crush' ? 'El muro te ha aplastado' : 'Fin de la partida'}
          </span>
          <h2>{screen === 'won' ? '¡Leyenda!' : 'Buen intento'}</h2>
          <p>Puntuación: {state?.score ?? 0} · Récord: {bestScore}</p>
          <div className="pidetietar-breakout__actions">
            <button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button>
            <button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>
          </div>
          {saving && <small>Guardando puntuación…</small>}
        </div>
      )}
      {screen === 'paused' && (
        <div className="pidetietar-breakout__pause">
          <Pause /> Pausa · pulsa P para continuar
        </div>
      )}
    </section>
  );
}
