import React from 'react';
import { LevelConfig } from '../game/types';

interface TietarBackgroundProps {
  currentLevel: LevelConfig;
}

export const TietarBackground: React.FC<TietarBackgroundProps> = ({ currentLevel }) => {
  const levelId = currentLevel.id;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Dynamic Sky Gradient according to level theme */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${currentLevel.colorTheme.bgSky} transition-colors duration-1000 opacity-95`}
      />

      {/* Atmospheric Star / Dust Layer */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent" />

      {/* Stylized Architectural & Landscape Panorama for Valle del Tiétar */}
      <svg
        className="absolute bottom-0 w-full h-[65vh] min-h-[380px] max-h-[700px] object-cover transition-opacity duration-1000"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for mountains, castles, and waters */}
          <linearGradient id="gredosPeakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="castleWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#b45309" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="celticHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#059669" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="cavesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="tietarRiverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </linearGradient>

          {/* Glowing filter */}
          <filter id="neonSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Far Background: Sierra de Gredos Peaks (Almanzor & Los Galayos needles) */}
        <path
          d="M0 450 L120 280 L220 370 L340 210 L440 320 L580 180 L690 310 L840 220 L960 340 L1080 240 L1200 410 L1200 600 L0 600 Z"
          fill="url(#gredosPeakGrad)"
          opacity="0.6"
        />

        {/* Level Specific Middleground Landmarks */}
        {levelId === 1 && (
          // Nivel 1: Circo de Gredos & Picos graníticos con lagunas
          <g>
            {/* Galayos Granite Needles */}
            <path
              d="M510 320 L535 140 L560 320 L585 110 L610 320 L635 150 L660 330 Z"
              fill="#38bdf8"
              opacity="0.25"
              filter="url(#neonSoftGlow)"
            />
            {/* Mountain Lake / Laguna Grande reflection */}
            <ellipse cx="600" cy="510" rx="380" ry="45" fill="url(#tietarRiverGrad)" />
            {/* Pine and piornos ridges */}
            <path
              d="M0 480 Q300 420 600 460 T1200 470 L1200 600 L0 600 Z"
              fill="#064e3b"
              opacity="0.55"
            />
          </g>
        )}

        {levelId === 2 && (
          // Nivel 2: Castillo de La Adrada
          <g>
            {/* Medieval Castle Silhouette on the Hill */}
            {/* Outer walls */}
            <path
              d="M480 340 L480 250 L500 250 L500 270 L520 270 L520 250 L540 250 L540 270 L560 270 L560 230 L590 230 L590 200 L610 200 L610 230 L640 230 L640 270 L660 270 L660 250 L680 250 L680 270 L700 270 L700 250 L720 250 L720 340 Z"
              fill="url(#castleWallGrad)"
              filter="url(#neonSoftGlow)"
            />
            {/* Glowing Arrow Slits / Windows */}
            <rect x="530" y="290" width="8" height="24" rx="2" fill="#fde047" opacity="0.8" />
            <rect x="595" y="240" width="10" height="20" rx="2" fill="#fde047" opacity="0.9" />
            <rect x="660" y="290" width="8" height="24" rx="2" fill="#fde047" opacity="0.8" />
            {/* Castle Hill */}
            <path
              d="M320 540 Q600 320 880 540 Z"
              fill="#1e293b"
              opacity="0.8"
            />
          </g>
        )}

        {levelId === 3 && (
          // Nivel 3: Castro Vetón de El Raso (Candeleda)
          <g>
            {/* Pre-Roman Stone Terraces & Cyclopean Wall */}
            <path
              d="M100 520 L250 440 L450 430 L600 380 L800 420 L1050 450 L1200 530 L1200 600 L0 600 Z"
              fill="url(#celticHillGrad)"
            />
            {/* Stylized Stone Huts (Chozos Vetones) */}
            <path d="M420 430 L450 370 L480 430 Z" fill="#047857" opacity="0.75" />
            <path d="M680 390 L710 330 L740 390 Z" fill="#047857" opacity="0.75" />
            <circle cx="710" cy="325" r="4" fill="#34d399" filter="url(#neonSoftGlow)" />
            {/* Verraco Granite Monument Silhouette */}
            <path
              d="M320 470 C310 455 330 440 350 445 C370 445 385 460 385 470 Z"
              fill="#10b981"
              opacity="0.6"
              filter="url(#neonSoftGlow)"
            />
          </g>
        )}

        {levelId === 4 && (
          // Nivel 4: Castillo de Don Álvaro de Luna (Arenas de San Pedro)
          <g>
            {/* Tower of Homage (Torre del Homenaje) */}
            <path
              d="M520 380 L520 190 L540 190 L540 210 L560 210 L560 190 L580 190 L580 210 L600 210 L600 170 L620 170 L620 210 L640 210 L640 190 L660 190 L660 210 L680 210 L680 190 L700 190 L700 380 Z"
              fill="url(#castleWallGrad)"
              filter="url(#neonSoftGlow)"
            />
            {/* Medieval Romanesque Stone Bridge Arches (Puente Medieval del Tiétar) */}
            <path
              d="M200 520 Q300 440 400 520 Q500 440 600 520 Q700 440 800 520 Q900 440 1000 520 L1000 560 L200 560 Z"
              fill="#334155"
              opacity="0.7"
            />
            {/* Glowing Water passing underneath */}
            <path d="M0 540 Q600 520 1200 540 L1200 600 L0 600 Z" fill="url(#tietarRiverGrad)" />
          </g>
        )}

        {levelId === 5 && (
          // Nivel 5: Grutas de Cuevas del Águila y Pozas de Alardos
          <g>
            {/* Hanging Stalactites & Bioluminescent Rock Crystals */}
            <path d="M150 0 L180 160 L210 0 Z" fill="url(#cavesGrad)" />
            <path d="M380 0 L410 220 L440 0 Z" fill="url(#cavesGrad)" />
            <path d="M600 0 L630 280 L660 0 Z" fill="url(#cavesGrad)" filter="url(#neonSoftGlow)" />
            <path d="M820 0 L850 190 L880 0 Z" fill="url(#cavesGrad)" />
            <path d="M1020 0 L1050 170 L1080 0 Z" fill="url(#cavesGrad)" />

            {/* Rising Stalagmites */}
            <path d="M280 600 L310 420 L340 600 Z" fill="url(#cavesGrad)" />
            <path d="M500 600 L540 360 L580 600 Z" fill="url(#cavesGrad)" filter="url(#neonSoftGlow)" />
            <path d="M720 600 L760 390 L800 600 Z" fill="url(#cavesGrad)" />
            <path d="M940 600 L970 440 L1000 600 Z" fill="url(#cavesGrad)" />

            {/* Bioluminescent Pools */}
            <ellipse cx="600" cy="540" rx="480" ry="40" fill="#ec4899" opacity="0.3" filter="url(#neonSoftGlow)" />
          </g>
        )}

        {/* Floating Mossy Stone Island Framing matching reference screenshots */}
        {/* Left Floating Island */}
        <g opacity="0.85">
          <path
            d="M-40 180 C20 170 90 190 120 230 C140 260 110 320 80 340 C30 380 -50 350 -80 300 Z"
            fill="#1e293b"
          />
          {/* Lush Greenery / Pine Foliage */}
          <circle cx="20" cy="190" r="45" fill="#047857" opacity="0.8" />
          <circle cx="70" cy="220" r="35" fill="#10b981" opacity="0.7" />
          <circle cx="45" cy="260" r="40" fill="#065f46" opacity="0.8" />
          {/* Ancient Temple Ruins Stone Column on Island */}
          <rect x="25" y="145" width="16" height="35" rx="2" fill="#64748b" />
          <rect x="20" y="140" width="26" height="6" rx="1" fill="#94a3b8" />
        </g>

        {/* Right Floating Island */}
        <g opacity="0.85">
          <path
            d="M1240 140 C1180 130 1110 150 1080 190 C1060 220 1090 280 1120 300 C1170 340 1250 310 1280 260 Z"
            fill="#1e293b"
          />
          {/* Lush Greenery / Pine Foliage */}
          <circle cx="1180" cy="150" r="45" fill="#047857" opacity="0.8" />
          <circle cx="1130" cy="180" r="35" fill="#10b981" opacity="0.7" />
          <circle cx="1155" cy="220" r="40" fill="#065f46" opacity="0.8" />
          {/* Ancient Temple Stone Cap */}
          <rect x="1160" y="105" width="18" height="35" rx="2" fill="#64748b" />
          <rect x="1152" y="100" width="34" height="6" rx="1" fill="#94a3b8" />
        </g>
      </svg>

      {/* Floating Sparkle Motes / Mountain Mist */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
    </div>
  );
};
