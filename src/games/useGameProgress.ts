import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useApp } from '../context/AppContext';
import { sessionStore } from '../utils/browserSession';
import { mergeCompletedLevels, parseCompletedLevels, withCompletedLevel } from './gameProgress';

interface GameProgressOptions {
  /** Identificador del juego en el servidor («memory-html», «classic-puzzle»…). */
  gameId: string;
  /** Nivel máximo del catálogo; los valores de fuera se descartan. */
  maxLevel: number;
  /** Clave de `sessionStorage` que actúa de caché y respaldo. */
  localKey: string;
}

/**
 * Mantiene los niveles desbloqueados de un juego para el usuario actual.
 *
 * - Arranca con lo guardado en la pestaña, para que la partida no parpadee.
 * - Si hay sesión, mezcla el avance del servidor (sobrevive a otro dispositivo).
 * - Al completar un nivel lo guarda en ambos sitios; si el POST falla, la
 *   pestaña conserva el avance y se reintenta al volver a jugar.
 */
export const useGameProgress = ({ gameId, maxLevel, localKey }: GameProgressOptions) => {
  const { currentUser } = useApp();
  const userId = currentUser?.id ?? null;
  const [completed, setCompleted] = useState<number[]>(() =>
    parseCompletedLevels(sessionStore.getItem(localKey), maxLevel),
  );
  const [ready, setReady] = useState(!userId);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    setReady(false);
    void apiFetch(`/game/progress?game=${encodeURIComponent(gameId)}`)
      .then((data) => {
        if (!active) return;
        const local = parseCompletedLevels(sessionStore.getItem(localKey), maxLevel);
        const merged = mergeCompletedLevels(local, data?.levels, maxLevel);
        sessionStore.setItem(localKey, merged.join(','));
        setCompleted(merged);
      })
      .catch(() => {
        // Sin conexión se conserva el avance de la pestaña.
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [gameId, localKey, maxLevel, userId]);

  const completeLevel = useCallback(
    (level: number) => {
      setCompleted((previous) => {
        const next = withCompletedLevel(previous, level, maxLevel);
        if (next.length === previous.length) return previous;
        sessionStore.setItem(localKey, next.join(','));
        return next;
      });

      if (!userId) return;
      void apiFetch('/game/progress', {
        method: 'POST',
        body: JSON.stringify({ game: gameId, level }),
      }).catch(() => {
        // La sesión mantiene el nivel; al volver a entrar se fusionará.
      });
    },
    [gameId, localKey, maxLevel, userId],
  );

  return { completed, ready, completeLevel };
};
