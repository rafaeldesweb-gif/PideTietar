import React from 'react';
import { RotateCw } from 'lucide-react';
import { Piece, BlockColor } from '../game/types';

interface PieceQueueProps {
  queue: Piece[];
  selectedPieceId: string | null;
  onSelectPiece: (piece: Piece) => void;
  onRotatePiece: (pieceId: string) => void;
  onDragStartPiece: (piece: Piece, e: React.MouseEvent | React.TouchEvent) => void;
}

export const PieceQueue: React.FC<PieceQueueProps> = ({
  queue,
  selectedPieceId,
  onSelectPiece,
  onRotatePiece,
  onDragStartPiece,
}) => {
  return (
    <div className="w-full h-full flex flex-row lg:flex-col items-center justify-around gap-2 p-2 bg-gradient-to-b from-slate-900/90 via-blue-950/80 to-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner select-none overflow-hidden">
      {queue.map((piece, index) => {
        const isSelected = selectedPieceId === piece.id;

        return (
          <div
            key={piece.id || index}
            className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'bg-cyan-950/80 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105'
                : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-500'
            }`}
            onClick={() => onSelectPiece(piece)}
            onTouchStart={(e) => onDragStartPiece(piece, e)}
            onMouseDown={(e) => onDragStartPiece(piece, e)}
          >
            {/* Quick Rotate Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRotatePiece(piece.id);
              }}
              className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-800 hover:bg-cyan-600 border border-slate-600 text-slate-300 hover:text-white shadow-md active:scale-90 transition-transform z-10 cursor-pointer"
              title="Girar pieza (R)"
              aria-label="Girar pieza"
            >
              <RotateCw className="w-3 h-3" />
            </button>

            {/* Piece Matrix Display */}
            <div
              className="grid gap-[2px] p-1.5"
              style={{
                gridTemplateRows: `repeat(${piece.shape.length}, minmax(0, 1fr))`,
                gridTemplateColumns: `repeat(${piece.shape[0].length}, minmax(0, 1fr))`,
              }}
            >
              {piece.shape.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  if (cell === 0) {
                    return <div key={`${rIdx}-${cIdx}`} className="w-5 h-5 sm:w-6 sm:h-6" />;
                  }

                  const hasGem =
                    piece.gemPosition &&
                    piece.gemPosition.r === rIdx &&
                    piece.gemPosition.c === cIdx;

                  return (
                    <MiniBlock
                      key={`${rIdx}-${cIdx}`}
                      color={piece.color}
                      hasGem={!!hasGem}
                    />
                  );
                })
              )}
            </div>

            {/* Instruction helper tag */}
            <span className="text-[9px] text-slate-400 group-hover:text-cyan-300 font-medium tracking-tight mt-0.5">
              {isSelected ? 'Seleccionada' : 'Toca o arrastra'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Mini rendered block for queue
const MiniBlock: React.FC<{ color: BlockColor; hasGem: boolean }> = ({ color, hasGem }) => {
  let bgClasses = 'bg-teal-500 border-teal-300';
  if (color === 'cyan') bgClasses = 'bg-cyan-500 border-cyan-300';
  if (color === 'mint') bgClasses = 'bg-emerald-500 border-emerald-300';
  if (color === 'azure') bgClasses = 'bg-sky-500 border-sky-300';

  return (
    <div
      className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-[2px] border ${bgClasses} shadow-sm overflow-hidden flex items-center justify-center`}
    >
      {/* 3D bevel shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/40 pointer-events-none" />

      {/* Embedded Prismatic Gem */}
      {hasGem && (
        <div className="relative z-10 w-3 h-3 flex items-center justify-center">
          <svg
            className="w-full h-full filter drop-shadow-[0_0_3px_rgba(236,72,153,0.9)] animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
          >
            <polygon points="12,2 22,12 12,22 2,12" fill="#cffafe" />
            <polygon points="12,2 22,12 12,12" fill="#ffffff" fillOpacity="0.8" />
            <polygon points="2,12 12,22 12,12" fill="#ec4899" />
            <polygon points="22,12 12,22 12,12" fill="#a855f7" />
          </svg>
        </div>
      )}
    </div>
  );
};
