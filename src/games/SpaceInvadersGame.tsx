import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './SpaceInvadersGame.css';

interface SpaceInvadersGameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'over' | 'won';
interface Invader { x: number; y: number; alive: boolean; color: string; }
interface Shot { x: number; y: number; speed: number; enemy: boolean; }
interface InvadersState { playerX: number; invaders: Invader[]; shots: Shot[]; score: number; lives: number; direction: 1 | -1; lastTime: number; fireCooldown: number; enemyCooldown: number; ended: boolean; }

const WIDTH = 760;
const HEIGHT = 500;
const COLORS = ['#ff5369', '#ffb000', '#7cff67', '#00e5ff'];
const createState = (): InvadersState => ({
  playerX: WIDTH / 2,
  invaders: Array.from({ length: 32 }, (_, index) => ({ x: 130 + (index % 8) * 64, y: 70 + Math.floor(index / 8) * 42, alive: true, color: COLORS[Math.floor(index / 8)] })),
  shots: [], score: 0, lives: 3, direction: 1, lastTime: performance.now(), fireCooldown: 0, enemyCooldown: 1.1, ended: false,
});

export default function SpaceInvadersGame({ onClose }: SpaceInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<InvadersState | null>(null);
  const screenRef = useRef<Screen>('start');
  const keysRef = useRef(new Set<string>());
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('space-invaders', 'pidetietar-game-space-invaders-best-v1');

  useEffect(() => { screenRef.current = screen; }, [screen]);
  const finishGame = useCallback((next: 'over' | 'won') => { const state = stateRef.current; if (!state || state.ended) return; state.ended = true; screenRef.current = next; setScreen(next); void saveScore(state.score, 1); }, [saveScore]);
  const startGame = useCallback(() => { stateRef.current = createState(); keysRef.current.clear(); screenRef.current = 'playing'; setScreen('playing'); }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const ctx = canvas.getContext('2d'); if (!ctx) return undefined;
    let frame = 0;
    const shoot = () => { const state = stateRef.current; if (!state || screenRef.current !== 'playing' || state.fireCooldown > 0) return; state.shots.push({ x: state.playerX, y: HEIGHT - 55, speed: -390, enemy: false }); state.fireCooldown = .28; };
    const draw = (now: number) => {
      const state = stateRef.current; const delta = state ? Math.min(.035, Math.max(.008, (now - state.lastTime) / 1000)) : .016; if (state) state.lastTime = now;
      const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT); bg.addColorStop(0, '#08154a'); bg.addColorStop(1, '#210c42'); ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 45; i += 1) { ctx.globalAlpha = .25 + (i % 3) * .12; ctx.fillRect((i * 151) % WIDTH, (i * 73) % HEIGHT, 2, 2); } ctx.globalAlpha = 1;
      if (state && screenRef.current === 'playing') {
        if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) state.playerX = Math.max(28, state.playerX - 300 * delta);
        if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) state.playerX = Math.min(WIDTH - 28, state.playerX + 300 * delta);
        if (keysRef.current.has(' ') && state.fireCooldown <= 0) shoot();
        state.fireCooldown = Math.max(0, state.fireCooldown - delta); state.enemyCooldown -= delta;
        const alive = state.invaders.filter((invader) => invader.alive); const edge = alive.some((invader) => invader.x > WIDTH - 45 || invader.x < 30);
        if (edge) { state.direction = state.direction === 1 ? -1 : 1; alive.forEach((invader) => { invader.y += 15; }); }
        alive.forEach((invader) => { invader.x += state.direction * 30 * delta; });
        if (state.enemyCooldown <= 0 && alive.length) { const shooter = alive[Math.floor(Math.random() * alive.length)]; state.shots.push({ x: shooter.x, y: shooter.y + 20, speed: 190, enemy: true }); state.enemyCooldown = Math.max(.45, 1.25 - state.score / 800); }
        state.shots.forEach((shot) => { shot.y += shot.speed * delta; }); state.shots = state.shots.filter((shot) => shot.y > -20 && shot.y < HEIGHT + 20);
        for (let shotIndex = state.shots.length - 1; shotIndex >= 0; shotIndex -= 1) { const shot = state.shots[shotIndex]; if (shot.enemy) continue; const invader = state.invaders.find((item) => item.alive && Math.hypot(item.x - shot.x, item.y - shot.y) < 20); if (invader) { invader.alive = false; state.shots.splice(shotIndex, 1); state.score += 10; } }
        const enemyShot = state.shots.find((shot) => shot.enemy && Math.hypot(shot.x - state.playerX, shot.y - (HEIGHT - 40)) < 23);
        if (enemyShot) { state.shots = state.shots.filter((shot) => shot !== enemyShot); state.lives -= 1; if (state.lives <= 0) finishGame('over'); }
        if (state.invaders.every((invader) => !invader.alive)) finishGame('won');
      }
      state?.invaders.filter((invader) => invader.alive).forEach((invader) => { ctx.fillStyle = invader.color; ctx.shadowColor = invader.color; ctx.shadowBlur = 13; ctx.fillRect(invader.x - 17, invader.y - 10, 34, 20); ctx.fillRect(invader.x - 12, invader.y - 15, 7, 7); ctx.fillRect(invader.x + 5, invader.y - 15, 7, 7); ctx.fillStyle = '#07133c'; ctx.fillRect(invader.x - 9, invader.y - 4, 5, 5); ctx.fillRect(invader.x + 4, invader.y - 4, 5, 5); ctx.shadowBlur = 0; });
      state?.shots.forEach((shot) => { ctx.fillStyle = shot.enemy ? '#ff5369' : '#fff7b2'; ctx.shadowColor = shot.enemy ? '#ff5369' : '#ffb000'; ctx.shadowBlur = 12; ctx.fillRect(shot.x - 2, shot.y - 7, 4, 14); ctx.shadowBlur = 0; });
      const playerX = state?.playerX ?? WIDTH / 2; ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 17; ctx.beginPath(); ctx.moveTo(playerX, HEIGHT - 65); ctx.lineTo(playerX - 25, HEIGHT - 30); ctx.lineTo(playerX + 25, HEIGHT - 30); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#dffbff'; ctx.font = '800 18px system-ui'; ctx.fillText(`Puntos ${state?.score ?? 0}`, 18, 28); ctx.textAlign = 'right'; ctx.fillText(`Vidas ${state?.lives ?? 3} · Récord ${bestScore}`, WIDTH - 18, 28); ctx.textAlign = 'left'; frame = window.requestAnimationFrame(draw);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose?.(); return; } if (event.key.toLowerCase() === 'r' && (screenRef.current === 'over' || screenRef.current === 'won')) { startGame(); return; } if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(event.key)) { event.preventDefault(); keysRef.current.add(event.key); if (event.key === ' ') shoot(); } };
    const onKeyUp = (event: KeyboardEvent) => { keysRef.current.delete(event.key); };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); canvas.addEventListener('pointerdown', shoot); frame = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); canvas.removeEventListener('pointerdown', shoot); };
  }, [bestScore, finishGame, onClose, startGame]);

  return <section className="pidetietar-space-invaders" aria-label="Juego Space Invaders"><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pidetietar-space-invaders__canvas" />{screen === 'start' && <div className="pidetietar-space-invaders__panel"><span>PideTiétar Play</span><h2>Space Invaders</h2><p>Defiende la nave y elimina la formación alienígena.</p><button type="button" onClick={startGame}><Play /> Empezar</button><small>Flechas o A/D · Espacio para disparar</small></div>}{(screen === 'over' || screen === 'won') && <div className="pidetietar-space-invaders__panel"><span>{screen === 'won' ? '¡Misión cumplida!' : 'Fin de la partida'}</span><h2>{screen === 'won' ? '¡Victoria espacial!' : 'Buen intento'}</h2><p>Puntuación: {stateRef.current?.score ?? 0} · Récord: {bestScore}</p><button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button><button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>{saving && <small>Guardando puntuación…</small>}</div>}</section>;
}
