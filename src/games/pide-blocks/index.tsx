/**
 * PideBlocks – wrapper del juego Blocks listo para jugar.
 *
 * Importa perezosamente el componente del juego y conecta el envío de
 * puntuación al endpoint /api/game/score cuando el jugador completa un
 * nivel o la partida termina.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { useApp, apiFetch } from '../../context/AppContext';
import './index.css';

const PideBlocksGame = React.lazy(() =>
  import('./PideBlocksGame').then((m) => ({ default: m.default })),
);

interface PideBlocksProps {}

export const PideBlocks: React.FC<PideBlocksProps> = () => {
  const { currentUser } = useApp();
  const [submitted, setSubmitted] = useState(false);

  const handleScoreSubmit = useCallback(
    async (score: number, levelId: number) => {
      if (submitted || !currentUser) return;
      setSubmitted(true);
      try {
        await apiFetch('/game/score', {
          method: 'POST',
          body: JSON.stringify({
            game: 'pide-blocks',
            score,
            level_reached: levelId,
          }),
        });
      } catch {
        // Error de red: no bloquear el juego
      } finally {
        setSubmitted(false);
      }
    },
    [currentUser, submitted],
  );

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#061033]">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-[#061033] text-white">
            Cargando Blocks…
          </div>
        }
      >
        <PideBlocksGame onScoreSubmit={handleScoreSubmit} />
      </Suspense>
    </div>
  );
};
