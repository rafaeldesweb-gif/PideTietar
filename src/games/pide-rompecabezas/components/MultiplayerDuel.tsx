import React, { useState, useEffect } from 'react';
import { Users, Trophy, Zap, Shield, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface MultiplayerDuelProps {
  player1Name?: string;
  player2Name?: string;
  currentPlayerTurn: 1 | 2;
  player1Score: number;
  player2Score: number;
  player1Pieces: number;
  player2Pieces: number;
  remainingPieces: number;
  totalPieces: number;
  turnSecondsLimit?: number; // 0 = no limit, or 15, 20, 30
  onTurnTimeout?: () => void;
}

export const MultiplayerDuel: React.FC<MultiplayerDuelProps> = ({
  player1Name = 'Guardián de Gredos',
  player2Name = 'Explorador del Tiétar',
  currentPlayerTurn,
  player1Score,
  player2Score,
  player1Pieces,
  player2Pieces,
  remainingPieces,
  totalPieces,
  turnSecondsLimit = 20,
  onTurnTimeout,
}) => {
  const [turnSeconds, setTurnSeconds] = useState<number>(turnSecondsLimit || 20);

  // Turn countdown
  useEffect(() => {
    if (turnSecondsLimit > 0) {
      setTurnSeconds(turnSecondsLimit);
    }
  }, [currentPlayerTurn, turnSecondsLimit]);

  useEffect(() => {
    if (remainingPieces === 0 || turnSecondsLimit === 0) return;

    const timer = setInterval(() => {
      setTurnSeconds((sec) => {
        if (sec <= 1) {
          sound.playDrop();
          if (onTurnTimeout) onTurnTimeout();
          return turnSecondsLimit;
        }
        return sec - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPlayerTurn, remainingPieces, turnSecondsLimit, onTurnTimeout]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 mb-2 select-none">
      {/* 2-Player Header Duel Card */}
      <div className="w-full rounded-2xl bg-black/60 border border-white/10 p-2 sm:p-3 shadow-xl backdrop-blur-md flex flex-col gap-2">
        {/* Top: Active Turn Banner */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-200 tracking-wide uppercase">
              Duelo Multijugador Local
            </span>
          </div>

          {/* Turn timer badge */}
          <div
            className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
              turnSecondsLimit > 0 && turnSeconds <= 5
                ? 'bg-red-500/30 text-red-300 border-red-500 animate-pulse'
                : 'bg-black/50 text-amber-300 border-amber-500/40'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{turnSecondsLimit === 0 ? 'Sin límite de tiempo' : `Turno: ${turnSeconds}s`}</span>
          </div>
        </div>

        {/* Players Scoreboard Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* PLAYER 1: Guardián de Gredos */}
          <div
            className={`p-2 sm:p-3 rounded-xl border transition-all flex items-center justify-between ${
              currentPlayerTurn === 1
                ? 'bg-sky-950/80 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] ring-2 ring-sky-400/50 scale-[1.01]'
                : 'bg-slate-900/60 border-white/10 opacity-70'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 shadow">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-sky-200 leading-tight">
                  {player1Name}
                </div>
                <div className="text-[11px] text-sky-400/80 font-medium">
                  {player1Pieces} piezas colocadas
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm sm:text-lg font-extrabold text-sky-300 tabular-nums">
                {player1Score.toLocaleString('es-ES')}
              </div>
              {currentPlayerTurn === 1 && (
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider animate-pulse">
                  Tu Turno
                </span>
              )}
            </div>
          </div>

          {/* PLAYER 2: Explorador del Tiétar */}
          <div
            className={`p-2 sm:p-3 rounded-xl border transition-all flex items-center justify-between ${
              currentPlayerTurn === 2
                ? 'bg-amber-950/80 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] ring-2 ring-amber-400/50 scale-[1.01]'
                : 'bg-slate-900/60 border-white/10 opacity-70'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-amber-200 leading-tight">
                  {player2Name}
                </div>
                <div className="text-[11px] text-amber-400/80 font-medium">
                  {player2Pieces} piezas colocadas
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm sm:text-lg font-extrabold text-amber-300 tabular-nums">
                {player2Score.toLocaleString('es-ES')}
              </div>
              {currentPlayerTurn === 2 && (
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                  Tu Turno
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
