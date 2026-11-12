import React from 'react';
import { Volume2, VolumeX, Trophy, Gift, Bike, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface TitleScreenProps {
  highScore: number;
  onPlay: () => void;
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
  onSelectLevel: (lvl: number) => void;
  currentLevel: number;
  maxUnlockedLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  onPlay,
  onOpenLeaderboard,
  onOpenRewards,
  onSelectLevel,
  currentLevel,
  maxUnlockedLevel,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="relative w-full h-full max-h-full bg-[#0d0724] flex flex-col items-center justify-between py-2 sm:py-6 px-3 sm:px-4 overflow-y-auto select-none">
      {/* Background Architectural Columns & Atmospheric Glow (matching Image 1) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0420] via-[#1a0e44] to-[#36134b] opacity-95" />

        {/* Central portal backlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[480px] h-[360px] sm:h-[480px] bg-gradient-to-t from-pink-500/20 via-purple-600/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Fluted Pillars Left & Right */}
        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-28 bg-gradient-to-r from-[#170a38] via-[#321666] to-transparent border-r border-purple-800/20 shadow-2xl" />
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-28 bg-gradient-to-l from-[#170a38] via-[#321666] to-transparent border-l border-purple-800/20 shadow-2xl" />
      </div>

      {/* Top Bar: Delivery context & Quick controls */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between text-xs text-purple-200">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-950/70 border border-purple-700/40 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg backdrop-blur-md">
          <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 animate-pulse" />
          <span className="font-semibold text-white text-[11px] sm:text-xs">Delivery Pop</span>
          <span className="text-purple-400">·</span>
          <span className="text-pink-300 text-[11px] sm:text-xs">Espera Jugando</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleMute}
            className="p-1.5 sm:p-2 bg-purple-950/70 hover:bg-purple-900 border border-purple-700/40 rounded-full transition-transform active:scale-95 text-purple-200 hover:text-white cursor-pointer"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: 3 Glowing Glass Spheres with Upward Light Cone (matching Image 1) */}
      <div className="relative z-10 flex flex-col items-center mt-1 sm:mt-6 shrink-0">
        {/* Upward Light Beam */}
        <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 w-28 sm:w-32 h-36 sm:h-44 bg-gradient-to-t from-pink-400/40 via-purple-400/15 to-transparent blur-xl pointer-events-none" />

        {/* 3 Floating Orbs Cluster */}
        <div className="relative w-40 h-28 sm:w-48 sm:h-36 flex items-center justify-center">
          {/* Main Top Center Magenta Orb */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-pink-400 via-rose-600 to-purple-950 shadow-[0_0_30px_rgba(255,42,141,0.7)] flex items-center justify-center border border-pink-300/60 transition-transform duration-700 hover:scale-105">
            {/* Specular glint */}
            <div className="absolute top-1.5 left-3 w-5 h-2.5 bg-white/80 rounded-full blur-[1px] rotate-[-25deg]" />
            {/* Sparkle star flare */}
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          {/* Left Blue Orb */}
          <div className="absolute bottom-1 left-2 sm:bottom-2 sm:left-2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-cyan-300 via-blue-600 to-indigo-950 shadow-[0_0_20px_rgba(0,200,255,0.6)] flex items-center justify-center border border-cyan-200/50">
            <div className="absolute top-1 left-2 w-3.5 h-1.5 bg-white/80 rounded-full blur-[0.5px] rotate-[-25deg]" />
          </div>

          {/* Right Yellow Orb */}
          <div className="absolute bottom-1 right-2 sm:bottom-2 sm:right-2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-900 shadow-[0_0_20px_rgba(255,200,0,0.6)] flex items-center justify-center border border-amber-200/50">
            <div className="absolute top-1 left-2 w-3.5 h-1.5 bg-white/80 rounded-full blur-[0.5px] rotate-[-25deg]" />
          </div>
        </div>

        {/* Game Title: Clean bold typography matching reference */}
        <div className="text-center mt-2 sm:mt-3">
          <p className="text-xs sm:text-sm md:text-base font-semibold tracking-wider text-purple-200 uppercase">
            Delivery Arcade
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
            Bubble <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-amber-300">Rush</span>
          </h1>
        </div>

        {/* Purple High Score Ribbon Banner (matching Image 1) */}
        <div className="relative mt-3 sm:mt-5 w-64 sm:w-80">
          {/* Ribbon ends */}
          <div className="absolute -left-2.5 top-1.5 w-5 h-10 sm:-left-3 sm:top-2 sm:w-6 sm:h-12 bg-purple-900 rounded-l-md border border-purple-700/50 shadow-lg -z-1" />
          <div className="absolute -right-2.5 top-1.5 w-5 h-10 sm:-right-3 sm:top-2 sm:w-6 sm:h-12 bg-purple-900 rounded-r-md border border-purple-700/50 shadow-lg -z-1" />

          {/* Center Banner Box */}
          <div className="relative bg-gradient-to-r from-[#6b21a8] via-[#7e22ce] to-[#6b21a8] border-2 border-purple-400/50 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center shadow-[0_8px_24px_rgba(107,33,168,0.5)]">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200 font-semibold">
              High Score
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#ffee33] text-glow-gold font-mono tracking-tight">
              {highScore.toLocaleString('es-ES')}
            </p>
          </div>
        </div>

        {/* Big Rounded Play Button (matching Image 1 yellow border & purple body) */}
        <button
          onClick={() => {
            soundManager.playClick();
            onPlay();
          }}
          className="group relative mt-4 sm:mt-7 px-10 sm:px-14 py-2.5 sm:py-3.5 bg-gradient-to-b from-[#581c87] to-[#3b0764] hover:from-[#6b21a8] hover:to-[#4a044e] rounded-full border-4 border-[#ffdd00] shadow-[0_0_28px_rgba(255,221,0,0.65)] hover:shadow-[0_0_40px_rgba(255,221,0,0.9)] transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
            Play
          </span>
        </button>

        {/* Level Selector Pills (1 to 5) */}
        <div className="mt-3 sm:mt-6 flex flex-col items-center gap-1 sm:gap-1.5">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-purple-300/80">
            Seleccionar Nivel (1 a 5)
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-950/60 p-1 sm:p-1.5 rounded-full border border-purple-700/40">
            {[1, 2, 3, 4, 5].map(lvl => {
              const isUnlocked = lvl <= maxUnlockedLevel;
              const isCurrent = lvl === currentLevel;
              return (
                <button
                  key={lvl}
                  disabled={!isUnlocked}
                  onClick={() => {
                    soundManager.playClick();
                    onSelectLevel(lvl);
                  }}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-purple-950 shadow-[0_0_12px_rgba(255,200,0,0.6)]'
                      : isUnlocked
                      ? 'bg-purple-800/80 hover:bg-purple-700 text-purple-100'
                      : 'bg-purple-950/40 text-purple-600 cursor-not-allowed'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Actions: Leaderboard & Rewards Vault */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenLeaderboard();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/40 rounded-xl text-purple-100 hover:text-white text-xs font-semibold shadow-lg transition-all active:scale-95"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Ranking Global</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenRewards();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/40 rounded-xl text-purple-100 hover:text-white text-xs font-semibold shadow-lg transition-all active:scale-95"
        >
          <Gift className="w-4 h-4 text-pink-400" />
          <span>Mis Recompensas</span>
        </button>
      </div>

      {/* Bottom Control Hint */}
      <div className="relative z-10 text-center text-[11px] text-purple-400/80 mt-2">
        Apunta con el cursor o toca para disparar · Espacio para alternar burbuja
      </div>
    </div>
  );
};
