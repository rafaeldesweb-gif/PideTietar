import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useApp } from '../context/AppContext';
import { sessionStore } from '../utils/browserSession';

const readLocalScore = (key: string): number => {
  const value = Number(sessionStore.getItem(key) ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

/**
 * Mantiene el récord de un juego en la sesión y lo replica en el servidor
 * cuando hay un usuario autenticado.
 */
export const useGameScore = (gameId: string, localKey: string) => {
  const { currentUser, showNotification } = useApp();
  const [bestScore, setBestScore] = useState(() => readLocalScore(localKey));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (!currentUser) return () => { active = false; };

    void apiFetch(`/game/score?game=${encodeURIComponent(gameId)}`)
      .then((data) => {
        if (!active || typeof data?.bestScore !== 'number') return;
        setBestScore((current) => Math.max(current, data.bestScore));
        if (data.bestScore > readLocalScore(localKey)) {
          sessionStore.setItem(localKey, String(data.bestScore));
        }
      })
      .catch(() => {
        // El récord local sigue disponible si el servidor no responde.
      });

    return () => { active = false; };
  }, [currentUser, gameId, localKey]);

  const saveScore = useCallback(async (score: number, levelReached = 1) => {
    const safeScore = Math.max(0, Math.min(100000, Math.floor(score)));
    const safeLevel = Math.max(1, Math.min(5, Math.floor(levelReached)));
    const previous = readLocalScore(localKey);
    if (safeScore > previous) {
      sessionStore.setItem(localKey, String(safeScore));
      setBestScore(safeScore);
    }

    if (!currentUser) return;

    setSaving(true);
    try {
      await apiFetch('/game/score', {
        method: 'POST',
        body: JSON.stringify({
          game: gameId,
          score: safeScore,
          level_reached: safeLevel,
        }),
      });
      showNotification('Puntuación guardada en tu perfil.', 'success');
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'No se pudo guardar la puntuación.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }, [currentUser, gameId, localKey, showNotification]);

  return { bestScore, saving, saveScore };
};
