import React from 'react';
import { Play, Users, Calendar, Trophy, Image as ImageIcon, Volume2, VolumeX, Moon, Sun, Award, Coins, Star, ChevronRight } from 'lucide-react';
import { PlayerStats, getMonthlyEmblem } from '../utils/storage';
import { LEVEL_CONFIGS, PUZZLES } from '../data/puzzles';
import { sound } from '../utils/audio';

interface TitleScreenProps {
  playerStats: PlayerStats;
  isDark: boolean;
  isMuted: boolean;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onStartCampaign: (level?: number) => void;
  onStartMultiplayer: () => void;
  onOpenDaily: () => void;
  onOpenLeaderboard: () => void;
  onOpenGallery: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerStats,
  isDark,
  isMuted,
  onToggleTheme,
  onToggleMute,
  onStartCampaign,
  onStartMultiplayer,
  onOpenDaily,
  onOpenLeaderboard,
  onOpenGallery,
}) => {
  const completedCount = Object.keys(playerStats.completedPuzzles).length;
  const totalStars = Object.values(playerStats.completedPuzzles).reduce((sum, p) => sum + p.stars, 0);
  const { emblem, progress } = getMonthlyEmblem(playerStats.coins);

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-between p-3 sm:p-6 select-none relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR: Sound, Dark/Light Mode & Applet branding */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow">
            🧩
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-wider uppercase block">
              Valle del Tiétar
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Rompecabezas Clásico · Sierra de Gredos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-amber-200 border border-white/10 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-amber-200 border border-white/10 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CENTERPIECE: Glowing Neon Cover Art & Player Status Entry Card */}
      <div className="w-full max-w-3xl flex flex-col items-center my-4 sm:my-6 z-10">
        {/* Glowing Neon App Icon Card (matching user reference screenshot Rompecabezas__2__29c6f61f.png) */}
        <div className="relative group mb-5">
          {/* Cyan/blue neon glow border */}
          <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 opacity-75 blur-md group-hover:opacity-100 transition-opacity" />

          <div
            className="relative w-44 sm:w-56 h-56 sm:h-72 rounded-[2.2rem] p-3 flex flex-col items-center justify-between border-2 border-sky-300 shadow-[0_0_35px_rgba(56,189,248,0.5)] overflow-hidden cursor-pointer"
            style={{
              background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 70%, #020617 100%)',
            }}
            onClick={() => {
              sound.playPick();
              onStartCampaign();
            }}
          >
            {/* The cover image asset */}
            <img
              src="/assets/games/rompecabezas/cover.png"
              alt="Rompecabezas Valle del Tiétar"
              className="w-full h-full object-cover rounded-3xl"
            />
          </div>
        </div>

        {/* PLAYER STATUS ENTRANCE CARD (Requested: "permite guardar la puntuación final y mostrarla en la entrada de la App al igual que los otros juegos") */}
        <div className="w-full max-w-xl rounded-3xl p-4 sm:p-5 bg-black/60 border border-amber-500/40 shadow-2xl backdrop-blur-md mb-6">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">
                  Perfil del Jugador
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-200">
                  {playerStats.playerName}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playPick();
                onOpenLeaderboard();
              }}
              className="px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>Ver Ranking</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Puntuación */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Puntuación</span>
              <span className="text-xs sm:text-sm font-black text-amber-300 tabular-nums mt-0.5">
                {playerStats.totalScore.toLocaleString('es-ES')}
              </span>
            </div>

            {/* Estrellas */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Estrellas</span>
              <div className="flex items-center gap-0.5 mt-0.5 text-yellow-300">
                <Star className="w-3 h-3 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-black tabular-nums">{totalStars} / 45</span>
              </div>
            </div>

            {/* Monedas */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Monedas</span>
              <div className="flex items-center gap-0.5 mt-0.5 text-yellow-300">
                <Coins className="w-3 h-3 text-yellow-400" />
                <span className="text-xs sm:text-sm font-black tabular-nums">{playerStats.coins}</span>
              </div>
            </div>

            {/* Emblema */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Emblema</span>
              <span className="text-xs sm:text-sm font-black text-amber-400 capitalize mt-0.5">
                {emblem}
              </span>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS */}
        <div className="w-full max-w-xl flex flex-col gap-2.5">
          {/* 1. Modo Campaña (5 Niveles, 3 por nivel) */}
          <button
            onClick={() => {
              sound.playPick();
              onStartCampaign();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_4px_25px_rgba(245,158,11,0.5)] flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950/20 flex items-center justify-center">
                <Play className="w-5 h-5 fill-slate-950" />
              </div>
              <div className="text-left">
                <span className="block leading-tight">Jugar Campaña (5 Niveles)</span>
                <span className="text-[11px] font-semibold text-slate-900/80 block">
                  3 paisajes por nivel · Dificultad creciente (6 a 36 piezas)
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 2. Modo Multijugador Local */}
          <button
            onClick={() => {
              sound.playPick();
              onStartMultiplayer();
            }}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-sm shadow-lg flex items-center justify-between transition-all hover:scale-[1.01] border border-sky-400/40 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="block leading-tight">Modo Multijugador Local (2 Jugadores)</span>
                <span className="text-[11px] font-normal text-sky-100/80 block">
                  Duelo por turnos en el mismo dispositivo
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-sky-200" />
          </button>

          {/* 3. Desafíos Diarios & Galería */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                sound.playPick();
                onOpenDaily();
              }}
              className="py-2.5 px-3 rounded-2xl bg-black/50 hover:bg-black/70 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Desafíos Diarios</span>
            </button>

            <button
              onClick={() => {
                sound.playPick();
                onOpenGallery();
              }}
              className="py-2.5 px-3 rounded-2xl bg-black/50 hover:bg-black/70 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Galería Valle del Tiétar</span>
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER: Valle del Tiétar Landmarks & Peaceful credits */}
      <footer className="w-full max-w-4xl text-center text-[11px] text-slate-400/80 pt-2 border-t border-white/5 z-10">
        <span>Valle del Tiétar · Arenas de San Pedro · Candeleda · Mombeltrán · Guisando · Sierra de Gredos</span>
      </footer>
    </div>
  );
};
