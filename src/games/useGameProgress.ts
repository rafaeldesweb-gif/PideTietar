import { useCallback, useEffect, useState } from 'react';
import { apiFetch, useApp } from '../context/AppContext';
import { sessionStore } from '../utils/browserSession';
import {
  mergeCompletedLevels,
  parseCompletedLevels,
  userProgressKey,
  withCompletedLevel,
} from './gameProgress';

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
  const userId = currentUser?.id ? String(currentUser.id) : null;
  const [completed, setCompleted] = useState<number[]>([]);
  const [ready, setReady] = useState(!userId);

  useEffect(() => {
    let active = true;
    // Las claves antiguas no tenían usuario y no se pueden atribuir con
    // seguridad. Se ignoran y se eliminan para que ningún usuario las herede.
    sessionStore.removeItem(localKey);

    if (!userId) {
      setCompleted([]);
      setReady(true);
      return () => {
        active = false;
      };
    }

    const scopedKey = userProgressKey(localKey, userId);
    const local = parseCompletedLevels(sessionStore.getItem(scopedKey), maxLevel);
    // Al cambiar de cuenta se sustituye inmediatamente el estado visible por
    // el de esa cuenta, antes de consultar el servidor.
    setCompleted(local);
    setReady(false);
    void apiFetch(`/game/progress?game=${encodeURIComponent(gameId)}`)
      .then((data) => {
        if (!active) return;
        // Se vuelve a leer la caché: el jugador puede haber terminado un nivel
        // mientras la consulta GET estaba en vuelo.
        const latestLocal = parseCompletedLevels(sessionStore.getItem(scopedKey), maxLevel);
        const merged = mergeCompletedLevels(latestLocal, data?.levels, maxLevel);
        sessionStore.setItem(scopedKey, merged.join(','));
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
        if (userId) {
          sessionStore.setItem(userProgressKey(localKey, userId), next.join(','));
        }
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
