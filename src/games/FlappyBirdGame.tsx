import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './FlappyBirdGame.css';

interface FlappyBirdGameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'over';
interface Pipe { x: number; gapY: number; passed: boolean; }
interface BirdState { y: number; velocity: number; score: number; pipes: Pipe[]; lastTime: number; ended: boolean; }

const WIDTH = 460;
const HEIGHT = 600;
const BIRD_X = 120;
const BIRD_RADIUS = 18;
const createPipe = (x: number): Pipe => ({ x, gapY: 145 + Math.random() * 220, passed: false });
const createState = (): BirdState => ({ y: HEIGHT / 2, velocity: 0, score: 0, pipes: [createPipe(WIDTH + 55), createPipe(WIDTH + 300)], lastTime: performance.now(), ended: false });

export default function FlappyBirdGame({ onClose }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BirdState | null>(null);
  const screenRef = useRef<Screen>('start');
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('flappy-bird', 'pidetietar-game-flappy-bird-best-v1');

  useEffect(() => { screenRef.current = screen; }, [screen]);

  const finishGame = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.ended) return;
    state.ended = true;
    screenRef.current = 'over';
    setScreen('over');
    void saveScore(state.score, 1);
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
    let frame = 0;
    const draw = (now: number) => {
      const state = stateRef.current;
      const delta = state ? Math.min(0.035, Math.max(0.008, (now - state.lastTime) / 1000)) : 0.016;
      if (state) state.lastTime = now;
      const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      background.addColorStop(0, '#16245d'); background.addColorStop(1, '#452078');
      ctx.fillStyle = background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let x = 20; x < WIDTH; x += 85) { ctx.beginPath(); ctx.arc(x, 95 + (x % 3) * 45, 22, 0, Math.PI * 2); ctx.arc(x + 27, 95 + (x % 3) * 45, 16, 0, Math.PI * 2); ctx.fill(); }
      if (state && screenRef.current === 'playing') {
        state.velocity += 850 * delta;
        state.y += state.velocity * delta;
        state.pipes.forEach((pipe) => { pipe.x -= 165 * delta; });
        const last = state.pipes[state.pipes.length - 1];
        if (last && last.x < WIDTH - 190) state.pipes.push(createPipe(WIDTH + 35));
        state.pipes = state.pipes.filter((pipe) => pipe.x > -70);
        state.pipes.forEach((pipe) => {
          if (!pipe.passed && pipe.x + 58 < BIRD_X) { pipe.passed = true; state.score += 10; }
          const hitX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + 58;
          const clearGap = state.y - BIRD_RADIUS > pipe.gapY && state.y + BIRD_RADIUS < pipe.gapY + 145;
          if (hitX && !clearGap) finishGame();
        });
        if (state.y < BIRD_RADIUS || state.y > HEIGHT - 54) finishGame();
      }
      ctx.fillStyle = '#19d38a'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15;
      state?.pipes.forEach((pipe) => { ctx.fillRect(pipe.x, 0, 58, pipe.gapY); ctx.fillRect(pipe.x, pipe.gapY + 145, 58, HEIGHT - pipe.gapY - 145); ctx.fillStyle = '#8af7ca'; ctx.fillRect(pipe.x - 7, pipe.gapY - 10, 72, 10); ctx.fillRect(pipe.x - 7, pipe.gapY + 145, 72, 10); ctx.fillStyle = '#19d38a'; });
      ctx.shadowBlur = 0;
      const birdY = state?.y ?? HEIGHT / 2;
      ctx.save(); ctx.translate(BIRD_X, birdY); ctx.rotate(Math.max(-0.35, Math.min(0.6, (state?.velocity ?? 0) / 600))); ctx.shadowColor = '#ffd447'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffd447'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#ff8a00'; ctx.beginPath(); ctx.moveTo(20, -2); ctx.lineTo(35, 4); ctx.lineTo(20, 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#172654'; ctx.beginPath(); ctx.arc(8, -7, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '900 20px system-ui'; ctx.fillText(`Puntos ${state?.score ?? 0}`, 18, 31); ctx.textAlign = 'right'; ctx.fillText(`Récord ${bestScore}`, WIDTH - 18, 31); ctx.textAlign = 'left';
      frame = window.requestAnimationFrame(draw);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose?.(); return; } if (event.key === ' ' || event.key === 'ArrowUp') { event.preventDefault(); flap(); } };
    window.addEventListener('keydown', onKeyDown); canvas.addEventListener('pointerdown', flap); frame = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); canvas.removeEventListener('pointerdown', flap); };
  }, [bestScore, finishGame, flap, onClose]);

  return (
    <section className="pidetietar-flappy" aria-label="Juego Flappy Bird">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pidetietar-flappy__canvas" />
      {screen === 'start' && <div className="pidetietar-flappy__panel"><span>PideTiétar Play</span><h2>Flappy Bird</h2><p>Vuela entre los tubos sin chocar.</p><button type="button" onClick={startGame}><Play /> Empezar</button><small>Espacio, flecha arriba o toque para volar</small></div>}
      {screen === 'over' && <div className="pidetietar-flappy__panel"><span>Fin de la partida</span><h2>¡Sigue volando!</h2><p>Puntuación: {stateRef.current?.score ?? 0} · Récord: {bestScore}</p><button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button><button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>{saving && <small>Guardando puntuación…</small>}</div>}
    </section>
  );
}
