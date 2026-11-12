import React from 'react';
import { Menu, Maximize2, Minimize2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { LevelConfig } from '../game/types';

interface GameHudProps {
  currentLevel: LevelConfig;
  gemsRemaining: number;
  score: number;
  multiplier: number;
  xp: number;
  isMuted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenMenu: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  currentLevel,
  gemsRemaining,
  score,
  multiplier,
  xp,
  isMuted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onOpenMenu,
}) => {
  return (
    <header className="relative w-full max-w-4xl mx-auto px-2 pt-2 pb-1 flex items-center justify-between gap-2 z-20 select-none">
      {/* Top Left Menu & Audio Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenMenu}
          className="p-2 sm:p-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-slate-200 shadow-md active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
          title="Menú y Ajustes"
          aria-label="Abrir Menú"
        >
          <Menu className="w-5 h-5 text-cyan-300" />
        </button>

        <button
          onClick={onToggleMute}
          className="p-2 sm:p-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-slate-200 shadow-md active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
          title={isMuted ? 'Activar Sonido' : 'Silenciar'}
          aria-label="Alternar Sonido"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-rose-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-cyan-300" />
          )}
        </button>
      </div>

      {/* Center Stone Tablet Banner: Level, XP & Objective */}
      <div className="flex-1 max-w-lg mx-auto flex flex-col items-center">
        {/* Upper Level & XP bar */}
        <div className="flex items-center justify-center gap-2 px-3 py-1 bg-slate-800/95 border-t border-x border-slate-600/80 rounded-t-lg shadow-inner text-xs sm:text-sm font-semibold">
          <span className="text-slate-200 font-cinzel tracking-wider">
            {currentLevel.name}
          </span>
          <span className="text-slate-500 font-bold">·</span>
          <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-[9px] text-emerald-300">
              xp
            </span>
            <span className="tabular-nums">{xp} XP</span>
          </div>
        </div>

        {/* Lower Objective Banner: "💎 X más para completar el nivel" */}
        <div className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 border border-slate-600/90 rounded-b-lg shadow-lg relative overflow-hidden">
          {/* Subtle neon glow sweep */}
          <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none" />

          {/* Prismatic Gem Icon with neon animation */}
          <div className="relative flex items-center justify-center shrink-0 w-6 h-6">
            <div className="absolute inset-0 bg-pink-500/30 blur-sm rounded-full animate-ping" />
            <svg
              className="w-5 h-5 filter drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="12,2 22,12 12,22 2,12" fill="url(#gemHudGrad)" />
              <polygon points="12,2 22,12 12,12" fill="#ffffff" fillOpacity="0.4" />
              <polygon points="2,12 12,22 12,12" fill="#ec4899" fillOpacity="0.6" />
              <polygon points="22,12 12,22 12,12" fill="#8b5cf6" fillOpacity="0.6" />
              <polygon points="12,2 2,12 12,12" fill="#38bdf8" fillOpacity="0.7" />
              <defs>
                <linearGradient id="gemHudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#cffafe" />
                  <stop offset="50%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <span className="text-xs sm:text-sm font-medium text-slate-100 tracking-wide truncate">
            <strong className="text-cyan-300 font-bold font-mono tabular-nums text-sm sm:text-base">
              {Math.max(0, gemsRemaining)}
            </strong>{' '}
            {gemsRemaining === 1 ? 'gema más' : 'más'} para completar el nivel
          </span>
        </div>
      </div>

      {/* Top Right Score Box & Fullscreen */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Score & Multiplier Card matching reference screenshot */}
        <div className="px-2.5 sm:px-3.5 py-1 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600/80 rounded-lg shadow-md flex flex-col items-center justify-center min-w-[76px] sm:min-w-[94px]">
          <span className="text-[10px] sm:text-xs font-semibold text-purple-300 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
            <span className="tabular-nums font-mono">{multiplier}x</span> Multiplicador
          </span>
          <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight">
            Puntuación
          </div>
          <span className="text-sm sm:text-lg font-bold font-mono tabular-nums text-white leading-tight">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 sm:p-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-slate-200 shadow-md active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
          title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
          aria-label="Alternar Pantalla Completa"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-cyan-300" />
          ) : (
            <Maximize2 className="w-5 h-5 text-cyan-300" />
          )}
        </button>
      </div>
    </header>
  );
};
