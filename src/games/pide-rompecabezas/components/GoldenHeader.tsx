import React from 'react';
import { Volume2, VolumeX, Moon, Sun, ArrowLeft, Eye, EyeOff, LayoutGrid, Sparkles, Image as ImageIcon } from 'lucide-react';
import { sound } from '../utils/audio';

interface GoldenHeaderProps {
  timerSeconds: number;
  score: number;
  piecesRemaining: number;
  totalPieces: number;
  starsEarned: number; // 0 to 3
  progressRatio: number; // 0 to 1
  isMuted: boolean;
  isDark: boolean;
  // Hint toggles
  ghostOpacity: number; // 0 = off, 0.25, 0.5, 0.75
  showGridOutlines: boolean; // on/off
  showPhotoPreview: boolean; // on/off
  filterMode: 'all' | 'edge' | 'inside';
  onToggleMute: () => void;
  onToggleTheme: () => void;
  onCycleGhost: () => void;
  onToggleGridOutlines: () => void;
  onTogglePhotoPreview: () => void;
  onCycleFilter: () => void;
  onBack: () => void;
  title: string;
}

export const GoldenHeader: React.FC<GoldenHeaderProps> = ({
  timerSeconds,
  score,
  piecesRemaining,
  totalPieces,
  starsEarned,
  progressRatio,
  isMuted,
  isDark,
  ghostOpacity,
  showGridOutlines,
  showPhotoPreview,
  filterMode,
  onToggleMute,
  onToggleTheme,
  onCycleGhost,
  onToggleGridOutlines,
  onTogglePhotoPreview,
  onCycleFilter,
  onBack,
  title,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formattedScore = score.toLocaleString('es-ES');

  return (
    <header className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 flex flex-col items-center select-none">
      {/* Top action row */}
      <div className="w-full flex items-center justify-between mb-2 gap-2">
        <button
          onClick={onBack}
          aria-label="Volver al menú"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-semibold transition-all backdrop-blur-sm cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Menú</span>
        </button>

        <h1 className="text-xs sm:text-sm md:text-base font-bold text-amber-100 tracking-wide truncate max-w-[160px] sm:max-w-md text-center drop-shadow-md">
          {title}
        </h1>

        {/* HINT & UTILITY CONTROLS: Clear On/Off Toggles */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* PISTA 1: Guía de Fondo Translúcida (Encender/Apagar) */}
          <button
            onClick={onCycleGhost}
            title={`Pista Fondo: ${ghostOpacity === 0 ? 'APAGADA' : `${Math.round(ghostOpacity * 100)}% ENCENDIDA`} (Haz clic para cambiar)`}
            className={`px-2 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              ghostOpacity > 0
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-amber-200'
            }`}
          >
            {ghostOpacity > 0 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              Fondo {ghostOpacity > 0 ? `${Math.round(ghostOpacity * 100)}%` : 'OFF'}
            </span>
          </button>

          {/* PISTA 2: Contornos de Huecos / Líneas de Corte (Encender/Apagar) */}
          <button
            onClick={onToggleGridOutlines}
            title={`Pista Líneas: ${showGridOutlines ? 'ENCENDIDAS' : 'APAGADAS'}`}
            className={`px-2 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showGridOutlines
                ? 'bg-amber-500/30 text-amber-200 border-amber-400'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-amber-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              Líneas {showGridOutlines ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* PISTA 3: Miniatura de la Foto Original (Encender/Apagar) */}
          <button
            onClick={onTogglePhotoPreview}
            title={`Miniatura de Foto: ${showPhotoPreview ? 'ENCENDIDA' : 'APAGADA'}`}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showPhotoPreview
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-sky-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Foto</span>
          </button>

          {/* PISTA 4: Filtro de Piezas (Solo Bordes / Todas) */}
          <button
            onClick={onCycleFilter}
            title={`Filtro de piezas: ${filterMode === 'all' ? 'Todas' : filterMode === 'edge' ? 'Solo Bordes' : 'Solo Centro'}`}
            className={`px-2 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              filterMode !== 'all'
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-sm'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
          >
            <span className="capitalize text-xs font-bold">
              {filterMode === 'all' ? 'Todas' : filterMode === 'edge' ? 'Bordes' : 'Centro'}
            </span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            className="p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-500/30 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-500/30 transition-all cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Classic Sculpted Golden Ribbon Header matching user references */}
      <div className="relative w-full max-w-xl flex flex-col items-center">
        {/* Golden Ribbon Container */}
        <div
          className="w-full flex items-center justify-between p-1.5 sm:p-2 rounded-xl border border-amber-300/80 shadow-[0_4px_20px_rgba(245,158,11,0.35)] relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 25%, #d97706 70%, #92400e 100%)',
          }}
        >
          {/* Inner decorative jigsaw interlocking tabs on gold banner */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Timer box */}
          <div className="flex-1 max-w-[31%] flex items-center justify-center py-1 sm:py-1.5 px-2 rounded-lg bg-[#18112d] border border-amber-400/40 shadow-inner">
            <span className="text-amber-100 font-mono font-bold text-sm sm:text-base md:text-lg tracking-wider tabular-nums drop-shadow">
              {formatTime(timerSeconds)}
            </span>
          </div>

          {/* Decorative jigsaw notch divider */}
          <div className="w-4 h-6 flex items-center justify-center text-amber-900 opacity-60">
            <div className="w-2 h-2 rounded-full bg-amber-900/60" />
          </div>

          {/* Score box */}
          <div className="flex-1 max-w-[38%] flex items-center justify-center py-1 sm:py-1.5 px-2 rounded-lg bg-[#18112d] border border-amber-400/40 shadow-inner">
            <span className="text-amber-300 font-bold text-sm sm:text-base md:text-lg tracking-wide tabular-nums drop-shadow">
              {formattedScore}
            </span>
          </div>

          {/* Decorative jigsaw notch divider */}
          <div className="w-4 h-6 flex items-center justify-center text-amber-900 opacity-60">
            <div className="w-2 h-2 rounded-full bg-amber-900/60" />
          </div>

          {/* Pieces remaining box */}
          <div className="flex-1 max-w-[25%] flex items-center justify-center py-1 sm:py-1.5 px-2 rounded-lg bg-[#18112d] border border-amber-400/40 shadow-inner">
            <span className="text-amber-100 font-bold text-sm sm:text-base md:text-lg tracking-wider tabular-nums drop-shadow">
              {piecesRemaining}
            </span>
          </div>
        </div>

        {/* 3-Star Progress Rail underneath */}
        <div className="w-[88%] mt-1 relative flex items-center justify-between">
          <div className="w-full h-2.5 sm:h-3 rounded-full bg-[#18112d]/90 border border-amber-500/70 overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(34,197,94,0.7)]"
              style={{ width: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
            />
          </div>

          {/* 3 Golden Stars positioned along the rail */}
          <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-6">
            <div className="relative -mt-3.5">
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 filter transition-all duration-300 ${
                  starsEarned >= 1
                    ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] scale-110'
                    : 'text-amber-500/40 fill-transparent stroke-amber-500 stroke-2'
                }`}
                viewBox="0 0 24 24"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>

            <div className="relative -mt-3.5">
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 filter transition-all duration-300 ${
                  starsEarned >= 2
                    ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] scale-110'
                    : 'text-amber-500/40 fill-transparent stroke-amber-500 stroke-2'
                }`}
                viewBox="0 0 24 24"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>

            <div className="relative -mt-3.5">
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 filter transition-all duration-300 ${
                  starsEarned >= 3
                    ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,1)] scale-125 animate-pulse'
                    : 'text-amber-500/40 fill-transparent stroke-amber-500 stroke-2'
                }`}
                viewBox="0 0 24 24"
              >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
