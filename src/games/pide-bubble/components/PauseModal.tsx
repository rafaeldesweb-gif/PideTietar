import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Music, HelpCircle, Trophy } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onTitleMenu: () => void;
  onOpenLeaderboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isAmbientMusicOn: boolean;
  onToggleAmbientMusic: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onTitleMenu,
  onOpenLeaderboard,
  isMuted,
  onToggleMute,
  isAmbientMusicOn,
  onToggleAmbientMusic,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm game-glass-panel rounded-3xl p-6 border-2 border-purple-500/50 shadow-[0_0_40px_rgba(138,43,226,0.4)] text-white text-center overflow-hidden">
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Juego en Pausa
        </h2>
        <p className="text-xs text-purple-300 mb-5">
          Tu pedido sigue avanzando en tiempo real
        </p>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 rounded-2xl text-white font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(255,42,141,0.5)] transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>CONTINUAR JUGANDO</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar este Nivel</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="w-full py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Ver Ranking Global</span>
          </button>

          <button
            onClick={onTitleMenu}
            className="w-full py-2.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 rounded-xl text-xs font-semibold text-purple-200 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Salir al Menú Principal</span>
          </button>
        </div>

        {/* Audio Toggles */}
        <div className="mt-5 pt-4 border-t border-purple-800/50 grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 rounded-xl transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>Efectos: {isMuted ? 'OFF' : 'ON'}</span>
          </button>

          <button
            onClick={onToggleAmbientMusic}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 rounded-xl transition-colors"
          >
            <Music className={`w-4 h-4 ${isAmbientMusicOn ? 'text-cyan-400' : 'text-purple-400'}`} />
            <span>Música: {isAmbientMusicOn ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Special Bubbles Legend */}
        <div className="mt-3.5 pt-3 border-t border-purple-800/40 text-[11px] text-purple-200 grid grid-cols-2 gap-1.5 text-left bg-purple-950/40 p-2 rounded-xl border border-purple-800/30">
          <div className="flex items-center gap-1.5"><span className="text-amber-400 font-bold">💣 Mortero:</span> <span>Radio de área</span></div>
          <div className="flex items-center gap-1.5"><span className="text-cyan-400 font-bold">⚡ Rayo:</span> <span>Limpia fila</span></div>
          <div className="flex items-center gap-1.5"><span className="text-pink-400 font-bold">★ Arcoíris:</span> <span>Comodín</span></div>
          <div className="flex items-center gap-1.5"><span className="text-sky-300 font-bold">❄ Hielo:</span> <span>Frena techo +8s</span></div>
        </div>

        {/* How to Play reminder */}
        <div className="mt-2 text-[10px] text-purple-300/80 flex items-center justify-center gap-1">
          <HelpCircle className="w-3 h-3 text-purple-400" />
          <span>¡Cada 6 burbujas explotadas, 3 nuevas empujan hacia abajo!</span>
        </div>
      </div>
    </div>
  );
};
