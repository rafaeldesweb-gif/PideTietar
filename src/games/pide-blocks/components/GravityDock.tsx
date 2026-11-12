import React from 'react';
import { ArrowDownToLine, Target } from 'lucide-react';

interface GravityDockProps {
  charges: number;
  maxCharges: number;
  onUseGravity: () => void;
  onOpenMissions: () => void;
  missionsCompletedCount: number;
  totalMissionsCount: number;
  isGravityAnimating: boolean;
}

export const GravityDock: React.FC<GravityDockProps> = ({
  charges,
  maxCharges,
  onUseGravity,
  onOpenMissions,
  missionsCompletedCount,
  totalMissionsCount,
  isGravityAnimating,
}) => {
  const hasCharges = charges > 0;

  return (
    <footer className="relative w-full max-w-4xl mx-auto px-3 py-2 flex items-center justify-between gap-3 z-20 select-none">
      {/* Spacer or Left Helper indicator */}
      <div className="w-16 hidden sm:block" />

      {/* Centerpiece: "Usar carga de gravedad" button matching screenshot */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <button
          onClick={onUseGravity}
          disabled={!hasCharges || isGravityAnimating}
          className={`group relative flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border-2 transition-all duration-200 cursor-pointer ${
            hasCharges
              ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.35)] active:scale-95 hover:border-yellow-300'
              : 'bg-slate-900/80 border-slate-700/60 opacity-60 cursor-not-allowed shadow-none'
          }`}
          title="Colapsa todos los bloques flotantes hacia abajo con física de gravedad (Espacio o G)"
          aria-label="Usar carga de gravedad"
        >
          {/* Circular Downward Arrow Emblem */}
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all ${
              hasCharges
                ? 'bg-slate-950 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.6)] group-hover:scale-105'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
          >
            <ArrowDownToLine
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                hasCharges ? 'animate-bounce' : ''
              }`}
            />
          </div>

          {/* Text Label */}
          <span
            className={`text-xs sm:text-sm font-semibold tracking-wide uppercase transition-colors ${
              hasCharges ? 'text-slate-100 group-hover:text-yellow-200' : 'text-slate-500'
            }`}
          >
            Usar carga de gravedad
          </span>

          {/* Key shortcut hint for desktop */}
          <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-yellow-400 bg-yellow-950/60 border border-yellow-500/40 rounded">
            ESPACIO
          </span>
        </button>

        {/* 3+ Crimson / Ruby Glowing Charge Indicator Bars beneath the button */}
        <div className="flex items-center gap-2 mt-2">
          {Array.from({ length: maxCharges }).map((_, idx) => {
            const isFilled = idx < charges;
            return (
              <div
                key={idx}
                className={`h-2 sm:h-2.5 w-6 sm:w-8 rounded-full border transition-all duration-300 ${
                  isFilled
                    ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                    : 'bg-slate-950 border-slate-800 opacity-40'
                }`}
                title={`Carga ${idx + 1} de ${maxCharges}`}
              />
            );
          })}
        </div>
      </div>

      {/* Right Side: "Misiones" Button matching screenshot */}
      <div className="flex flex-col items-center">
        <button
          onClick={onOpenMissions}
          className="group flex flex-col items-center gap-1 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-b from-sky-900/80 to-slate-900 border border-cyan-500/60 hover:border-cyan-400 text-cyan-200 shadow-md active:scale-95 transition-all cursor-pointer"
          title="Ver desafíos y recompensas del nivel"
          aria-label="Abrir Misiones"
        >
          {/* Hexagonal socket indicators */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalMissionsCount }).map((_, idx) => {
              const completed = idx < missionsCompletedCount;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm border rotate-45 transition-all ${
                    completed
                      ? 'bg-cyan-400 border-white shadow-[0_0_6px_rgba(34,211,238,0.9)]'
                      : 'bg-slate-950 border-cyan-700/60'
                  }`}
                />
              );
            })}
          </div>

          <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-cyan-100 flex items-center gap-1 group-hover:text-white">
            <Target className="w-3 h-3 text-cyan-400" />
            Misiones
          </span>
        </button>
      </div>
    </footer>
  );
};
