import React from 'react';
import { X, Award, CheckCircle2, Lock, Sparkles, Shield } from 'lucide-react';
import { LevelConfig, Mission } from '../game/types';
import { TIETAR_LEVELS } from '../game/tietarLevels';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: LevelConfig;
  completedLevelIds: number[];
  missions: Mission[];
  xp: number;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  completedLevelIds,
  missions,
  xp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold font-cinzel tracking-wider text-white">
              Misiones y Reliquias del Valle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Active Level Missions */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Desafíos de {currentLevel.name}: {currentLevel.location}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                XP Total: <strong className="text-emerald-400 font-bold">{xp}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {missions.map((m) => {
                const percent = Math.min(100, Math.round((m.current / m.target) * 100));
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border transition-all ${
                      m.completed
                        ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold ${
                              m.completed ? 'text-emerald-300' : 'text-slate-200'
                            }`}
                          >
                            {m.title}
                          </span>
                          {m.completed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Completada (+{m.rewardXp} XP)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                      </div>

                      <span className="text-xs font-mono font-semibold text-slate-300 tabular-nums shrink-0">
                        {m.current} / {m.target}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          m.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Unlockable Rewards per Level */}
          <section>
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2.5">
              <Shield className="w-4 h-4" />
              Recompensas y Reliquias de los 5 Niveles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TIETAR_LEVELS.map((lvl) => {
                const isUnlocked = completedLevelIds.includes(lvl.id);
                return (
                  <div
                    key={lvl.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-purple-950/40 via-slate-800/80 to-slate-900 border-purple-500/50 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border ${
                        isUnlocked
                          ? 'bg-purple-900/60 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      {isUnlocked ? lvl.unlockIcon : <Lock className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {lvl.unlockName}
                        </span>
                        <span className="text-[10px] text-purple-300 font-mono shrink-0 ml-1">
                          {isUnlocked ? 'DESBLOQUEADO' : `Nivel ${lvl.id}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-cyan-400 font-medium block">
                        {lvl.unlockType}
                      </span>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {lvl.unlockDescription}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Continuar Jugando
          </button>
        </div>
      </div>
    </div>
  );
};
