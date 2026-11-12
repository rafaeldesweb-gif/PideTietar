/**
 * PideBubble – wrapper del juego Burbujas listo para jugar.
 *
 * Importa perezosamente el componente del juego y conecta el envío de
 * puntuación al endpoint /api/game/score cuando el jugador completa un
 * nivel o la partida termina.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { useApp, apiFetch } from '../../context/AppContext';

const BubbleGame = React.lazy(() =>
  import('./BubbleGame').then((m) => ({ default: m.default })),
);

type PideBubbleProps = Record<string, unknown>;

export const PideBubble: React.FC<PideBubbleProps> = () => {
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
            game: 'burbujas',
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
    <div className="w-full h-full overflow-hidden flex flex-col bg-[#0a0520]">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-[#0a0520] text-white">
            Cargando Burbujas…
          </div>
        }
      >
        <BubbleGame onScoreSubmit={handleScoreSubmit} />
      </Suspense>
    </div>
  );
};
