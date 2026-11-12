import React from 'react';
import { Trophy, ArrowRight, RotateCcw, Sparkles, Award } from 'lucide-react';
import { LevelConfig } from '../game/types';

interface LevelCompleteModalProps {
  isOpen: boolean;
  level: LevelConfig;
  score: number;
  xpEarned: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplayLevel: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  isOpen,
  level,
  score,
  xpEarned,
  hasNextLevel,
  onNextLevel,
  onReplayLevel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md select-none animate-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-yellow-500/80 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.3)] p-6 text-slate-100 flex flex-col items-center text-center space-y-4">
        {/* Glowing Trophy Badge */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(250,204,21,0.7)] animate-bounce">
            <Trophy className="w-8 h-8 fill-current" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-200 animate-spin" />
        </div>

        {/* Title */}
        <div>
          <span className="text-xs uppercase tracking-widest text-yellow-400 font-bold">
            ¡Nivel Superado!
          </span>
          <h2 className="text-2xl font-black font-cinzel text-white mt-0.5">
            {level.location}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{level.subtitle}</p>
        </div>

        {/* Unlocked Artifact Card */}
        <div className="w-full p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-800 to-purple-950/60 border border-purple-400/60 shadow-inner flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-purple-900/80 border border-purple-400 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.5)]">
            {level.unlockIcon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-yellow-400 font-bold tracking-wider uppercase block">
              ¡Recompensa Desbloqueada!
            </span>
            <h4 className="text-sm font-bold text-slate-100 truncate">
              {level.unlockName}
            </h4>
            <p className="text-xs text-purple-200 leading-tight">
              {level.unlockDescription}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">Puntuación</span>
            <span className="text-base font-bold font-mono text-cyan-300">
              {score.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium">XP Obtenida</span>
            <span className="text-base font-bold font-mono text-emerald-300">
              +{xpEarned} XP
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-2 pt-2">
          {hasNextLevel ? (
            <button
              onClick={onNextLevel}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Siguiente Nivel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-3 bg-gradient-to-r from-yellow-950/60 via-amber-900/60 to-yellow-950/60 border border-yellow-500/60 rounded-xl text-yellow-200 text-xs font-semibold flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>¡Has completado todos los niveles del Valle del Tiétar!</span>
            </div>
          )}

          <button
            onClick={onReplayLevel}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repetir este Nivel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
