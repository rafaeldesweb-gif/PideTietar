/**
 * GameCardsRow – fila de portadas de juegos de "PideTietar Play".
 *
 * Renderiza una tarjeta por juego registrado en GAMES_REGISTRY bajo la cabecera
 * "PideTiétar Play", que separa visualmente los juegos del catálogo superior.
 * Cada tarjeta es una imagen de portada clicable. Al pulsar una portada:
 *
 * - Con sesión: abre el detalle del juego (ranking + "Jugar ahora" o
 *   "Próximamente" según el juego esté disponible).
 * - Sin sesión: pide iniciar sesión y, tras acceder, abre el juego.
 */

import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GAMES_REGISTRY } from '../games/registry';
import type { GameEntry } from '../games/registry';

interface GameCardsRowProps {
  /** Callback al abrir un juego (navega a la vista de juegos). */
  onOpenGame: (game: GameEntry) => void;
  /** Callback cuando el usuario no tiene sesión y quiere jugar. */
  onRequestLogin: () => void;
}

export const GameCardsRow: React.FC<GameCardsRowProps> = ({
  onOpenGame,
  onRequestLogin,
}) => {
  const { currentUser } = useApp();
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const handlePlay = (game: GameEntry) => {
    if (!currentUser) {
      onRequestLogin();
      return;
    }
    setOpenGameId(game.id);
    onOpenGame(game);
  };

  return (
    <section
      aria-labelledby="pide-play-title"
      className="my-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Cabecera de sección: separa los negocios y productos de los juegos. */}
      <div className="pide-play-header">
        <div className="pide-play-header__row">
          <span className="pide-play-header__rule" aria-hidden="true" />
          <h2 id="pide-play-title" className="pide-play-header__title">
            <span className="pide-play-header__brand">PideTiétar</span>
            <span className="pide-play-header__play">Play</span>
          </h2>
          <span
            className="pide-play-header__rule pide-play-header__rule--reverse"
            aria-hidden="true"
          />
        </div>
        <p className="pide-play-header__subtitle">
          <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
          Minijuegos del Valle del Tiétar
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
        {GAMES_REGISTRY.map((game) => {
          const disabled = !game.available;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => handlePlay(game)}
              disabled={disabled}
              aria-label={
                currentUser
                  ? `Abrir el juego ${game.title}`
                  : `Inicia sesión para jugar a ${game.title}`
              }
              className="w-full max-w-[180px] h-full max-h-[220px] flex flex-col items-center justify-center group relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm hover:border-[#ff4e00] hover:shadow-[0_0_20px_rgba(255,78,0,0.25)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e00]"
            >
              <img
                src={game.image}
                alt={`Portada del juego ${game.title}`}
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
                onError={(event) => {
                  const target = event.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              {disabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm group-hover:bg-black/50 transition">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Próximamente
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
