/**
 * GameDetailView – vista de detalle de un juego de PideTietar Play.
 *
 * Se muestra como una tarjeta superpuesta con la portada del juego a la
 * izquierda y la lista de mejores jugadores a la derecha. En móvil se
 * apilan verticalmente. Las portadas nunca se cortan (object-contain con
 * altura limitada).
 */

import React, { useEffect, useState } from 'react';
import { useApp, apiFetch } from '../context/AppContext';
import type { GameLeaderboardEntry, User } from '../types';
import type { GameEntry } from '../games/registry';
import { findGameById } from '../games/registry';
import { ArrowLeft, Play, Trophy } from 'lucide-react';

const AVATAR_FALLBACK = '/Logo.png';

const formatEs = (value: Date | string | null): string => {
  if (!value) return '—';
  const d =
    value instanceof Date
      ? value
      : new Date(
          String(value).replace(' ', 'T') +
            (String(value).includes('T') &&
            /[Z+-]\d\d:?\d\d$/.test(String(value))
              ? ''
              : 'Z'),
        );
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const placeBadge = (position: number): string => {
  switch (position) {
    case 1:
      return 'bg-gradient-to-b from-[#ffd400] to-[#b8860b] text-[#061033] shadow-[0_0_10px_rgba(255,212,0,0.6)]';
    case 2:
      return 'bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] text-white shadow-[0_0_8px_rgba(160,160,160,0.5)]';
    case 3:
      return 'bg-gradient-to-b from-[#cd7f32] to-[#8b4513] text-white shadow-[0_0_8px_rgba(205,127,50,0.6)]';
    default:
      return 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100';
  }
};

interface GameDetailViewProps {
  currentUser: User | null;
  /** Identificador del juego cuyos detalles se muestran. */
  gameId: string;
  /** Vuelve al selector de juegos (oculta esta vista). */
  onBack: () => void;
  /** Abre el juego para jugar. */
  onOpenGame: (game: GameEntry) => void;
  /** Solicita iniciar sesión. */
  onRequestLogin: () => void;
}

export const GameDetailView: React.FC<GameDetailViewProps> = ({
  currentUser,
  gameId,
  onBack,
  onOpenGame,
  onRequestLogin,
}) => {
  const game = findGameById(gameId);
  const [leaders, setLeaders] = useState<GameLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const data = await apiFetch(
          `/game/leaderboard/public?game=${encodeURIComponent(gameId)}&limit=20`,
        );
        const rows = Array.isArray(data?.leaders) ? data.leaders : [];
        rows.sort((a: GameLeaderboardEntry, b: GameLeaderboardEntry) => b.score - a.score);
        setLeaders(rows);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el ranking.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameId]);

  const gameIcon = game?.image ?? null;

  const handlePlay = () => {
    if (!currentUser) {
      onRequestLogin();
      return;
    }
    if (game) onOpenGame(game);
  };

  if (!game) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#061033] text-white">
        <button
          type="button"
          onClick={onBack}
          className="absolute top-4 left-4"
        >
          <ArrowLeft className="w-6 h-6 text-stone-400" />
        </button>
        <h2 className="mt-8 text-xl font-bold">Juego no encontrado</h2>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {/* Tarjeta del juego: mitad del ancho de una ficha de negocio en escritorio */}
      <div className="w-full max-w-[700px] rounded-2xl border border-white/10 bg-[#061033] shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Cabecera con vuelta y título del juego */}
        <header className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#061033]/50">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 hover:text-stone-300 transition"
          >
            <ArrowLeft className="w-4 h-4 text-stone-400" />
            <span className="text-[10px] font-medium text-stone-300">Volver</span>
          </button>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-[#ffd400]" />
            <h1 className="text-xs font-bold">{game.title}</h1>
          </div>
          <div className="w-4" />
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-3">
          {/* Portada del juego a la izquierda y jugadores a la derecha.
               En móvil se apilan (flex-col); en escritorio van lado a lado (flex-row). */}
          <div className="flex flex-col sm:flex-row gap-3 items-start w-full">
            {/* Columna izquierda: portada */}
            <div className="flex flex-col items-center justify-center w-full sm:w-1/2">
              <img
                src={gameIcon!}
                alt={game.title}
                className="max-w-full max-h-[240px] w-auto h-auto object-contain rounded-xl shadow-[0_0_24px_rgba(0,0,0,0.7)] drop-shadow-[0_0_12px_rgba(255,122,0,0.35)] sm:max-h-[260px]"
                aria-hidden="true"
                onError={(event) => {
                  const target = event.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <h2 className="mt-2.5 text-[10px] font-bold tracking-tight">{game.title}</h2>
              <p className="mt-0.5 text-[9px] text-stone-400 uppercase tracking-wider">
                {game.category}
              </p>
            </div>

            {/* Columna derecha: lista de mejores jugadores */}
            <section className="flex-1 w-full sm:w-1/2">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                  Mejores jugadores
                </h3>
                <span className="text-[8px] font-medium px-1.5 py-0.5 rounded border border-stone-600 bg-stone-900/50 text-stone-400">
                  {leaders.length} jugadores
                </span>
              </div>

              {loading ? (
                <div className="h-20 flex items-center justify-center">
                  <p className="text-stone-400 text-[10px]">Cargando jugadores…</p>
                </div>
              ) : error ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-center text-[9px] text-red-400">
                  {error}
                </div>
              ) : leaders.length === 0 ? (
                <div className="rounded-lg border border-stone-600 bg-stone-900/50 p-2.5 text-center">
                  <p className="text-stone-400 text-[9px]">
                    Aún no hay puntuaciones registradas.{currentUser ? ' Juega para ser el primero.' : ' Inicia sesión.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 rounded-lg border border-stone-600 bg-stone-900/50 overflow-hidden">
                  {leaders.map((leader) => {
                    const position = leader.position ?? 0;
                    return (
                      <div
                        key={leader.userId || position}
                        className="flex items-center gap-2 px-2.5 py-1.5 border-b border-stone-700/50 last:border-0 hover:bg-stone-800/30 transition"
                      >
                        <span
                          className={
                            'shrink-0 flex w-5 h-5 items-center justify-center rounded-md font-bold text-[9px] ' +
                            placeBadge(position)
                          }
                        >
                          {position}
                        </span>
                        <img
                          src={leader.avatarUrl || AVATAR_FALLBACK}
                          alt=""
                          className="w-6 h-6 rounded-full border border-stone-600 bg-stone-700 object-cover"
                          onError={(event) => {
                            const target = event.target as HTMLImageElement;
                            target.src = AVATAR_FALLBACK;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-semibold text-stone-100 truncate">
                            {leader.name || 'Jugador anónimo'}
                          </p>
                          <p className="text-[8px] text-stone-400">
                            {formatEs(leader.playedAt)}
                          </p>
                        </div>
                        <span className="text-right font-mono font-bold text-stone-200 text-[9px]">
                          {leader.score} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Botón jugar ahora */}
        <footer className="p-3 border-t border-white/10 bg-[#061033]">
          <div className="max-w-sm mx-auto">
            <button
              type="button"
              disabled={!game.available || !currentUser}
              onClick={handlePlay}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#0ea5e9] px-4 py-2 text-[9px] font-bold text-white shadow-[0_0_14px_rgba(14,165,233,0.4)] hover:bg-[#0ea5e9]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!game.available ? (
                <span>Próximamente</span>
              ) : currentUser ? (
                <>
                  <Play className="w-3 h-3" />
                  Jugar ahora
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Inicia sesión para jugar
                </>
              )}
            </button>
            {!currentUser && (
              <p className="mt-1.5 text-[8px] text-stone-400 text-center">
                Inicia sesión para jugar y aparecer en este ranking.
              </p>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
