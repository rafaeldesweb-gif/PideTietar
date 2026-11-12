import React, { useState } from 'react';
import { X, Calendar, Award, Coins, CheckCircle, Play, ChevronRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface DailyChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCoins: number;
  onStartChallenge: (challengeType: 'lock' | 'timer' | 'no_ghost') => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  isOpen,
  onClose,
  playerCoins,
  onStartChallenge,
}) => {
  const [tab, setTab] = useState<'challenges' | 'emblems'>('challenges');

  if (!isOpen) return null;

  // Monthly progress calculations
  const bronzeTarget = 2000;
  const silverTarget = 6000;
  const goldTarget = 12000;

  const currentEmblem =
    playerCoins >= goldTarget
      ? 'Oro'
      : playerCoins >= silverTarget
      ? 'Plata'
      : playerCoins >= bronzeTarget
      ? 'Bronce'
      : 'Aspirante';

  const progressPercent = Math.min(100, Math.round((playerCoins / goldTarget) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-xl rounded-3xl p-5 sm:p-7 flex flex-col relative overflow-hidden border border-amber-500/40 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
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

        {/* Tab switchers: Desafíos de Hoy vs Emblemas del Mes */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              sound.playPick();
              setTab('challenges');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              tab === 'challenges'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            ¡Manos a la Obra!
          </button>
          <button
            onClick={() => {
              sound.playPick();
              setTab('emblems');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              tab === 'emblems'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Emblemas Mensuales
          </button>
        </div>

        {tab === 'challenges' ? (
          /* TAB 1: 3 Daily challenge cards matching desafios_diarios3_46e36252.png */
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-200">
                Desafíos Diarios del Tiétar
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                ¡Pulsa sobre cualquiera de los desafíos de hoy para comenzar y ganar monedas para tus emblemas!
              </p>
            </div>

            {/* 3 Color Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
              {/* Card 1: Descerrador (Red card) */}
              <div
                onClick={() => {
                  sound.playPick();
                  onStartChallenge('lock');
                }}
                className="group relative rounded-2xl p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 shadow-lg border border-red-400/40"
                style={{
                  background: 'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)',
                }}
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
                  <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Descerrador</h3>
                <p className="text-[11px] text-red-100/90 leading-tight mb-2">
                  Conecta piezas con límite de movimientos
                </p>
                <div className="px-2.5 py-1 rounded-full bg-black/40 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-400/30">
                  <Coins className="w-3.5 h-3.5" />
                  <span>+150</span>
                </div>
              </div>

              {/* Card 2: Contrarreloj (Cyan/Blue card) */}
              <div
                onClick={() => {
                  sound.playPick();
                  onStartChallenge('timer');
                }}
                className="group relative rounded-2xl p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 shadow-lg border border-sky-400/40"
                style={{
                  background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                }}
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🐞</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Contrarreloj</h3>
                <p className="text-[11px] text-sky-100/90 leading-tight mb-2">
                  Resuelve contra el tiempo del Tiétar
                </p>
                <div className="px-2.5 py-1 rounded-full bg-black/40 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-400/30">
                  <Coins className="w-3.5 h-3.5" />
                  <span>+200</span>
                </div>
              </div>

              {/* Card 3: Maestro Silencioso (Green card) */}
              <div
                onClick={() => {
                  sound.playPick();
                  onStartChallenge('no_ghost');
                }}
                className="group relative rounded-2xl p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:scale-105 shadow-lg border border-emerald-400/40"
                style={{
                  background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                }}
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🧩</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Mosaico Puro</h3>
                <p className="text-[11px] text-emerald-100/90 leading-tight mb-2">
                  Sin guía visual ni pistas
                </p>
                <div className="px-2.5 py-1 rounded-full bg-black/40 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-400/30">
                  <Coins className="w-3.5 h-3.5" />
                  <span>+250</span>
                </div>
              </div>
            </div>

            {/* Bottom reminder banner */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>¡Cada día hay 3 nuevos desafíos para sumar monedas!</span>
              </div>
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <Coins className="w-4 h-4" />
                <span className="tabular-nums">{playerCoins}</span>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: Medallas del Mes matching desafios_diarios2_cace7835.png */
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-200">
                Emblemas del Mes
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Gana monedas en tus partidas para desbloquear las tres insignias de honor del Valle del Tiétar.
              </p>
            </div>

            {/* 3 Medals Display */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 my-2">
              {/* Bronce */}
              <div
                className={`p-3 rounded-2xl flex flex-col items-center text-center border transition-all ${
                  playerCoins >= bronzeTarget
                    ? 'bg-amber-950/60 border-amber-700 shadow-md ring-2 ring-amber-700/50'
                    : 'bg-black/40 border-white/10 opacity-70'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 border-2 border-amber-600 flex items-center justify-center text-amber-300 shadow-md mb-2">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-400">Bronce</h3>
                <span className="text-[11px] text-slate-300 mt-0.5">2.000 monedas</span>
                {playerCoins >= bronzeTarget ? (
                  <span className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> ¡Obtenido!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 mt-1">En progreso</span>
                )}
              </div>

              {/* Plata */}
              <div
                className={`p-3 rounded-2xl flex flex-col items-center text-center border transition-all ${
                  playerCoins >= silverTarget
                    ? 'bg-slate-800/80 border-slate-300 shadow-md ring-2 ring-slate-300/50'
                    : 'bg-black/40 border-white/10 opacity-70'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-2 border-slate-200 flex items-center justify-center text-slate-900 shadow-md mb-2">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-200">Plata</h3>
                <span className="text-[11px] text-slate-300 mt-0.5">6.000 monedas</span>
                {playerCoins >= silverTarget ? (
                  <span className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> ¡Obtenido!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 mt-1">En progreso</span>
                )}
              </div>

              {/* Oro */}
              <div
                className={`p-3 rounded-2xl flex flex-col items-center text-center border transition-all ${
                  playerCoins >= goldTarget
                    ? 'bg-amber-900/60 border-amber-400 shadow-lg ring-2 ring-amber-400'
                    : 'bg-black/40 border-white/10 opacity-70'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 border-2 border-yellow-200 flex items-center justify-center text-amber-950 shadow-md mb-2">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-300">Oro</h3>
                <span className="text-[11px] text-slate-300 mt-0.5">12.000 monedas</span>
                {playerCoins >= goldTarget ? (
                  <span className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> ¡Obtenido!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 mt-1">En progreso</span>
                )}
              </div>
            </div>

            {/* Total coins progress meter */}
            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-medium">Progreso hacia el Emblema de Oro</span>
                <span className="text-amber-300 font-bold tabular-nums">
                  {playerCoins.toLocaleString('es-ES')} / 12.000
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-amber-500/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
