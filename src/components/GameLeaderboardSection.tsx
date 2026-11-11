import React, { useEffect, useState } from 'react';
import { useApp, apiFetch } from '../context/AppContext';
import type { GameLeaderboardEntry, User } from '../types';
import { Trophy } from 'lucide-react';

const GAME_ID = 'reparto-express';
const WINNER_IMAGE = '/assets/games/reparto-express/moto-victoria-neon.webp';
const AVATAR_FALLBACK = '/Logo.png';

const formatEs = (value: Date | string | null): string => {
  if (!value) return '—';
  const d =
    value instanceof Date
      ? value
      : new Date(String(value).replace(' ', 'T') + (String(value).includes('T') && /[Z+-]\d\d:?\d\d$/.test(String(value)) ? '' : 'Z'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
};

const placeStyle = (position: number) => {
  switch (position) {
    case 1:
      return 'bg-gradient-to-b from-[#ffd400] to-[#b8860b] text-[#061033] shadow-[0_0_12px_rgba(255,212,0,0.6)]';
    case 2:
      return 'bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] text-white shadow-[0_0_12px_rgba(160,160,160,0.55)]';
    case 3:
      return 'bg-gradient-to-b from-[#cd7f32] to-[#8b4513] text-white shadow-[0_0_12px_rgba(205,127,50,0.6)]';
    default:
      return 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100';
  }
};

interface GameLeaderboardSectionProps {
  currentUser: User | null;
  onOpenGame: () => void;
  onRequestLogin: () => void;
}

export const GameLeaderboardSection: React.FC<GameLeaderboardSectionProps> = ({
  currentUser,
  onOpenGame,
  onRequestLogin,
}) => {
  const [leaders, setLeaders] = useState<GameLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(
          `/game/leaderboard/public?game=${encodeURIComponent(GAME_ID)}&limit=3`,
        );
        if (!cancelled) setLeaders(Array.isArray(data?.leaders) ? data.leaders : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'No se pudo cargar el ranking.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = () => (currentUser ? onOpenGame() : onRequestLogin());

  return (
    <section className="game-leaderboard__wrap mb-8">
      <button
        type="button"
        onClick={handleClick}
        aria-label={
          currentUser
            ? 'Abrir el juego Reparto Express'
            : 'Inicia sesión para jugar a Reparto Express y aparecer en el ranking'
        }
        className={
          'appearance-none border-none rounded-2xl border border-stone-200 dark:border-stone-700 ' +
          'bg-white dark:bg-stone-900 shadow-lg text-left p-3 lg:p-4 m-0 w-full cursor-pointer group relative ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e00] ' +
          'focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-950 ' +
          'transition hover:border-cyan-500/50 dark:hover:border-cyan-500/40'
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start">

          {/* Izquierda: imagen del repartidor ganador */}
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 dark:border-cyan-500/20 bg-gradient-to-b from-[#061033] to-[#0a1a4a] shadow-[0_0_30px_rgba(0,229,255,0.15)]">
            <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_50%_-15%_,rgba(0,229,255,0.22),rgba(6,16,51,0))] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(600px_ellipse_at_110%_25%_,rgba(176,38,255,0.16),rgba(6,16,51,0))] pointer-events-none" />
            <div className="relative z-10 p-3 lg:p-4 flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffd400]/15 border border-[#ffd400]/45 px-2 py-0.5 text-[9px] font-bold text-[#ffd400] uppercase tracking-wider shadow-[0_0_10px_rgba(255,212,0,0.4)]">
                🏆 1.er GANADOR
              </span>
              <img
                src={WINNER_IMAGE}
                alt="Repartidor ganador de Reparto Express con los brazos en alto y la caja de PideTiétar"
                className="w-full max-w-[50px] aspect-square object-contain drop-shadow-[0_0_18px_rgba(0,229,255,0.45)]"
                loading="lazy"
                onError={(event) => {
                  const target = event.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <p className="mt-2 text-[10px] font-semibold text-[#bfe9ff] leading-snug text-center">
                El repartidor que gana el juego &middot; PideTiétar
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold text-orange-300">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                Reparto Express
              </span>
            </div>
          </div>

          {/* Derecha: top 3 puntuaciones */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-[#ffd400] drop-shadow-[0_0_8px_rgba(255,212,0,0.5)]" />
              <h3 className="text-[16px] font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-none">
                Mejores repartidores
              </h3>
              <span className="ml-auto px-2 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Reparto Express
              </span>
            </div>

            {loading ? (
              <ol className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="game-leaderboard__skeleton flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-2 py-1.5 animate-pulse">
                    <span className="shrink-0 h-6 w-6 rounded-md bg-stone-300 dark:bg-stone-600" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-2 w-3/4 rounded bg-stone-300 dark:bg-stone-600" />
                      <div className="h-1.5 w-1/3 rounded bg-stone-300 dark:bg-stone-600" />
                    </div>
                    <div className="h-4 w-14 rounded-md bg-stone-300 dark:bg-stone-600" />
                  </li>
                ))}
              </ol>
            ) : error ? (
              <p className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/40 p-3 text-xs text-red-800 dark:text-red-200">
                {error}
              </p>
            ) : leaders.length === 0 ? (
              <p className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                Aún no hay puntuaciones registradas.{' '}
                {currentUser ? 'Juega para ser el primero.' : 'Inicia sesión para jugar.'}
              </p>
            ) : (
              <ol className="game-leaderboard__list space-y-3">
                {leaders.map((leader, index) => {
                  const position = index + 1;
                  return (
                    <li
                      key={leader.userId || position}
                      className={
                        'relative rounded-lg border border-stone-200 dark:border-stone-700 bg-white/50 dark:bg-stone-800/50 px-2 py-1.5 flex items-center gap-2 ' +
                        'hover:border-cyan-500/40 dark:hover:border-cyan-500/20 transition'
                      }
                    >
                      <span
                        className={
                          'shrink-0 flex h-6 w-6 items-center justify-center rounded-md font-bold text-[9px] ' + placeStyle(position)
                        }
                      >
                        {position}
                      </span>
                      <img
                        src={leader.avatarUrl || AVATAR_FALLBACK}
                        alt=""
                        className="h-6 w-6 rounded-full border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-700 object-cover"
                        onError={(event) => {
                          const target = event.target as HTMLImageElement;
                          target.src = AVATAR_FALLBACK;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {leader.name || 'Repartidor anónimo'}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {formatEs(leader.playedAt)}
                        </p>
                      </div>
                      <span className="text-right font-bold text-stone-800 dark:text-stone-200">
                        {leader.score} pts
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

        </div>

      </button>
    </section>
  );
};
