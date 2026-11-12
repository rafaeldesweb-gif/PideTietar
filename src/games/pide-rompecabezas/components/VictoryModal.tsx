import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Clock, Coins, Star, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { sound } from '../utils/audio';

interface VictoryModalProps {
  puzzleTitle: string;
  townOrZone: string;
  starsEarned: number;
  score: number;
  timeSeconds: number;
  coinsEarned: number;
  isNewRecord: boolean;
  hasNextPuzzle: boolean;
  isMultiplayer?: boolean;
  multiplayerStats?: {
    p1Name: string;
    p2Name: string;
    p1Score: number;
    p2Score: number;
    p1Pieces: number;
    p2Pieces: number;
  };
  onNextPuzzle: () => void;
  onReplay: () => void;
  onHome: () => void;
  onShowLeaderboard: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  puzzleTitle,
  townOrZone,
  starsEarned,
  score,
  timeSeconds,
  coinsEarned,
  isNewRecord,
  hasNextPuzzle,
  isMultiplayer = false,
  multiplayerStats,
  onNextPuzzle,
  onReplay,
  onHome,
  onShowLeaderboard,
}) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Sound effect trigger
    setTimeout(() => sound.playStar(2), 300);
    setTimeout(() => sound.playCoin(), 700);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)]"
        style={{
          background: 'linear-gradient(180deg, #1e1338 0%, #0f172a 100%)',
        }}
      >
        {/* Glow halo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* New Record Banner if applicable */}
        {!isMultiplayer && isNewRecord && (
          <div className="px-4 py-1 mb-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg animate-pulse">
            ★ ¡Nuevo Récord Personal! ★
          </div>
        )}

        {isMultiplayer && multiplayerStats ? (
          <div className="w-full flex flex-col items-center mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Resultado del Duelo
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-amber-200 to-yellow-300 mt-0.5">
              {multiplayerStats.p1Score > multiplayerStats.p2Score
                ? `¡Victoria de ${multiplayerStats.p1Name}!`
                : multiplayerStats.p2Score > multiplayerStats.p1Score
                ? `¡Victoria de ${multiplayerStats.p2Name}!`
                : '¡Empate de Honor en el Valle!'}
            </h2>

            {/* 2-Player Comparison Card */}
            <div className="w-full grid grid-cols-2 gap-2 my-3">
              <div
                className={`p-2.5 rounded-2xl border ${
                  multiplayerStats.p1Score >= multiplayerStats.p2Score
                    ? 'bg-sky-950/70 border-sky-400 ring-2 ring-sky-400/40'
                    : 'bg-black/30 border-white/10 opacity-75'
                }`}
              >
                <span className="text-[10px] text-sky-300 font-bold uppercase block truncate">
                  {multiplayerStats.p1Name}
                </span>
                <span className="text-base sm:text-lg font-black text-sky-200 block tabular-nums">
                  {multiplayerStats.p1Score.toLocaleString('es-ES')} pts
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {multiplayerStats.p1Pieces} piezas
                </span>
              </div>

              <div
                className={`p-2.5 rounded-2xl border ${
                  multiplayerStats.p2Score >= multiplayerStats.p1Score
                    ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-black/30 border-white/10 opacity-75'
                }`}
              >
                <span className="text-[10px] text-amber-300 font-bold uppercase block truncate">
                  {multiplayerStats.p2Name}
                </span>
                <span className="text-base sm:text-lg font-black text-amber-200 block tabular-nums">
                  {multiplayerStats.p2Score.toLocaleString('es-ES')} pts
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {multiplayerStats.p2Pieces} piezas
                </span>
              </div>
            </div>
          </div>
        ) : (
          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 drop-shadow">
            ¡Puzzle Completado!
          </h2>
        )}
        <p className="text-xs sm:text-sm text-amber-200/80 mt-0.5 font-medium">{puzzleTitle}</p>
        <p className="text-[11px] text-slate-400">{townOrZone} · Valle del Tiétar</p>

        {/* 3 Large Animated Stars */}
        <div className="flex items-center justify-center gap-3 my-5">
          {[1, 2, 3].map((starNum) => (
            <div
              key={starNum}
              className={`transform transition-all duration-500 ${
                starsEarned >= starNum ? 'scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]' : 'opacity-30 scale-90'
              }`}
            >
              <Star
                className={`w-10 h-10 sm:w-12 sm:h-12 ${
                  starsEarned >= starNum
                    ? 'text-amber-300 fill-amber-300'
                    : 'text-slate-600 fill-transparent'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Score & Rewards Cards Grid */}
        <div className="w-full grid grid-cols-3 gap-2.5 my-3">
          {/* Puntuación */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-amber-500/30">
            <Trophy className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Puntuación</span>
            <span className="text-base sm:text-lg font-bold text-amber-300 tabular-nums">
              {score.toLocaleString('es-ES')}
            </span>
          </div>

          {/* Tiempo */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-amber-500/30">
            <Clock className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Tiempo</span>
            <span className="text-base sm:text-lg font-bold text-sky-300 tabular-nums">
              {formatTime(timeSeconds)}
            </span>
          </div>

          {/* Monedas */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-amber-500/30">
            <Coins className="w-5 h-5 text-yellow-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Monedas</span>
            <span className="text-base sm:text-lg font-bold text-yellow-300 tabular-nums">
              +{coinsEarned}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 mt-4">
          {hasNextPuzzle && (
            <button
              onClick={onNextPuzzle}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-sm shadow-[0_4px_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <span>Siguiente Imagen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="w-full flex items-center gap-2">
            <button
              onClick={onReplay}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Repetir</span>
            </button>

            <button
              onClick={onShowLeaderboard}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Ranking</span>
            </button>

            <button
              onClick={onHome}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors cursor-pointer"
              title="Menú Principal"
            >
              <Home className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
