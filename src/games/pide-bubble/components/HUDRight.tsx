import React from 'react';
import { Zap, Bomb, Sparkles } from 'lucide-react';
import { Mission } from '../types/game';

interface HUDRightProps {
  missions: Mission[];
  mortarCharge: number; // 0 to 1
  isMortarReady: boolean;
  onLaunchMortar: () => void;
}

export const HUDRight: React.FC<HUDRightProps> = ({
  missions,
  mortarCharge,
  isMortarReady,
  onLaunchMortar,
}) => {
  return (
    <div className="flex flex-col justify-between h-full py-2 items-end pointer-events-auto select-none">
      {/* Missions Card (matching Image 3 & 4 right panel) */}
      <div className="w-48 md:w-56 game-glass-panel rounded-2xl p-4 border border-purple-500/40 shadow-[0_8px_32px_rgba(30,10,60,0.6)]">
        <h3 className="text-base font-bold text-white tracking-wide mb-3 flex items-center justify-between">
          <span>Missions</span>
          <Sparkles className="w-4 h-4 text-purple-300" />
        </h3>

        <div className="space-y-3.5">
          {missions.map(mission => {
            const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
            const isCompleted = mission.completed || pct >= 100;

            return (
              <div key={mission.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-purple-200">
                  <span className="font-medium truncate">{mission.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Progress Bar with Pill Counter inside */}
                  <div className="relative flex-1 h-6 bg-purple-950/80 rounded-full border border-purple-600/40 overflow-hidden flex items-center">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold text-white drop-shadow">
                      {mission.current}/{mission.target}
                    </span>
                  </div>

                  {/* Mission Icon Badge with neon glow */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                      mission.icon === 'lightning'
                        ? 'bg-purple-900 border-pink-400 text-pink-300 shadow-[0_0_12px_rgba(255,42,141,0.6)]'
                        : 'bg-indigo-900 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(255,180,0,0.6)]'
                    }`}
                  >
                    {mission.icon === 'lightning' ? (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Bomb className="w-3.5 h-3.5 fill-current" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Right: Mortar Power-Up Launcher (matching Image 3 & 4) */}
      <div className="flex flex-col items-center gap-2 mt-4">
        {/* Scalloped Gear / Sunburst Icon Slot */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Scalloped Gear SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <path
              d="M50 0 C53 10, 60 10, 65 5 C70 15, 78 17, 85 15 C87 25, 93 30, 100 35 C97 45, 98 55, 100 65 C93 70, 87 75, 85 85 C78 83, 70 85, 65 95 C60 90, 53 90, 50 100 C47 90, 40 90, 35 95 C30 85, 22 83, 15 85 C13 75, 7 70, 0 65 C3 55, 2 45, 0 35 C7 30, 13 25, 15 15 C22 17, 30 15, 35 5 C40 10, 47 10, 50 0 Z"
              fill={isMortarReady ? 'rgba(255, 68, 0, 0.3)' : 'rgba(40, 20, 80, 0.4)'}
              stroke={isMortarReady ? '#ff5500' : 'rgba(140, 100, 220, 0.35)'}
              strokeWidth="3"
              className={isMortarReady ? 'animate-spin' : ''}
              style={{ animationDuration: '10s' }}
            />
          </svg>

          {/* Internal Circular Icon / Meter */}
          <div
            className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
              isMortarReady
                ? 'bg-gradient-to-br from-amber-500 to-rose-600 border-yellow-200 text-white shadow-[0_0_20px_rgba(255,80,0,0.8)] scale-110'
                : 'bg-purple-950/80 border-purple-700/50 text-purple-400'
            }`}
          >
            <Bomb className={`w-5 h-5 ${isMortarReady ? 'animate-bounce' : ''}`} />
          </div>

          {/* Charge circular progress ring */}
          {!isMortarReady && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="rgba(255, 120, 0, 0.8)"
                strokeWidth="4"
                strokeDasharray={238}
                strokeDashoffset={238 - 238 * mortarCharge}
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Launch Mortar CTA */}
        <button
          onClick={onLaunchMortar}
          disabled={!isMortarReady}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            isMortarReady
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-orange-600 text-white shadow-[0_0_18px_rgba(255,100,0,0.7)] hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
              : 'bg-purple-950/60 text-purple-500/80 border border-purple-800/40 cursor-not-allowed'
          }`}
        >
          {isMortarReady ? '¡DISPARAR MORTERO!' : `Mortero (${Math.round(mortarCharge * 100)}%)`}
        </button>
      </div>
    </div>
  );
};
