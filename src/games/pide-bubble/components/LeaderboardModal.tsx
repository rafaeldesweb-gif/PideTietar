import React, { useState } from 'react';
import { X, Trophy, Medal, Crown, User, Check, Flame } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  userScore: number;
  userName: string;
  onUpdateUserName: (name: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  userScore,
  userName,
  onUpdateUserName,
}) => {
  const [activeTab, setActiveTab] = useState<'semanal' | 'historico' | 'premios'>('semanal');
  const [editingName, setEditingName] = useState(userName);
  const [savedName, setSavedName] = useState(false);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingName.trim()) {
      onUpdateUserName(editingName.trim());
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    }
  };

  // Sort entries descending by score
  const sortedEntries = [...entries].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg game-glass-panel rounded-3xl p-6 border-2 border-purple-500/50 shadow-[0_0_40px_rgba(140,50,230,0.4)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-700/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Ranking de Clientes</span>
                <span className="text-[10px] px-2 py-0.5 bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded-full font-mono">
                  LIVE
                </span>
              </h2>
              <p className="text-xs text-purple-300">Compite mientras esperas tu comida y gana cupones VIP</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-900/60 rounded-full text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 my-3 bg-purple-950/70 p-1 rounded-xl border border-purple-800/40 text-xs">
          <button
            onClick={() => setActiveTab('semanal')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === 'semanal'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === 'historico'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Histórico Global
          </button>
          <button
            onClick={() => setActiveTab('premios')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              activeTab === 'premios'
                ? 'bg-purple-700 text-white shadow-md'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            Premios del Mes
          </button>
        </div>

        {/* User Nickname Form */}
        <form onSubmit={handleSaveName} className="mb-3 flex items-center gap-2 bg-purple-950/50 p-2.5 rounded-xl border border-purple-800/50">
          <User className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            maxLength={18}
            placeholder="Tu apodo de jugador"
            className="bg-transparent text-xs text-white placeholder-purple-400/60 focus:outline-none flex-1 font-semibold"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition-transform active:scale-95 flex items-center gap-1"
          >
            {savedName ? <Check className="w-3.5 h-3.5" /> : 'Guardar'}
          </button>
        </form>

        {/* Tab Content: Leaderboard List */}
        {activeTab !== 'premios' ? (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
            {sortedEntries.map((entry, index) => {
              const rank = index + 1;
              const isUser = entry.isUser || entry.name === userName;
              const currentScore = isUser ? Math.max(entry.score, userScore) : entry.score;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    isUser
                      ? 'bg-gradient-to-r from-purple-900/90 to-pink-950/90 border-pink-400/70 shadow-[0_0_15px_rgba(255,42,141,0.35)]'
                      : rank === 1
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : rank === 2
                      ? 'bg-slate-900/60 border-slate-400/40'
                      : rank === 3
                      ? 'bg-amber-950/20 border-amber-700/30'
                      : 'bg-purple-950/40 border-purple-800/30'
                  }`}
                >
                  {/* Left: Rank & User Avatar */}
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {rank === 1 ? (
                        <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                      ) : rank === 2 ? (
                        <Medal className="w-5 h-5 text-slate-300 fill-slate-300" />
                      ) : rank === 3 ? (
                        <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />
                      ) : (
                        <span className="text-purple-300">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar with fallback */}
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-purple-900 border border-purple-600/50 shrink-0 flex items-center justify-center text-xs font-bold text-white">
                      {entry.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name & Dish */}
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">
                          {entry.name}
                        </span>
                        {isUser && (
                          <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                            TÚ
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-purple-300/80 truncate">
                        {entry.orderFavorite}
                      </p>
                    </div>
                  </div>

                  {/* Right: Score & Level */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-[#00f0ff] font-mono tabular-nums text-glow-cyan">
                      {currentScore.toLocaleString('es-ES')}
                    </div>
                    <span className="text-[10px] text-purple-300 font-mono">
                      Nivel {entry.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Premios del Mes Tab */
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 text-xs">
            <div className="bg-gradient-to-r from-amber-950/60 to-purple-950/60 p-3.5 rounded-2xl border border-amber-500/40">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                <Crown className="w-4 h-4" />
                <span>1º Lugar: $100 en Comida Gratis</span>
              </div>
              <p className="text-purple-200">
                El cliente con mayor puntaje acumulado a fin de mes recibe 1 mes de almuerzos o cenas gratis.
              </p>
            </div>

            <div className="bg-gradient-to-r from-slate-900/60 to-purple-950/60 p-3.5 rounded-2xl border border-slate-400/40">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-1">
                <Medal className="w-4 h-4 text-slate-300" />
                <span>2º y 3º Lugar: Pase VIP + 50% OFF</span>
              </div>
              <p className="text-purple-200">
                Envíos prioritarios y 50% de descuento en tus 5 pedidos favoritos del mes.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-950/60 to-pink-950/60 p-3.5 rounded-2xl border border-pink-500/40">
              <div className="flex items-center gap-2 text-pink-300 font-bold text-sm mb-1">
                <Flame className="w-4 h-4 text-pink-400" />
                <span>Top 10: Cupones de $10 USD directos</span>
              </div>
              <p className="text-purple-200">
                Se bonifica automáticamente en el balance de tu billetera de la aplicación.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-purple-800/40 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-98"
          >
            Volver al Juego
          </button>
        </div>
      </div>
    </div>
  );
};
