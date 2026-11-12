import React, { useState } from 'react';
import { X, Trophy, Medal, Star, User, MapPin, Check, Search } from 'lucide-react';
import { LeaderboardEntry, getLeaderboard, savePlayerStats, getPlayerStats } from '../utils/storage';
import { sound } from '../utils/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerTotalScore: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  playerTotalScore,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [stats, setStats] = useState(() => getPlayerStats());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(stats.playerName);
  const [townInput, setTownInput] = useState(stats.town);
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    sound.playPick();
    const updated = {
      ...stats,
      playerName: nameInput.trim(),
      town: townInput.trim() || 'Arenas de San Pedro',
    };
    savePlayerStats(updated);
    setStats(updated);
    setEditingName(false);
  };

  const filteredEntries = leaderboard.filter((item) => {
    if (filterLevel === 'all') return true;
    return item.level === filterLevel;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-2xl rounded-3xl p-5 sm:p-7 flex flex-col relative overflow-hidden border border-amber-500/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] max-h-[90vh]"
        style={{
          background: 'linear-gradient(180deg, #18112d 0%, #09090b 100%)',
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-200">
              Clasificación del Tiétar
            </h2>
            <p className="text-xs text-slate-400">
              Compite con amigos y maestros de todos los rincones del valle
            </p>
          </div>
        </div>

        {/* Player Profile & Current Rank Box */}
        <div className="p-3 sm:p-4 rounded-2xl bg-black/50 border border-amber-500/30 mb-4">
          {editingName ? (
            <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Tu apodo o nombre"
                className="flex-1 w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-400/50 text-amber-200 text-xs sm:text-sm focus:outline-none"
                maxLength={20}
              />
              <input
                type="text"
                value={townInput}
                onChange={(e) => setTownInput(e.target.value)}
                placeholder="Pueblo (Arenas, Candeleda...)"
                className="w-full sm:w-44 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-400/50 text-amber-200 text-xs sm:text-sm focus:outline-none"
                maxLength={24}
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-amber-300">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-amber-200">
                      {stats.playerName}
                    </span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      (cambiar)
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400/70" />
                    <span>{stats.town}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Tu Puntuación Total
                </span>
                <span className="text-base sm:text-lg font-black text-amber-300 tabular-nums">
                  {stats.totalScore.toLocaleString('es-ES')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 custom-scrollbar">
          <button
            onClick={() => {
              sound.playPick();
              setFilterLevel('all');
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterLevel === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Todos los Niveles
          </button>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                sound.playPick();
                setFilterLevel(lvl);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterLevel === lvl
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Nivel {lvl}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            {filteredEntries.map((entry, index) => {
              const isTop3 = index < 3;
              const medalColors = [
                'text-yellow-400 bg-yellow-500/20 border-yellow-400',
                'text-slate-300 bg-slate-400/20 border-slate-300',
                'text-amber-600 bg-amber-700/20 border-amber-600',
              ];

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isTop3
                      ? 'bg-amber-950/20 border-amber-500/30 shadow-sm'
                      : 'bg-black/30 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Rank Number */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${
                        isTop3 ? medalColors[index] : 'text-slate-400 bg-black/40 border-white/10'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <div className="text-xs sm:text-sm font-bold text-amber-100 flex items-center gap-1.5">
                        <span>{entry.playerName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                          Nivel {entry.level}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{entry.town}</span>
                        <span>·</span>
                        <span className="truncate max-w-[140px] sm:max-w-none">{entry.puzzleTitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: entry.stars }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>

                    <div className="text-xs sm:text-sm font-black text-amber-300 tabular-nums min-w-[70px]">
                      {entry.score.toLocaleString('es-ES')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
