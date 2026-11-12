import React, { useState } from 'react';
import { ArrowLeft, Play, Upload, Star, CheckCircle, Sliders } from 'lucide-react';
import { PUZZLES, PuzzleInfo, LEVEL_CONFIGS } from '../data/puzzles';
import { PlayerStats } from '../utils/storage';
import { sound } from '../utils/audio';

interface GalleryViewProps {
  playerStats: PlayerStats;
  onSelectCustomPuzzle: (puzzle: PuzzleInfo, customPieces?: number) => void;
  onBack: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  playerStats,
  onSelectCustomPuzzle,
  onBack,
}) => {
  const [selectedPieceCount, setSelectedPieceCount] = useState<number>(12);
  const [customImage, setCustomImage] = useState<string | null>(null);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImage(reader.result as string);
        sound.playPick();
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayUploaded = () => {
    if (!customImage) return;
    const config = LEVEL_CONFIGS.find((l) => l.grid.total === selectedPieceCount) || LEVEL_CONFIGS[1];
    const customPuzzle: PuzzleInfo = {
      id: `custom_${Date.now()}`,
      level: config.level,
      levelIndex: 0,
      title: 'Mi Foto Personal del Tiétar',
      townOrZone: 'Foto Personalizada',
      description: 'Tu imagen favorita convertida en rompecabezas clásico.',
      image: customImage,
      thumbnail: customImage,
      difficultyTone: 'Foto personalizada del usuario',
      rows: config.grid.rows,
      cols: config.grid.cols,
      totalPieces: config.grid.total,
      parTime: 180,
      basePoints: 1500,
    };
    onSelectCustomPuzzle(customPuzzle, selectedPieceCount);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center p-3 sm:p-6 select-none max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-amber-200 border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Menú</span>
        </button>

        <span className="text-xs sm:text-sm font-bold text-amber-200">
          Galería & Juego Libre
        </span>
      </div>

      <div className="w-full text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200">
          Paisajes del Valle del Tiétar
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Elige cualquier paisaje o sube tu propia foto, y ajusta la cantidad de piezas (hasta 36 piezas)
        </p>
      </div>

      {/* Piece count selector */}
      <div className="w-full max-w-xl p-3 rounded-2xl bg-black/50 border border-amber-500/30 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Piezas del Rompecabezas:</span>
        </div>

        <div className="flex items-center gap-1.5">
          {[6, 12, 16, 24, 36].map((count) => (
            <button
              key={count}
              onClick={() => {
                sound.playPick();
                setSelectedPieceCount(count);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPieceCount === count
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Custom upload card */}
      <div className="w-full max-w-4xl p-4 rounded-3xl bg-black/40 border border-dashed border-amber-500/40 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-100">
              ¿Quieres jugar con tu propia foto?
            </h3>
            <p className="text-xs text-slate-400">
              Sube una foto de tu viaje a Gredos o cualquier recuerdo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-bold border border-white/10 cursor-pointer transition-colors flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Seleccionar Foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomUpload}
              className="hidden"
            />
          </label>

          {customImage && (
            <button
              onClick={handlePlayUploaded}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Jugar Ahora</span>
            </button>
          )}
        </div>
      </div>

      {/* 15 Valle del Tiétar Landscapes Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {PUZZLES.map((puzzle) => {
          const res = playerStats.completedPuzzles[puzzle.id];

          return (
            <div
              key={puzzle.id}
              onClick={() => {
                sound.playPick();
                // Map custom piece count grid
                const config = LEVEL_CONFIGS.find((l) => l.grid.total === selectedPieceCount) || LEVEL_CONFIGS[1];
                const customConfiguredPuzzle: PuzzleInfo = {
                  ...puzzle,
                  rows: config.grid.rows,
                  cols: config.grid.cols,
                  totalPieces: config.grid.total,
                };
                onSelectCustomPuzzle(customConfiguredPuzzle, selectedPieceCount);
              }}
              className="group rounded-2xl p-2.5 bg-black/50 hover:bg-black/70 border border-amber-500/30 hover:border-amber-400 transition-all flex flex-col justify-between cursor-pointer shadow-lg backdrop-blur-md"
            >
              <div>
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative mb-2 bg-slate-900 border border-white/10">
                  <img
                    src={puzzle.image}
                    alt={puzzle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {res && (
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/70 border border-emerald-400 text-emerald-300 text-[10px] font-bold">
                      ✓ Completado
                    </div>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-amber-100 group-hover:text-amber-300">
                  {puzzle.title}
                </h4>
                <span className="text-[11px] text-amber-400/80 font-medium block">
                  {puzzle.townOrZone}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {selectedPieceCount} piezas
                </span>
                <button className="px-2.5 py-1 rounded-lg bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1">
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
