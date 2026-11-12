import React from 'react';
import { Menu, Plus, Coins, Trophy } from 'lucide-react';
import { LevelConfig } from '../types/game';

interface HUDLeftProps {
  currentLevel: LevelConfig;
  score: number;
  highScore: number;
  onOpenMenu: () => void;
  onNewGame: () => void;
}

export const HUDLeft: React.FC<HUDLeftProps> = ({
  currentLevel,
  score,
  highScore,
  onOpenMenu,
  onNewGame,
}) => {
  return (
    <div className="flex flex-col justify-between h-full py-2 pointer-events-auto select-none">
      {/* Top Menu Hamburger Button (matching Image 3 & 4) */}
      <div>
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menú y pausa"
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-600/40 text-white shadow-lg transition-transform active:scale-95"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Level & Score Card (matching Image 3 & 4 left panel) */}
        <div className="mt-4 w-44 md:w-52 game-glass-panel rounded-2xl p-4 border border-purple-500/40 shadow-[0_8px_32px_rgba(30,10,60,0.6)]">
          {/* Level number */}
          <div className="mb-3">
            <span className="text-xs uppercase tracking-wider text-purple-300 font-medium">
              Level
            </span>
            <div className="text-3xl font-extrabold text-white leading-none mt-0.5">
              {currentLevel.level}
            </div>
            <p className="text-[11px] text-purple-300/80 mt-0.5 truncate">
              {currentLevel.name}
            </p>
          </div>

          {/* Reward XP / Coupon */}
          <div className="mb-3 pt-2.5 border-t border-purple-700/40">
            <div className="flex items-center gap-1.5 text-xs text-purple-300">
              <span>Reward</span>
              <Coins className="w-3.5 h-3.5 text-amber-400 inline" />
            </div>
            <div className="text-base font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <span>{currentLevel.rewardXP} XP</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded">
                {currentLevel.rewardCoupon.discountText}
              </span>
            </div>
          </div>

          {/* Score Display (Cyan neon font from Image 3 & 4) */}
          <div className="pt-2.5 border-t border-purple-700/40">
            <span className="text-xs uppercase tracking-wider text-purple-300 font-medium">
              Score
            </span>
            <div className="text-2xl md:text-3xl font-extrabold text-[#00f0ff] text-glow-cyan font-mono tabular-nums leading-tight mt-0.5">
              {score.toLocaleString('es-ES')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-purple-400 mt-1 font-mono">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Récord: {highScore.toLocaleString('es-ES')}</span>
            </div>
          </div>

          {/* Color Values & 3X Special Indicator */}
          <div className="mt-3 pt-2 border-t border-purple-700/40">
            <div className="flex items-center justify-between text-[10px] text-purple-300 font-medium mb-1.5">
              <span>Valores de Color</span>
              <span className="text-amber-300 font-bold">★ 6 = 3X</span>
            </div>
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono font-bold">
              <span className="px-1 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">M 10</span>
              <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">A 15</span>
              <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Y 20</span>
              <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">V 25</span>
              <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">P 30</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Button: + New Game (matching Image 3 & 4 cyan pill button) */}
      <div className="mt-4">
        <button
          onClick={onNewGame}
          className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900/90 to-purple-950/90 hover:from-cyan-900 hover:to-purple-900 border-2 border-[#00d0ff] hover:border-cyan-300 rounded-2xl shadow-[0_0_16px_rgba(0,208,255,0.4)] transition-all active:scale-95 text-white font-bold text-sm tracking-wide cursor-pointer"
        >
          <Plus className="w-4 h-4 text-cyan-300 group-hover:rotate-90 transition-transform" />
          <span>New Game</span>
        </button>
      </div>
    </div>
  );
};
