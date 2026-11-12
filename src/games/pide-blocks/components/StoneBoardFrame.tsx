import React from 'react';

interface StoneBoardFrameProps {
  children: React.ReactNode;
  sidecar: React.ReactNode;
}

export const StoneBoardFrame: React.FC<StoneBoardFrameProps> = ({ children, sidecar }) => {
  return (
    <div className="relative w-full max-w-4xl mx-auto px-2 select-none flex flex-col items-center justify-center">
      {/* Outer Carved Stone Tablet Frame */}
      <div className="relative w-full p-2.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 border-[3px] border-slate-500/80 shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.25)] flex flex-col lg:flex-row items-center gap-3 sm:gap-4">
        {/* Ancient Stone Corner Relinquary Details (Celtic / Iberian Fretwork) */}
        {/* Top-Left Corner Spiral Glyph */}
        <div className="absolute top-1.5 left-1.5 w-6 h-6 border-t-2 border-l-2 border-slate-400/70 rounded-tl pointer-events-none flex items-center justify-center">
          <div className="w-2.5 h-2.5 border-t border-l border-cyan-400/50" />
        </div>
        {/* Top-Right Corner Spiral Glyph */}
        <div className="absolute top-1.5 right-1.5 w-6 h-6 border-t-2 border-r-2 border-slate-400/70 rounded-tr pointer-events-none flex items-center justify-center">
          <div className="w-2.5 h-2.5 border-t border-r border-cyan-400/50" />
        </div>
        {/* Bottom-Left Corner Spiral Glyph */}
        <div className="absolute bottom-1.5 left-1.5 w-6 h-6 border-b-2 border-l-2 border-slate-400/70 rounded-bl pointer-events-none flex items-center justify-center">
          <div className="w-2.5 h-2.5 border-b border-l border-cyan-400/50" />
        </div>
        {/* Bottom-Right Corner Spiral Glyph */}
        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 border-b-2 border-r-2 border-slate-400/70 rounded-br pointer-events-none flex items-center justify-center">
          <div className="w-2.5 h-2.5 border-b border-r border-cyan-400/50" />
        </div>

        {/* Central Playing Grid Well */}
        <div className="relative flex-1 w-full flex items-center justify-center bg-slate-950 rounded-xl p-1 sm:p-1.5 border-2 border-slate-800/90 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] overflow-hidden">
          {children}
        </div>

        {/* Right Sidecar (Queue for Desktop) or Bottom Tray (for Mobile) */}
        <div className="w-full lg:w-48 lg:h-[460px] flex items-center justify-center shrink-0">
          {sidecar}
        </div>
      </div>
    </div>
  );
};
