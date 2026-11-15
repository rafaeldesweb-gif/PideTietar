import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './BreakoutGame.css';

interface BreakoutGameProps {
  onClose?: () => void;
}

type BreakoutScreen = 'start' | 'playing' | 'paused' | 'gameover' | 'won';
type BreakoutMode = 'classic' | 'arcade';

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  respawnAt: number;
}

interface BreakoutState {
  mode: BreakoutMode;
  ballX: number;
  ballY: number;
  ballDx: number;
  ballDy: number;
  paddleX: number;
  score: number;
  lives: number;
  bricks: Brick[];
  lastTime: number;
  ended: boolean;
}

const WIDTH = 810;
const HEIGHT = 540;
const PADDLE_WIDTH = 112;
const PADDLE_HEIGHT = 14;
const BALL_RADIUS = 10;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 30;
const BRICK_GAP = 10;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 9;
const BRICK_COLORS = ['#cb3fdd', '#ff5369', '#ff8a00', '#18c98c', '#4f7cff'];

const createBricks = (): Brick[] => Array.from(
  { length: BRICK_ROWS * BRICK_COLUMNS },
  (_, index) => {
    const column = index % BRICK_COLUMNS;
    const row = Math.floor(index / BRICK_COLUMNS);
    return {
      x: 30 + column * (BRICK_WIDTH + BRICK_GAP),
      y: 42 + row * (BRICK_HEIGHT + BRICK_GAP),
      alive: true,
      respawnAt: 0,
    };
  },
);

const createState = (mode: BreakoutMode): BreakoutState => ({
  mode,
  ballX: WIDTH / 2,
  ballY: HEIGHT - 62,
  ballDx: 2.5,
  ballDy: -2.8,
  paddleX: (WIDTH - PADDLE_WIDTH) / 2,
  score: 0,
  lives: 3,
  bricks: createBricks(),
  lastTime: performance.now(),
  ended: false,
});

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

export default function BreakoutGame({ onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BreakoutState | null>(null);
  const screenRef = useRef<BreakoutScreen>('start');
  const [screen, setScreen] = useState<BreakoutScreen>('start');
  const [mode, setMode] = useState<BreakoutMode>('classic');
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
    void saveScore(state.score, 1);
  }, [saveScore]);

  const startGame = useCallback((nextMode: BreakoutMode) => {
    setMode(nextMode);
    stateRef.current = createState(nextMode);
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let frame = 0;

    const movePaddle = (clientX: number) => {
      const state = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      if (!state || rect.width === 0) return;
      const x = ((clientX - rect.left) / rect.width) * WIDTH;
      state.paddleX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2));
    };

    const draw = (now: number) => {
      const state = stateRef.current;
      const delta = state ? Math.min(2.2, Math.max(0.4, (now - state.lastTime) / 16.67)) : 1;
      if (state) state.lastTime = now;

      const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      background.addColorStop(0, '#061432');
      background.addColorStop(0.55, '#14104a');
      background.addColorStop(1, '#32104e');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = 'rgba(0, 229, 255, .08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < WIDTH; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < HEIGHT; y += 36) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
      }

      if (state && screenRef.current === 'playing') {
        const speed = state.mode === 'arcade' ? 1.2 : 1;
        state.ballX += state.ballDx * delta * speed;
        state.ballY += state.ballDy * delta * speed;

        if (state.ballX < BALL_RADIUS || state.ballX > WIDTH - BALL_RADIUS) state.ballDx *= -1;
        if (state.ballY < BALL_RADIUS + 22) state.ballDy *= -1;

        const paddleY = HEIGHT - 42;
        if (
          state.ballDy > 0 &&
          state.ballY + BALL_RADIUS >= paddleY &&
          state.ballY - BALL_RADIUS <= paddleY + PADDLE_HEIGHT &&
          state.ballX >= state.paddleX &&
          state.ballX <= state.paddleX + PADDLE_WIDTH
        ) {
          state.ballDy = -Math.abs(state.ballDy);
          state.ballDx = ((state.ballX - (state.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2)) * 3.2;
        }

        if (state.ballY > HEIGHT + BALL_RADIUS) {
          state.lives -= 1;
          if (state.lives <= 0) {
            finishGame('gameover');
          } else {
            state.ballX = WIDTH / 2;
            state.ballY = HEIGHT - 62;
            state.ballDx = 2.5;
            state.ballDy = -2.8;
          }
        }

        let remaining = 0;
        state.bricks.forEach((brick, index) => {
          if (!brick.alive) {
            if (state.mode === 'arcade' && now >= brick.respawnAt) brick.alive = true;
            else return;
          }
          remaining += 1;
          if (
            state.ballX + BALL_RADIUS >= brick.x &&
            state.ballX - BALL_RADIUS <= brick.x + BRICK_WIDTH &&
            state.ballY + BALL_RADIUS >= brick.y &&
            state.ballY - BALL_RADIUS <= brick.y + BRICK_HEIGHT
          ) {
            brick.alive = false;
            brick.respawnAt = now + 1100;
            state.ballDy *= -1;
            state.score += 10;
          }
          if (brick.alive) {
            const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + BRICK_HEIGHT);
            gradient.addColorStop(0, BRICK_COLORS[index % BRICK_COLORS.length]);
            gradient.addColorStop(1, '#071a45');
            ctx.fillStyle = gradient;
            ctx.shadowColor = BRICK_COLORS[index % BRICK_COLORS.length];
            ctx.shadowBlur = 12;
            roundedRect(ctx, brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT, 7);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
        if (remaining === 0 && state.mode === 'classic') finishGame('won');
      }

      if (state) {
        const paddleY = HEIGHT - 42;
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 22;
        roundedRect(ctx, state.paddleX, paddleY, PADDLE_WIDTH, PADDLE_HEIGHT, 7);
        ctx.fill();
        ctx.shadowBlur = 0;

        const ballGlow = ctx.createRadialGradient(state.ballX - 3, state.ballY - 3, 1, state.ballX, state.ballY, BALL_RADIUS * 2.2);
        ballGlow.addColorStop(0, '#fff7b2');
        ballGlow.addColorStop(0.3, '#ffb000');
        ballGlow.addColorStop(1, 'rgba(255, 78, 0, 0)');
        ctx.fillStyle = ballGlow;
        ctx.beginPath(); ctx.arc(state.ballX, state.ballY, BALL_RADIUS * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff4ad';
        ctx.beginPath(); ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();

        ctx.font = '700 18px system-ui';
        ctx.fillStyle = '#dffbff';
        ctx.fillText(`Puntos ${state.score}`, 18, 28);
        ctx.textAlign = 'right';
        ctx.fillText(`Vidas ${state.lives}`, WIDTH - 18, 28);
        ctx.textAlign = 'left';
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
      if (event.key === 'ArrowLeft') state.paddleX = Math.max(0, state.paddleX - 28);
      if (event.key === 'ArrowRight') state.paddleX = Math.min(WIDTH - PADDLE_WIDTH, state.paddleX + 28);
    };
    const onPointerMove = (event: PointerEvent) => movePaddle(event.clientX);

    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointermove', onPointerMove);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, [finishGame, onClose]);

  const state = stateRef.current;
  return (
    <section className="pidetietar-breakout" aria-label="Juego Breakout">
      <canvas ref={canvasRef} className="pidetietar-breakout__canvas" width={WIDTH} height={HEIGHT} />
      <div className="pidetietar-breakout__frame" aria-hidden="true" />
      {screen === 'start' && (
        <div className="pidetietar-breakout__panel">
          <span className="pidetietar-breakout__eyebrow">PideTiétar Play</span>
          <h2>Breakout</h2>
          <p>Rompe todos los bloques y controla la pala con las flechas o con el dedo.</p>
          <div className="pidetietar-breakout__actions">
            <button type="button" onClick={() => startGame('classic')}><Play /> Clásico</button>
            <button type="button" onClick={() => startGame('arcade')}><Play /> Arcade</button>
          </div>
          <small>Récord de sesión: {bestScore} puntos</small>
        </div>
      )}
      {(screen === 'gameover' || screen === 'won') && (
        <div className="pidetietar-breakout__panel">
          <span className="pidetietar-breakout__eyebrow">{screen === 'won' ? '¡Nivel completado!' : 'Fin de la partida'}</span>
          <h2>{screen === 'won' ? '¡Victoria!' : 'Buen intento'}</h2>
          <p>Puntuación: {state?.score ?? 0} · Récord: {bestScore}</p>
          <div className="pidetietar-breakout__actions">
            <button type="button" onClick={() => startGame(mode)}><RotateCcw /> Volver a jugar</button>
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
