import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './AsteroidsHtml5Game.css';

interface AsteroidsHtml5GameProps { onClose?: () => void; }
type Screen = 'start' | 'playing' | 'paused' | 'over';
interface Asteroid { x: number; y: number; vx: number; vy: number; radius: number; rotation: number; spin: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }
interface Ship { x: number; y: number; angle: number; vx: number; vy: number; }
interface SpaceState { ship: Ship; asteroids: Asteroid[]; bullets: Bullet[]; score: number; lives: number; lastTime: number; fireCooldown: number; ended: boolean; }

const WIDTH = 780;
const HEIGHT = 500;
const wrap = (value: number, max: number) => (value + max) % max;
const newShip = (): Ship => ({ x: WIDTH / 2, y: HEIGHT / 2, angle: -Math.PI / 2, vx: 0, vy: 0 });
const newAsteroid = (radius = 28, x = Math.random() * WIDTH, y = Math.random() * HEIGHT): Asteroid => {
  const angle = Math.random() * Math.PI * 2;
  const speed = 18 + Math.random() * 45;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius, rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 1.8 };
};
const createState = (): SpaceState => {
  const asteroids: Asteroid[] = [];
  while (asteroids.length < 7) {
    const asteroid = newAsteroid();
    if (Math.hypot(asteroid.x - WIDTH / 2, asteroid.y - HEIGHT / 2) > 115) asteroids.push(asteroid);
  }
  return { ship: newShip(), asteroids, bullets: [], score: 0, lives: 3, lastTime: performance.now(), fireCooldown: 0, ended: false };
};

export default function AsteroidsHtml5Game({ onClose }: AsteroidsHtml5GameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SpaceState | null>(null);
  const screenRef = useRef<Screen>('start');
  const controlsRef = useRef(new Set<string>());
  const [screen, setScreen] = useState<Screen>('start');
  const { bestScore, saving, saveScore } = useGameScore('asteroids-html5', 'pidetietar-game-asteroids-html5-best-v1');

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
    controlsRef.current.clear();
    screenRef.current = 'playing';
    setScreen('playing');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let frame = 0;
    const fireBullet = () => {
      const state = stateRef.current;
      if (!state || screenRef.current !== 'playing' || state.fireCooldown > 0 || state.bullets.length >= 4) return;
      const { ship } = state;
      const speed = 300;
      state.bullets.push({ x: ship.x + Math.cos(ship.angle) * 19, y: ship.y + Math.sin(ship.angle) * 19, vx: ship.vx + Math.cos(ship.angle) * speed, vy: ship.vy + Math.sin(ship.angle) * speed, life: 1.2 });
      state.fireCooldown = .18;
    };
    const draw = (now: number) => {
      const state = stateRef.current;
      const delta = state ? Math.min(.035, Math.max(.008, (now - state.lastTime) / 1000)) : .016;
      if (state) state.lastTime = now;
      const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 20, WIDTH / 2, HEIGHT / 2, WIDTH);
      gradient.addColorStop(0, '#25145c'); gradient.addColorStop(1, '#040b25'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 55; i += 1) { const x = (i * 139) % WIDTH; const y = (i * 71) % HEIGHT; ctx.globalAlpha = .25 + (i % 3) * .15; ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
      if (state && screenRef.current === 'playing') {
        const controls = controlsRef.current;
        if (controls.has('ArrowLeft') || controls.has('a')) state.ship.angle -= 3.5 * delta;
        if (controls.has('ArrowRight') || controls.has('d')) state.ship.angle += 3.5 * delta;
        if (controls.has('ArrowUp') || controls.has('w')) { state.ship.vx += Math.cos(state.ship.angle) * 110 * delta; state.ship.vy += Math.sin(state.ship.angle) * 110 * delta; }
        if (controls.has(' ') && state.fireCooldown <= 0) fireBullet();
        state.fireCooldown = Math.max(0, state.fireCooldown - delta);
        state.ship.vx *= Math.pow(.985, delta * 60); state.ship.vy *= Math.pow(.985, delta * 60);
        state.ship.x = wrap(state.ship.x + state.ship.vx * delta, WIDTH); state.ship.y = wrap(state.ship.y + state.ship.vy * delta, HEIGHT);
        state.bullets.forEach((bullet) => { bullet.x = wrap(bullet.x + bullet.vx * delta, WIDTH); bullet.y = wrap(bullet.y + bullet.vy * delta, HEIGHT); bullet.life -= delta; });
        state.bullets = state.bullets.filter((bullet) => bullet.life > 0);
        state.asteroids.forEach((asteroid) => { asteroid.x = wrap(asteroid.x + asteroid.vx * delta, WIDTH); asteroid.y = wrap(asteroid.y + asteroid.vy * delta, HEIGHT); asteroid.rotation += asteroid.spin * delta; });
        for (let ai = state.asteroids.length - 1; ai >= 0; ai -= 1) {
          const asteroid = state.asteroids[ai];
          const bulletIndex = state.bullets.findIndex((bullet) => Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < asteroid.radius);
          if (bulletIndex < 0) continue;
          state.bullets.splice(bulletIndex, 1); state.asteroids.splice(ai, 1); state.score += asteroid.radius > 20 ? 20 : 50;
          if (asteroid.radius > 20) { state.asteroids.push(newAsteroid(15, asteroid.x, asteroid.y), newAsteroid(15, asteroid.x, asteroid.y)); }
        }
        if (state.asteroids.length === 0) { for (let i = 0; i < 5; i += 1) state.asteroids.push(newAsteroid()); }
        const hit = state.asteroids.some((asteroid) => Math.hypot(asteroid.x - state.ship.x, asteroid.y - state.ship.y) < asteroid.radius + 13);
        if (hit) { state.lives -= 1; state.ship = newShip(); if (state.lives <= 0) finishGame(); }
      }
      state?.asteroids.forEach((asteroid) => { ctx.save(); ctx.translate(asteroid.x, asteroid.y); ctx.rotate(asteroid.rotation); ctx.strokeStyle = asteroid.radius > 20 ? '#00e5ff' : '#ffb703'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 13; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 9; i += 1) { const angle = (i / 9) * Math.PI * 2; const radius = asteroid.radius * (.72 + (i % 3) * .14); const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.stroke(); ctx.restore(); });
      state?.bullets.forEach((bullet) => { ctx.fillStyle = '#fff7b2'; ctx.shadowColor = '#ff8a00'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
      const ship = state?.ship ?? newShip(); ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle); ctx.strokeStyle = '#fff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 16; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(-14, -12); ctx.lineTo(-7, 0); ctx.lineTo(-14, 12); ctx.closePath(); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#dffbff'; ctx.font = '800 18px system-ui'; ctx.fillText(`Puntos ${state?.score ?? 0}`, 18, 28); ctx.textAlign = 'right'; ctx.fillText(`Vidas ${state?.lives ?? 3} · Récord ${bestScore}`, WIDTH - 18, 28); ctx.textAlign = 'left';
      frame = window.requestAnimationFrame(draw);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose?.(); return; } if (event.key.toLowerCase() === 'p' && (screenRef.current === 'playing' || screenRef.current === 'paused')) { const next = screenRef.current === 'playing' ? 'paused' : 'playing'; screenRef.current = next; setScreen(next); return; } if (event.key.toLowerCase() === 'r' && screenRef.current === 'over') { startGame(); return; } if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'a', 'd', 'w', ' '].includes(event.key)) { event.preventDefault(); controlsRef.current.add(event.key); if (event.key === ' ') fireBullet(); } };
    const onKeyUp = (event: KeyboardEvent) => { controlsRef.current.delete(event.key); };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); canvas.addEventListener('pointerdown', fireBullet); frame = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); canvas.removeEventListener('pointerdown', fireBullet); };
  }, [bestScore, finishGame, onClose, startGame]);

  return (
    <section className="pidetietar-asteroids" aria-label="Juego Asteroids HTML5">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pidetietar-asteroids__canvas" />
      {screen === 'start' && <div className="pidetietar-asteroids__panel"><span>PideTiétar Play</span><h2>Asteroids HTML5</h2><p>Gira, acelera y dispara para romper los asteroides.</p><button type="button" onClick={startGame}><Play /> Empezar</button><small>A/D o flechas · W acelera · Espacio dispara</small></div>}
      {screen === 'over' && <div className="pidetietar-asteroids__panel"><span>Fin de la partida</span><h2>¡Misión cumplida!</h2><p>Puntuación: {stateRef.current?.score ?? 0} · Récord: {bestScore}</p><button type="button" onClick={startGame}><RotateCcw /> Volver a jugar</button><button type="button" className="is-secondary" onClick={onClose}><X /> Salir</button>{saving && <small>Guardando puntuación…</small>}</div>}
      {screen === 'paused' && <div className="pidetietar-asteroids__pause">Pausa · pulsa P para continuar</div>}
    </section>
  );
}
