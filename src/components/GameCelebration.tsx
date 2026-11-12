/**
 * GameCelebration – celebración compartida al completar los 5 niveles.
 *
 * Muestra una capa a pantalla completa con confeti (canvas-confetti),
 * globos y serpentinas animadas, además de una tarjeta de enhorabuena.
 * Se usa en todos los juegos de PideTietar Play.
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy } from 'lucide-react';
import './GameCelebration.css';

interface GameCelebrationProps {
  /** Si la celebración está visible. */
  open: boolean;
  /** Nombre del juego que se ha completado. */
  gameTitle: string;
  /** Color de marca del juego (borde y botón). */
  gameColor?: string;
  /** Acción al cerrar la celebración. */
  onClose: () => void;
}

const CONFETTI_COLORS = [
  '#ff4e00',
  '#ff8a00',
  '#ffb703',
  '#ffe066',
  '#00e5ff',
  '#4cc9f0',
  '#b026ff',
  '#ff2a8d',
  '#7cff8a',
];

const BALLOON_COLORS = ['#ff4e00', '#ffb703', '#00e5ff', '#b026ff', '#ff2a8d', '#7cff8a', '#ffffff'];
const STREAMER_COLORS = ['#ff4e00', '#ffb703', '#00e5ff', '#b026ff', '#ff2a8d', '#7cff8a'];

const BALLOONS = Array.from({ length: 10 }, (_, index) => ({
  left: `${4 + index * 9.4}%`,
  color: BALLOON_COLORS[index % BALLOON_COLORS.length],
  delay: `${(index % 5) * -1.6 - 0.4}s`,
  duration: `${7.5 + (index % 4) * 1.1}s`,
  scale: 0.8 + (index % 3) * 0.18,
}));

const STREAMERS = Array.from({ length: 16 }, (_, index) => ({
  left: `${2 + index * 6.1}%`,
  color: STREAMER_COLORS[index % STREAMER_COLORS.length],
  delay: `${(index % 7) * -0.7}s`,
  duration: `${4.2 + (index % 5) * 0.55}s`,
}));

export const GameCelebration: React.FC<GameCelebrationProps> = ({
  open,
  gameTitle,
  gameColor = '#ff4e00',
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) return undefined;

    const burst = (options: confetti.Options) => {
      confetti({
        colors: CONFETTI_COLORS,
        zIndex: 400,
        disableForReducedMotion: true,
        ...options,
      });
    };

    // Estallido inicial en el centro.
    burst({ particleCount: 160, spread: 105, startVelocity: 48, origin: { y: 0.62 } });

    // Cañones laterales y serpentinas durante unos segundos.
    const interval = window.setInterval(() => {
      burst({
        particleCount: 28,
        angle: 60,
        spread: 62,
        startVelocity: 56,
        origin: { x: 0, y: 0.72 },
      });
      burst({
        particleCount: 28,
        angle: 120,
        spread: 62,
        startVelocity: 56,
        origin: { x: 1, y: 0.72 },
      });
      burst({
        particleCount: 12,
        spread: 180,
        startVelocity: 16,
        gravity: 0.9,
        scalar: 2.1,
        ticks: 280,
        shapes: ['square'],
        origin: { y: 0.05 },
      });
    }, 850);

    const stop = window.setTimeout(() => window.clearInterval(interval), 5600);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
      confetti.reset();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="game-celebration"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-celebration-title"
      style={{ '--celebration-accent': gameColor } as React.CSSProperties}
    >
      <div className="game-celebration__decor" aria-hidden="true">
        {BALLOONS.map((balloon, index) => (
          <span
            key={`balloon-${index}`}
            className="game-celebration__balloon"
            style={
              {
                left: balloon.left,
                '--balloon-color': balloon.color,
                '--balloon-scale': balloon.scale,
                animationDelay: balloon.delay,
                animationDuration: balloon.duration,
              } as React.CSSProperties
            }
          />
        ))}
        {STREAMERS.map((streamer, index) => (
          <span
            key={`streamer-${index}`}
            className="game-celebration__streamer"
            style={
              {
                left: streamer.left,
                '--streamer-color': streamer.color,
                animationDelay: streamer.delay,
                animationDuration: streamer.duration,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="game-celebration__card">
        <span className="game-celebration__eyebrow">Campaña completada</span>

        <div className="game-celebration__trophy" aria-hidden="true">
          <Trophy className="h-9 w-9" />
        </div>

        <h2 id="game-celebration-title" className="game-celebration__title">
          ¡Enhorabuena!
        </h2>
        <p className="game-celebration__text">
          Has superado los <strong>5 niveles</strong> de <strong>{gameTitle}</strong>. ¡El Valle
          del Tiétar es tuyo!
        </p>

        <button type="button" className="game-celebration__button" onClick={onClose}>
          Seguir jugando
        </button>
      </div>
    </div>
  );
};
