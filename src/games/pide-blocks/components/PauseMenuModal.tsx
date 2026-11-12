import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, HelpCircle, X, MapPin } from 'lucide-react';
import { LevelConfig } from '../game/types';
import { TIETAR_LEVELS } from '../game/tietarLevels';

interface PauseMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartLevel: () => void;
  onSelectLevel: (levelId: number) => void;
  currentLevel: LevelConfig;
  completedLevelIds: number[];
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  isOpen,
  onClose,
  onRestartLevel,
  onSelectLevel,
  currentLevel,
  completedLevelIds,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold font-cinzel text-cyan-300">Valle del Tiétar</h2>
            <p className="text-xs text-slate-400">Juego en Pausa</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Reanudar Partida
          </button>

          <button
            onClick={() => {
              onRestartLevel();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Nivel Actual
          </button>

          <button
            onClick={onToggleMute}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Efectos de Sonido: DESACTIVADOS</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-cyan-300" />
                <span>Efectos de Sonido: ACTIVADOS</span>
              </>
            )}
          </button>
        </div>

        {/* Level Selector */}
        <div className="pt-2 border-t border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Selección de Niveles
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {TIETAR_LEVELS.map((lvl) => {
              const isCurrent = lvl.id === currentLevel.id;
              const isUnlocked = lvl.id === 1 || completedLevelIds.includes(lvl.id - 1);

              return (
                <button
                  key={lvl.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    onSelectLevel(lvl.id);
                    onClose();
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-500 text-white border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                      : isUnlocked
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                      : 'bg-slate-900/50 text-slate-600 border-slate-800/80 cursor-not-allowed'
                  }`}
                  title={`${lvl.name}: ${lvl.location}`}
                >
                  <span>{lvl.id}</span>
                  <span className="text-[9px] font-normal">{lvl.unlockIcon}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* How to Play brief */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span>Cómo Jugar a Gravity Blocks:</span>
          </div>
          <p>
            • <strong>Coloca o arrastra</strong> piezas para llenar filas horizontales.
          </p>
          <p>
            • <strong>Pulsa 'Usar carga de gravedad'</strong> (Espacio) para que los bloques flotantes caigan y creen combos en cadena.
          </p>
          <p>
            • <strong>Recolecta gemas prismáticas 💎</strong> rompiendo sus bloques para superar cada nivel.
          </p>
        </div>
      </div>
    </div>
  );
};
