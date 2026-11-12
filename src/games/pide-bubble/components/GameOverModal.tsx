import React from 'react';
import { RotateCcw, Home, Trophy, Gift, AlertCircle } from 'lucide-react';
import { LevelConfig } from '../types/game';

interface GameOverModalProps {
  isOpen: boolean;
  level: LevelConfig;
  score: number;
  highScore: number;
  onRetry: () => void;
  onTitleMenu: () => void;
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  level,
  score,
  highScore,
  onRetry,
  onTitleMenu,
  onOpenLeaderboard,
  onOpenRewards,
}) => {
  if (!isOpen) return null;

  const isNewRecord = score > highScore && score > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md game-glass-panel rounded-3xl p-6 border-2 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.35)] text-white text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center mx-auto mb-3 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
          ¡FIN DE PARTIDA!
        </span>
        <h2 className="text-2xl font-extrabold text-white mt-0.5">
          {level.name} (Nivel {level.level})
        </h2>
        <p className="text-xs text-purple-300 mt-1">
          ¡Las burbujas llegaron al límite o te quedaste sin tiros!
        </p>

        {/* Score Box */}
        <div className="my-4 bg-purple-950/70 p-4 rounded-2xl border border-purple-700/50 space-y-2 text-xs">
          <div className="flex items-center justify-between text-purple-200">
            <span>Puntaje Alcanzado:</span>
            <span className="font-mono font-extrabold text-[#00f0ff] text-glow-cyan text-lg">
              {score.toLocaleString('es-ES')}
            </span>
          </div>

          <div className="flex items-center justify-between text-purple-200 pt-1 border-t border-purple-800/40">
            <span>Mejor Récord:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {Math.max(score, highScore).toLocaleString('es-ES')}
            </span>
          </div>

          {isNewRecord && (
            <div className="text-xs font-bold text-amber-300 bg-amber-500/20 py-1 rounded-lg border border-amber-500/30">
              🎉 ¡Nuevo Récord Personal!
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={onRetry}
            className="w-full py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 rounded-2xl text-white font-extrabold text-sm tracking-wide shadow-[0_0_24px_rgba(255,42,141,0.5)] transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINTENTAR NIVEL {level.level}</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onTitleMenu}
              className="py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Ranking</span>
            </button>

            <button
              onClick={onOpenRewards}
              className="py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <Gift className="w-3.5 h-3.5 text-pink-400" />
              <span>Premios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
