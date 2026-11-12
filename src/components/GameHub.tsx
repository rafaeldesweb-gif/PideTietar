/**
 * GameHub – catálogo de juegos de "PideTietar Play".
 *
 * Renderiza una tarjeta por juego registrado en GAMES_REGISTRY, cada una con su
 * ícono, nombre, categoría y un botón "Jugar". Si el usuario no tiene sesión,
 * se solicita iniciar sesión antes de abrir el juego.
 */

import React, { Suspense, useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_REGISTRY, findGameById, resolveGameIcon } from '../games/registry';
import type { GameEntry } from '../games/registry';

interface GameHubProps {
  /** Si se proporciona, solo se muestra ese juego (detalle). Si no, se muestra el catálogo completo. */
  gameId?: string;
  /** Callback al abrir un juego (se usa para navegar a la vista de juegos). */
  onOpenGame: (game: GameEntry) => void;
  /** Callback cuando el usuario no tiene sesión y quiere jugar. */
  onRequestLogin: () => void;
}

export const GameHub: React.FC<GameHubProps> = ({
  gameId,
  onOpenGame,
  onRequestLogin,
}) => {
  const { currentUser } = useApp();
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const games = gameId ? GAMES_REGISTRY.filter((g) => g.id === gameId) : GAMES_REGISTRY;
  const selectedGame = findGameById(gameId || '');

  const handlePlay = (game: GameEntry) => {
    if (!currentUser) {
      onRequestLogin();
      return;
    }
    setOpenGameId(game.id);
    onOpenGame(game);
  };

  const Icon = selectedGame ? resolveGameIcon(selectedGame.icon ?? 'Gamepad2') : null;

  if (selectedGame && openGameId === selectedGame.id) {
    // Vista de un juego concreto cargado perezosamente.
    return (
      <section className="game-hub__detail mb-8">
        <Suspense fallback={<GameHubLoadingFallback />}>
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff7a00]/10 text-[#ff7a00] font-bold text-xl`}>
                {Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : null}
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {selectedGame.title}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {selectedGame.category} · {selectedGame.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePlay(selectedGame)}
                className="mt-4 sm:mt-0 sm:self-start rounded-xl border border-[#ff7a00] bg-[#ff7a00]/10 px-4 py-2 text-sm font-bold text-[#ff7a00] hover:bg-[#ff7a00] hover:text-white transition"
              >
                Jugar ahora
              </button>
            </div>
          </div>
        </Suspense>
      </section>
    );
  }

  // Catálogo completo de juegos.
  return (
    <section className="game-hub mb-8">
      <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-6">
        PideTietar Play
      </h2>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-md">
        Elige un juego y pon a prueba tus reflejos mientras esperas tu pedido en
        el Valle del Tiétar.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => {
          const Icon = resolveGameIcon(game.icon ?? 'Gamepad2');
          return (
            <article
              key={game.id}
              className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 sm:p-5 hover:border-[#ff7a00] hover:shadow-md hover:shadow-[#ff7a00]/20 transition"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#ff7a00]/10 text-[#ff7a00] group-hover:bg-[#ff7a00] group-hover:text-white transition-colors mb-3">
                {Icon ? <Icon className="h-7 w-7" aria-hidden="true" /> : null}
              </div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base mb-1 group-hover:text-[#ff7a00] transition-colors">
                {game.title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 leading-relaxed">
                {game.description}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-700/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {game.category}
                </span>
                <button
                  type="button"
                  onClick={() => handlePlay(game)}
                  className="rounded-md border border-[#ff7a00] bg-[#ff7a00]/10 px-2.5 py-1 text-[10px] font-bold text-[#ff7a00] hover:bg-[#ff7a00] hover:text-white transition"
                >
                  Jugar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const GameHubLoadingFallback: React.FC = () => (
  <div className="flex h-32 items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50">
    <span className="text-sm text-stone-500 dark:text-stone-400">Cargando juego…</span>
  </div>
);
