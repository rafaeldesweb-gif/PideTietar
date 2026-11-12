/**
 * PideRompecabezas – wrapper del juego Rompecabezas listo para jugar.
 *
 * Importa perezosamente el componente del juego y conecta el envío de
 * puntuación al endpoint /api/game/score al completar un rompecabezas.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { useApp, apiFetch } from '../../context/AppContext';
import './rompecabezas.css';

const RompecabezasGame = React.lazy(() =>
  import('./RompecabezasGame').then((m) => ({ default: m.default })),
);

type PideRompecabezasProps = Record<string, unknown>;

export const PideRompecabezas: React.FC<PideRompecabezasProps> = () => {
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
            game: 'rompecabezas',
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
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#18112d]">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-[#18112d] text-white">
            Cargando Rompecabezas…
          </div>
        }
      >
        <RompecabezasGame onScoreSubmit={handleScoreSubmit} />
      </Suspense>
    </div>
  );
};
