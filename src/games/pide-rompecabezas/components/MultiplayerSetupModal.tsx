import React, { useState } from 'react';
import { X, Users, Play, Clock, Shield, Sparkles, ChevronRight, Check } from 'lucide-react';
import { LEVEL_CONFIGS, PUZZLES, PuzzleInfo } from '../data/puzzles';
import { sound } from '../utils/audio';

interface MultiplayerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDuel: (
    puzzle: PuzzleInfo,
    player1Name: string,
    player2Name: string,
    turnSecondsLimit: number
  ) => void;
}

export const MultiplayerSetupModal: React.FC<MultiplayerSetupModalProps> = ({
  isOpen,
  onClose,
  onStartDuel,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(2); // Default level 2 (12 pieces)
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>('');
  const [player1Name, setPlayer1Name] = useState<string>('Guardián de Gredos');
  const [player2Name, setPlayer2Name] = useState<string>('Explorador del Tiétar');
  const [turnTime, setTurnTime] = useState<number>(20); // 15, 20, 30, or 0 (no limit)

  if (!isOpen) return null;

  // Level config & puzzles for chosen level
  const currentLevelConfig = LEVEL_CONFIGS.find((l) => l.level === selectedLevel) || LEVEL_CONFIGS[1];
  const puzzlesForLevel = PUZZLES.filter((p) => p.level === selectedLevel);

  // Active chosen puzzle (defaults to first of this level if not selected)
  const activePuzzle =
    puzzlesForLevel.find((p) => p.id === selectedPuzzleId) || puzzlesForLevel[0];

  const handleStart = () => {
    sound.playPick();
    onStartDuel(
      activePuzzle,
      player1Name.trim() || 'Jugador 1',
      player2Name.trim() || 'Jugador 2',
      turnTime
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-2xl rounded-3xl p-5 sm:p-7 flex flex-col relative overflow-hidden border border-sky-400/40 shadow-[0_0_50px_rgba(56,189,248,0.3)] max-h-[92vh] overflow-y-auto custom-scrollbar"
        style={{
          background: 'linear-gradient(180deg, #0b132b 0%, #030712 100%)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 shadow">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-200 to-amber-200">
              Duelo Multijugador Local
            </h2>
            <p className="text-xs text-slate-300">
              Configura la partida para 2 jugadores en el mismo dispositivo
            </p>
          </div>
        </div>

        {/* 1. SELECCIÓN DE NIVEL DE DIFICULTAD (DEL 1 AL 5) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-wide">
              1. Selecciona la Dificultad (Nivel 1 al 5)
            </label>
            <span className="text-xs font-semibold text-sky-300">
              {currentLevelConfig.grid.total} piezas clásicas ({currentLevelConfig.difficultyLabel})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {LEVEL_CONFIGS.map((lvl) => {
              const isSelected = selectedLevel === lvl.level;

              return (
                <button
                  key={lvl.level}
                  type="button"
                  onClick={() => {
                    sound.playPick();
                    setSelectedLevel(lvl.level);
                    // Reset selected puzzle to first of that level
                    const firstOfLvl = PUZZLES.find((p) => p.level === lvl.level);
                    if (firstOfLvl) setSelectedPuzzleId(firstOfLvl.id);
                  }}
                  className={`py-2.5 px-1 sm:px-2 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.6)] scale-105 font-bold'
                      : 'bg-black/40 text-slate-300 border-white/10 hover:bg-slate-900/80 hover:text-white'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black">Nivel {lvl.level}</span>
                  <span className="text-[10px] text-sky-200/90 font-medium mt-0.5">
                    {lvl.grid.total} pcs
                  </span>
                  <span className="text-[9px] opacity-80 truncate max-w-full px-0.5">
                    {lvl.difficultyLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. SELECCIÓN DE IMAGEN DEL NIVEL ELEGIDO (3 IMÁGENES POR NIVEL) */}
        <div className="mb-5">
          <label className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-wide block mb-2">
            2. Elige el Paisaje del Nivel {selectedLevel}
          </label>

          <div className="grid grid-cols-3 gap-2.5">
            {puzzlesForLevel.map((puzzle, idx) => {
              const isSelected = activePuzzle.id === puzzle.id;

              return (
                <div
                  key={puzzle.id}
                  onClick={() => {
                    sound.playPick();
                    setSelectedPuzzleId(puzzle.id);
                  }}
                  className={`group rounded-2xl p-2 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-950/70 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] ring-2 ring-sky-400'
                      : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-1.5 relative bg-slate-950">
                    <img
                      src={puzzle.image}
                      alt={puzzle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 truncate">
                      {idx + 1}. {puzzle.title}
                    </h4>
                    <span className="text-[10px] text-sky-300/80 block truncate">
                      {puzzle.townOrZone}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. NOMBRES DE LOS JUGADORES */}
        <div className="mb-5">
          <label className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-wide block mb-2">
            3. Jugadores del Duelo
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Jugador 1 (Azul Cobalto) */}
            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-sky-300 font-semibold uppercase block">
                  Jugador 1 (Azul)
                </span>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  placeholder="Guardián de Gredos"
                  maxLength={18}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-100 border-b border-sky-500/40 focus:outline-none focus:border-sky-400 py-0.5"
                />
              </div>
            </div>

            {/* Jugador 2 (Ámbar Dorado) */}
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-amber-300 font-semibold uppercase block">
                  Jugador 2 (Ámbar)
                </span>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  placeholder="Explorador del Tiétar"
                  maxLength={18}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-100 border-b border-amber-500/40 focus:outline-none focus:border-amber-400 py-0.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. TIEMPO POR TURNO */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-black/40 border border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-xs font-bold text-slate-200 block">Tiempo por Turno</span>
              <span className="text-[10px] text-slate-400 block">
                Si el tiempo se agota, el turno pasa al contrincante
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[15, 20, 30, 0].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  sound.playPick();
                  setTurnTime(t);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  turnTime === t
                    ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t === 0 ? 'Sin límite' : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        {/* BOTÓN COMENZAR DUELO */}
        <button
          onClick={handleStart}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 font-black text-base shadow-[0_4px_25px_rgba(56,189,248,0.5)] flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>¡Comenzar Duelo (Nivel {selectedLevel} · {currentLevelConfig.grid.total} piezas)!</span>
        </button>
      </div>
    </div>
  );
};
