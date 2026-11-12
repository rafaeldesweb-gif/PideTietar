import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generatePuzzleGrid, PieceShape } from '../utils/jigsawMath';
import { sound } from '../utils/audio';
import { ZoomIn, ZoomOut, Sparkles, X, Eye, EyeOff } from 'lucide-react';

interface PuzzleBoardProps {
  puzzleId: string;
  imageSrc: string;
  puzzleTitle: string;
  rows: number;
  cols: number;
  ghostOpacity: number;
  showGridOutlines: boolean;
  showPhotoPreview: boolean;
  filterMode: 'all' | 'edge' | 'inside';
  onClosePhotoPreview: () => void;
  onPiecePlaced: (piece: PieceShape, remainingCount: number) => void;
  onPuzzleCompleted: () => void;
  // Local multiplayer props (optional)
  multiplayerMode?: boolean;
  currentPlayerTurn?: 1 | 2;
  onMultiplayerMove?: (success: boolean, pieceId: string) => void;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  puzzleId,
  imageSrc,
  puzzleTitle,
  rows,
  cols,
  ghostOpacity,
  showGridOutlines,
  showPhotoPreview,
  filterMode,
  onClosePhotoPreview,
  onPiecePlaced,
  onPuzzleCompleted,
  multiplayerMode = false,
  currentPlayerTurn = 1,
  onMultiplayerMove,
}) => {
  // Puzzle dimensions in virtual coordinate space
  const BOARD_WIDTH = 640;
  const BOARD_HEIGHT = 480;

  // Generate grid shapes
  const gridData = useMemo(() => {
    return generatePuzzleGrid(puzzleId, rows, cols, BOARD_WIDTH, BOARD_HEIGHT);
  }, [puzzleId, rows, cols]);

  // Set of placed piece IDs
  const [placedPieceIds, setPlacedPieceIds] = useState<Set<string>>(new Set());

  // Track which player placed which piece (for local multiplayer)
  const [pieceOwners, setPieceOwners] = useState<Record<string, 1 | 2>>({});

  // Active selected piece (for click-to-place on mobile)
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  // Dragging state
  const [draggedPiece, setDraggedPiece] = useState<PieceShape | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  // Zoom scale for mobile / desktop
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Recent snap flash animation
  const [lastSnappedPieceId, setLastSnappedPieceId] = useState<string | null>(null);

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset when puzzle changes
  useEffect(() => {
    setPlacedPieceIds(new Set());
    setPieceOwners({});
    setSelectedPieceId(null);
    setDraggedPiece(null);
    setLastSnappedPieceId(null);
  }, [puzzleId]);

  // Unplaced pieces
  const unplacedPieces = useMemo(() => {
    return gridData.pieces.filter((p) => !placedPieceIds.has(p.id));
  }, [gridData, placedPieceIds]);

  // Filtered tray pieces
  const filteredTrayPieces = useMemo(() => {
    if (filterMode === 'edge') {
      return unplacedPieces.filter((p) => p.isEdge);
    }
    if (filterMode === 'inside') {
      return unplacedPieces.filter((p) => !p.isEdge);
    }
    return unplacedPieces;
  }, [unplacedPieces, filterMode]);

  // Handle piece snapping
  const handleSnap = (piece: PieceShape) => {
    sound.playSnap();
    const newPlaced = new Set(placedPieceIds);
    newPlaced.add(piece.id);
    setPlacedPieceIds(newPlaced);

    if (multiplayerMode) {
      setPieceOwners((prev) => ({ ...prev, [piece.id]: currentPlayerTurn }));
      if (onMultiplayerMove) {
        onMultiplayerMove(true, piece.id);
      }
    }

    setLastSnappedPieceId(piece.id);
    setSelectedPieceId(null);
    setDraggedPiece(null);
    setDragPos(null);

    const remaining = gridData.pieces.length - newPlaced.size;
    onPiecePlaced(piece, remaining);

    if (remaining === 0) {
      setTimeout(() => {
        sound.playVictory();
        onPuzzleCompleted();
      }, 500);
    }
  };

  // Convert client pointer event coordinates to SVG coordinates
  const getSvgCoordinates = (clientX: number, clientY: number) => {
    if (!boardSvgRef.current) return null;
    const svg = boardSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  // Start dragging from tray
  const handleTrayPointerDown = (piece: PieceShape, e: React.PointerEvent) => {
    e.preventDefault();
    sound.playPick();
    setSelectedPieceId(piece.id);
    setDraggedPiece(piece);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  // Global pointer move for dragging piece
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggedPiece) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!draggedPiece) return;

      const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
      if (svgCoords) {
        // Distance to target center
        const targetCenterX = draggedPiece.x + draggedPiece.width / 2;
        const targetCenterY = draggedPiece.y + draggedPiece.height / 2;
        const dist = Math.hypot(svgCoords.x - targetCenterX, svgCoords.y - targetCenterY);

        // Snap tolerance threshold
        const snapThreshold = Math.max(55, draggedPiece.width * 0.55);

        if (dist <= snapThreshold) {
          handleSnap(draggedPiece);
          return;
        } else {
          if (multiplayerMode && onMultiplayerMove) {
            onMultiplayerMove(false, draggedPiece.id);
          }
          sound.playDrop();
        }
      } else {
        sound.playDrop();
      }

      setDraggedPiece(null);
      setDragPos(null);
    };

    if (draggedPiece) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggedPiece, placedPieceIds, multiplayerMode, currentPlayerTurn]);

  // Click on board to place selected piece
  const handleBoardClick = (e: React.MouseEvent) => {
    if (!selectedPieceId) return;
    const piece = unplacedPieces.find((p) => p.id === selectedPieceId);
    if (!piece) return;

    const svgCoords = getSvgCoordinates(e.clientX, e.clientY);
    if (!svgCoords) return;

    const targetCenterX = piece.x + piece.width / 2;
    const targetCenterY = piece.y + piece.height / 2;
    const dist = Math.hypot(svgCoords.x - targetCenterX, svgCoords.y - targetCenterY);

    const snapThreshold = Math.max(65, piece.width * 0.65);
    if (dist <= snapThreshold) {
      handleSnap(piece);
    } else {
      if (multiplayerMode && onMultiplayerMove) {
        onMultiplayerMove(false, piece.id);
      }
      sound.playDrop();
    }
  };

  // Place 1 piece as a hint
  const handleMagicHint = () => {
    if (unplacedPieces.length === 0) return;
    const randomPiece = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)];
    handleSnap(randomPiece);
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col lg:flex-row items-center justify-center gap-4 px-2 sm:px-4 py-2 select-none relative"
    >
      {/* FLOATING MINI PHOTO PREVIEW (PISTA DE REFERENCIA) */}
      {showPhotoPreview && (
        <div className="absolute top-2 left-2 z-40 rounded-2xl bg-black/80 border-2 border-amber-400 p-2 shadow-2xl backdrop-blur-md max-w-[200px] sm:max-w-[240px] animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10">
            <span className="text-[11px] font-bold text-amber-200 truncate pr-2">
              {puzzleTitle}
            </span>
            <button
              onClick={onClosePhotoPreview}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-950">
            <img src={imageSrc} alt={puzzleTitle} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* LEFT / CENTER: THE PUZZLE BOARD */}
      <div className="relative flex flex-col items-center">
        {/* Board Frame with classic beveled edge and deep velvet drop shadow */}
        <div
          className="relative rounded-2xl p-2 sm:p-3 shadow-[0_12px_40px_rgba(0,0,0,0.6)] border-2 transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(30,27,75,0.7) 0%, rgba(15,23,42,0.85) 100%)',
            borderColor: multiplayerMode
              ? currentPlayerTurn === 1
                ? 'rgba(56, 189, 248, 0.8)'
                : 'rgba(251, 191, 36, 0.8)'
              : 'rgba(217, 119, 6, 0.4)',
            boxShadow: multiplayerMode
              ? currentPlayerTurn === 1
                ? '0 0 25px rgba(56, 189, 248, 0.35)'
                : '0 0 25px rgba(251, 191, 36, 0.35)'
              : '0 12px 35px rgba(0,0,0,0.5)',
          }}
        >
          {/* SVG PUZZLE BOARD */}
          <div
            className="relative overflow-hidden rounded-xl bg-[#0f172a] shadow-inner"
            style={{
              width: '100%',
              maxWidth: `${BOARD_WIDTH * zoomLevel}px`,
              aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`,
            }}
            onClick={handleBoardClick}
          >
            <svg
              ref={boardSvgRef}
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              className="w-full h-full cursor-crosshair block"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Puzzle Image Definition */}
                <pattern
                  id={`puzzleImg_${puzzleId}`}
                  patternUnits="userSpaceOnUse"
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                >
                  <image
                    href={imageSrc}
                    width={BOARD_WIDTH}
                    height={BOARD_HEIGHT}
                    preserveAspectRatio="none"
                  />
                </pattern>

                {/* Clip path for each piece */}
                {gridData.pieces.map((piece) => (
                  <clipPath key={`clip_${piece.id}`} id={`clip_${piece.id}`}>
                    <path d={piece.fullPath} />
                  </clipPath>
                ))}
              </defs>

              {/* 1. Ghost reference image (Pista de Fondo: opacidad controlada por el usuario) */}
              {ghostOpacity > 0 && (
                <image
                  href={imageSrc}
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                  preserveAspectRatio="none"
                  opacity={ghostOpacity}
                />
              )}

              {/* 2. Grid outline for unplaced pieces (Pista de Líneas de Corte: Encendida/Apagada) */}
              {showGridOutlines && (
                <g opacity="0.38">
                  {gridData.pieces.map((piece) => (
                    <path
                      key={`outline_${piece.id}`}
                      d={piece.fullPath}
                      fill={placedPieceIds.has(piece.id) ? 'none' : 'rgba(255,255,255,0.02)'}
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="1.2"
                      strokeDasharray={placedPieceIds.has(piece.id) ? 'none' : '3,3'}
                    />
                  ))}
                </g>
              )}

              {/* 3. Selected piece target indicator highlight */}
              {selectedPieceId && (
                (() => {
                  const p = gridData.pieces.find((x) => x.id === selectedPieceId);
                  if (p && !placedPieceIds.has(p.id)) {
                    return (
                      <path
                        d={p.fullPath}
                        fill="rgba(245, 158, 11, 0.18)"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        className="animate-pulse"
                      />
                    );
                  }
                  return null;
                })()
              )}

              {/* 4. Snapped Pieces rendered in place with classic embossed cut bevels */}
              {gridData.pieces.map((piece) => {
                const isPlaced = placedPieceIds.has(piece.id);
                if (!isPlaced) return null;

                const isRecentSnap = lastSnappedPieceId === piece.id;
                const owner = pieceOwners[piece.id];

                return (
                  <g key={`placed_${piece.id}`} className={isRecentSnap ? 'animate-bounce' : ''}>
                    {/* The clipped image */}
                    <path
                      d={piece.fullPath}
                      fill={`url(#puzzleImg_${puzzleId})`}
                    />

                    {/* Classic 3D cut line shadow */}
                    <path
                      d={piece.fullPath}
                      fill="none"
                      stroke="rgba(0, 0, 0, 0.65)"
                      strokeWidth="1.6"
                    />

                    {/* Classic 3D cut line light highlight */}
                    <path
                      d={piece.fullPath}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="0.8"
                    />

                    {/* Multiplayer owner indicator mark */}
                    {multiplayerMode && owner && (
                      <circle
                        cx={piece.x + piece.width / 2}
                        cy={piece.y + piece.height / 2}
                        r="6"
                        fill={owner === 1 ? '#38bdf8' : '#fbbf24'}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        opacity="0.85"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Board Zoom & Utility Controls Bar */}
        <div className="w-full flex items-center justify-between mt-2 px-1 text-xs text-amber-200/80">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))))}
              title="Reducir zoom"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-amber-200 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.3, Number((z + 0.1).toFixed(1))))}
              title="Aumentar zoom"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-amber-200 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMagicHint}
              disabled={unplacedPieces.length === 0}
              title="Pista: Coloca automáticamente 1 pieza en el tablero"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Colocar 1 Pieza</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT / BOTTOM: THE PIECE TRAY */}
      <div className="w-full lg:w-72 xl:w-80 flex flex-col rounded-2xl bg-black/40 border border-amber-500/20 p-2 sm:p-3 backdrop-blur-md">
        {/* Tray Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-amber-200 tracking-wide">
              Bandeja de Piezas
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
              {filteredTrayPieces.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {selectedPieceId ? 'Toca el tablero para colocar' : 'Arrastra o toca'}
          </span>
        </div>

        {/* Piece thumbnails grid */}
        <div className="w-full max-h-[220px] lg:max-h-[460px] overflow-y-auto overflow-x-hidden p-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 custom-scrollbar">
          {filteredTrayPieces.length === 0 ? (
            <div className="col-span-full py-8 flex flex-col items-center justify-center text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-amber-400/50 mb-2 animate-bounce" />
              <p className="text-xs">¡Todas las piezas de este filtro están colocadas!</p>
            </div>
          ) : (
            filteredTrayPieces.map((piece) => {
              const isSelected = selectedPieceId === piece.id;
              const previewSize = 74;

              return (
                <div
                  key={`tray_${piece.id}`}
                  onPointerDown={(e) => handleTrayPointerDown(piece, e)}
                  onClick={() => {
                    sound.playPick();
                    setSelectedPieceId(piece.id);
                  }}
                  className={`relative flex items-center justify-center p-1.5 rounded-xl transition-all cursor-grab active:cursor-grabbing hover:scale-105 ${
                    isSelected
                      ? 'bg-amber-500/30 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : 'bg-slate-900/70 border border-white/10 hover:border-amber-400/40 hover:bg-slate-800/80 shadow-md'
                  }`}
                  style={{ width: `${previewSize}px`, height: `${previewSize}px` }}
                >
                  <svg
                    viewBox={`${piece.bbox.minX} ${piece.bbox.minY} ${piece.bbox.width} ${piece.bbox.height}`}
                    className="w-full h-full pointer-events-none drop-shadow-md"
                  >
                    <path
                      d={piece.fullPath}
                      fill={`url(#puzzleImg_${puzzleId})`}
                      stroke="rgba(0,0,0,0.65)"
                      strokeWidth="1.5"
                    />
                    <path
                      d={piece.fullPath}
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="0.8"
                    />
                  </svg>

                  {piece.isCorner && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 shadow-sm" title="Esquina" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FLOATING DRAGGED PIECE PORTAL */}
      {draggedPiece && dragPos && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl transition-transform"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
            width: `${draggedPiece.width * zoomLevel * 1.08}px`,
            height: `${draggedPiece.height * zoomLevel * 1.08}px`,
          }}
        >
          <svg
            viewBox={`${draggedPiece.bbox.minX} ${draggedPiece.bbox.minY} ${draggedPiece.bbox.width} ${draggedPiece.bbox.height}`}
            className="w-full h-full"
          >
            <path
              d={draggedPiece.fullPath}
              fill={`url(#puzzleImg_${puzzleId})`}
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <path
              d={draggedPiece.fullPath}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
