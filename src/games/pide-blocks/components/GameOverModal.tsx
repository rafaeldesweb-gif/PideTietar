import React from 'react';
import { RotateCcw, ArrowDownToLine, AlertCircle } from 'lucide-react';
import { LevelConfig } from '../game/types';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  gemsCollected: number;
  currentLevel: LevelConfig;
  charges: number;
  onEmergencyGravity: () => void;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  gemsCollected,
  currentLevel,
  charges,
  onEmergencyGravity,
  onRestart,
}) => {
  if (!isOpen) return null;

  const canUseEmergency = charges > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md select-none animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500/70 rounded-2xl shadow-[0_0_35px_rgba(244,63,94,0.3)] p-6 text-slate-100 flex flex-col items-center text-center space-y-4">
        {/* Danger Icon */}
        <div className="w-14 h-14 rounded-full bg-rose-950/80 border-2 border-rose-500/80 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-black font-cinzel text-white">
            Sin Espacio Disponible
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ninguna pieza de la cola puede colocarse en el tablero actual.
          </p>
        </div>

        {/* Summary */}
        <div className="w-full grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-left">
          <div>
            <span className="text-[10px] text-slate-400 block">Puntuación</span>
            <span className="text-sm font-bold font-mono text-cyan-300">
              {score.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Gemas Conseguidas</span>
            <span className="text-sm font-bold font-mono text-pink-400">
              {gemsCollected} / {currentLevel.gemsNeeded}
            </span>
          </div>
        </div>

        {/* Emergency Gravity Savior Option */}
        {canUseEmergency && (
          <div className="w-full p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-left">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <ArrowDownToLine className="w-4 h-4" />
              ¡Tienes {charges} carga(s) de gravedad!
            </span>
            <p className="text-[11px] text-slate-300 mt-1">
              Activa la gravedad ahora para colapsar los bloques y abrir nuevos huecos.
            </p>
            <button
              onClick={onEmergencyGravity}
              className="mt-2.5 w-full py-2 px-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Usar Gravedad de Emergencia
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2 pt-1">
          <button
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reintentar Nivel
          </button>
        </div>
      </div>
    </div>
  );
};
