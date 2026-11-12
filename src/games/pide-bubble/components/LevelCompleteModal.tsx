import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Gift, ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import { LevelConfig } from '../types/game';

interface LevelCompleteModalProps {
  isOpen: boolean;
  level: LevelConfig;
  score: number;
  bubblesSaved: number;
  onNextLevel: () => void;
  onReplayLevel: () => void;
  onOpenLeaderboard: () => void;
  hasNextLevel: boolean;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  isOpen,
  level,
  score,
  bubblesSaved,
  onNextLevel,
  onReplayLevel,
  onOpenLeaderboard,
  hasNextLevel,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger festive colorful confetti
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff2a8d', '#00f0ff', '#ffc700', '#00f076', '#a855f7'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const bubbleBonus = bubblesSaved * 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md game-glass-panel rounded-3xl p-6 border-2 border-amber-400/60 shadow-[0_0_50px_rgba(255,199,0,0.45)] text-white text-center overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* 3 Stars Banner */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <Star className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_#ffc700] rotate-[-12deg]" />
          <Star className="w-12 h-12 text-yellow-300 fill-yellow-300 drop-shadow-[0_0_15px_#ffee33] -translate-y-2 scale-110" />
          <Star className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_#ffc700] rotate-[12deg]" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
          ¡NIVEL {level.level} COMPLETADO!
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
          {level.name}
        </h2>

        {/* Score & Bonus Breakdown */}
        <div className="my-4 bg-purple-950/70 p-4 rounded-2xl border border-purple-700/50 space-y-2 text-xs">
          <div className="flex items-center justify-between text-purple-200">
            <span>Puntos de Burbujas:</span>
            <span className="font-mono font-bold text-white text-sm">
              {score.toLocaleString('es-ES')}
            </span>
          </div>

          <div className="flex items-center justify-between text-purple-200">
            <span>Burbujas ahorradas ({bubblesSaved}):</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              +{bubbleBonus.toLocaleString('es-ES')}
            </span>
          </div>

          <div className="pt-2 border-t border-purple-800/50 flex items-center justify-between text-sm font-extrabold text-white">
            <span>Total Nivel:</span>
            <span className="font-mono text-[#00f0ff] text-glow-cyan text-lg">
              {(score + bubbleBonus).toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        {/* Unlocked Reward Card */}
        <div className="mb-5 bg-gradient-to-r from-pink-950/80 via-purple-950/80 to-amber-950/80 p-3.5 rounded-2xl border border-pink-500/50 shadow-md text-left flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-pink-500/30 border border-pink-400/50 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-pink-300" />
          </div>

          <div className="flex-1 truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-pink-300 uppercase">
                ¡Recompensa Desbloqueada!
              </span>
              <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                +{level.rewardXP} XP
              </span>
            </div>
            <div className="text-sm font-extrabold text-white mt-0.5 truncate">
              {level.rewardCoupon.title} · {level.rewardCoupon.discountText}
            </div>
            <p className="text-[11px] text-purple-300/90 truncate">
              Código: <strong className="text-white font-mono">{level.rewardCoupon.code}</strong> (disponible en tu billetera)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {hasNextLevel ? (
            <button
              onClick={onNextLevel}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 rounded-2xl text-white font-extrabold text-sm tracking-wide shadow-[0_0_24px_rgba(255,42,141,0.5)] transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>SIGUIENTE NIVEL {level.level + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenLeaderboard}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl text-purple-950 font-black text-sm tracking-wide shadow-[0_0_25px_rgba(255,200,0,0.6)] transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-5 h-5 fill-current" />
              <span>¡JUEGO SUPERADO! VER MI RANKING</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onReplayLevel}
              className="flex-1 py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repetir Nivel</span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="flex-1 py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Ranking</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
