import React, { useState } from 'react';
import { ArrowLeft, Star, Lock, Play, CheckCircle2, ChevronRight, Award } from 'lucide-react';
import { LEVEL_CONFIGS, PUZZLES, PuzzleInfo } from '../data/puzzles';
import { PlayerStats, getTotalEarnedStars } from '../utils/storage';
import { sound } from '../utils/audio';

interface CampaignSelectorProps {
  playerStats: PlayerStats;
  onSelectPuzzle: (puzzle: PuzzleInfo) => void;
  onBack: () => void;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  playerStats,
  onSelectPuzzle,
  onBack,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const totalStars = getTotalEarnedStars(playerStats);

  const currentLevelConfig = LEVEL_CONFIGS.find((l) => l.level === selectedLevel) || LEVEL_CONFIGS[0];
  const levelPuzzles = PUZZLES.filter((p) => p.level === selectedLevel);

  return (
    <div className="w-full min-h-full flex flex-col items-center p-3 sm:p-6 select-none max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inicio</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{totalStars} estrellas ganadas</span>
          </div>
        </div>
      </div>

      <div className="w-full text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200">
          Campaña: Valle del Tiétar
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          5 niveles de dificultad creciente · 3 imágenes por nivel (6 a 36 piezas)
        </p>
      </div>

      {/* Level Tabs (1 to 5) */}
      <div className="w-full flex items-center justify-center gap-2 overflow-x-auto pb-2 mb-6 custom-scrollbar">
        {LEVEL_CONFIGS.map((lvl) => {
          const isUnlocked = totalStars >= lvl.minStarsToUnlock;
          const isSelected = selectedLevel === lvl.level;

          // Stars earned in this level
          const puzzlesInLvl = PUZZLES.filter((p) => p.level === lvl.level);
          const starsInLvl = puzzlesInLvl.reduce((sum, p) => {
            const res = playerStats.completedPuzzles[p.id];
            return sum + (res ? res.stars : 0);
          }, 0);

          return (
            <button
              key={lvl.level}
              onClick={() => {
                if (isUnlocked) {
                  sound.playPick();
                  setSelectedLevel(lvl.level);
                } else {
                  sound.playDrop();
                }
              }}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl flex flex-col items-center min-w-[100px] border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105'
                  : isUnlocked
                  ? 'bg-black/40 text-amber-200 border-white/10 hover:bg-black/60'
                  : 'bg-black/20 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1 text-xs font-bold">
                {!isUnlocked && <Lock className="w-3 h-3 text-slate-500" />}
                <span>Nivel {lvl.level}</span>
              </div>
              <span className="text-[10px] font-semibold mt-0.5">
                {lvl.grid.total} piezas
              </span>
              <div className="flex items-center gap-0.5 mt-1 text-[10px]">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>{starsInLvl}/9</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Level Description Banner */}
      <div className="w-full max-w-3xl p-4 rounded-2xl bg-black/40 border border-amber-500/30 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-amber-200 flex items-center gap-2">
            <span>{currentLevelConfig.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {currentLevelConfig.grid.rows}x{currentLevelConfig.grid.cols} ({currentLevelConfig.grid.total} piezas)
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">{currentLevelConfig.subtitle}</p>
          <p className="text-[11px] text-amber-300/80 mt-1 italic">
            🔍 {currentLevelConfig.visualDetailDescription}
          </p>
        </div>

        <div className="text-right text-xs text-amber-300 font-semibold whitespace-nowrap">
          Dificultad: <span className="font-bold text-amber-400">{currentLevelConfig.difficultyLabel}</span>
        </div>
      </div>

      {/* 3 Images for Current Level (Grid of 3 Cards) */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5">
        {levelPuzzles.map((puzzle, idx) => {
          const result = playerStats.completedPuzzles[puzzle.id];
          const isDone = Boolean(result && result.stars > 0);

          return (
            <div
              key={puzzle.id}
              onClick={() => {
                sound.playPick();
                onSelectPuzzle(puzzle);
              }}
              className="group rounded-3xl p-3 bg-black/50 hover:bg-black/70 border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[1.02] backdrop-blur-md"
            >
              <div>
                {/* Image Thumbnail with Aspect Ratio */}
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative mb-3 bg-slate-900 border border-white/10 shadow-inner">
                  <img
                    src={puzzle.image}
                    alt={puzzle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Solved Stamp */}
                  {isDone && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 border border-emerald-400 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Completado</span>
                    </div>
                  )}

                  {/* Pieces Count Pill */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                    {puzzle.totalPieces} piezas
                  </div>
                </div>

                <h3 className="text-sm font-bold text-amber-100 group-hover:text-amber-300 transition-colors">
                  {idx + 1}. {puzzle.title}
                </h3>
                <span className="text-[11px] text-amber-400/80 font-medium block">
                  {puzzle.townOrZone}
                </span>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {puzzle.description}
                </p>
                <div className="mt-2 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-amber-300/90 font-medium">
                  {puzzle.difficultyTone}
                </div>
              </div>

              {/* Card Footer: Stars & Play Button */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        result && result.stars >= s
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700 fill-transparent'
                      }`}
                    />
                  ))}
                </div>

                <button className="px-3 py-1 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-colors">
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>Jugar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
