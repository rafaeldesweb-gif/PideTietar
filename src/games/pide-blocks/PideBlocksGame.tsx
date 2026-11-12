/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TIETAR_LEVELS } from './game/tietarLevels';
import {
  GridCell,
  Piece,
  Particle,
  FloatingText,
  Mission,
  LevelConfig,
} from './game/types';
import {
  GRID_ROWS,
  GRID_COLS,
  generateProceduralRuins,
  generatePieceQueue,
  canPlacePiece,
  placePieceOnGrid,
  findCompletedLines,
  clearCompletedLines,
  applyGravity,
  canAnyPieceFit,
  rotatePiece,
} from './game/puzzleLogic';
import { sound } from './game/audio';
import { CanvasRenderer } from './game/canvasRenderer';
import { TietarBackground } from './components/TietarBackground';
import { GameHud } from './components/GameHud';
import { StoneBoardFrame } from './components/StoneBoardFrame';
import { PieceQueue } from './components/PieceQueue';
import { GravityDock } from './components/GravityDock';
import { MissionsModal } from './components/MissionsModal';
import { PauseMenuModal } from './components/PauseMenuModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GameOverModal } from './components/GameOverModal';
import { GameCelebration } from '../../components/GameCelebration';

export default function PideBlocksGame({
  onScoreSubmit,
}: {
  /** Callback al terminar un nivel o la partida, con (score, levelId). */
  onScoreSubmit?: (score: number, levelId: number) => void;
}) {
  // Level State
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const currentLevel = TIETAR_LEVELS[currentLevelIndex] || TIETAR_LEVELS[0];
  const [completedLevelIds, setCompletedLevelIds] = useState<number[]>([]);

  // Score, XP & Gems
  const [score, setScore] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [gemsCollectedInLevel, setGemsCollectedInLevel] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);

  // Gravity Charges
  const maxCharges = currentLevel.initialCharges + (completedLevelIds.includes(1) ? 1 : 0);
  const [charges, setCharges] = useState<number>(currentLevel.initialCharges);

  // Board & Pieces State
  const [grid, setGrid] = useState<GridCell[][]>(() =>
    generateProceduralRuins(currentLevel.startingRuinsDensity, currentLevel.startingGems)
  );
  const [pieceQueue, setPieceQueue] = useState<Piece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  // Hover & Drag State
  const [hoverPos, setHoverPos] = useState<{ r: number; c: number } | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);

  // Animation States
  const [activeCompletedRows, setActiveCompletedRows] = useState<number[]>([]);
  const [activeCompletedCols, setActiveCompletedCols] = useState<number[]>([]);
  const [isGravityAnimating, setIsGravityAnimating] = useState<boolean>(false);
  const [gravityProgress, setGravityProgress] = useState<number>(1);

  // Modals
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState<boolean>(false);
  const [isLevelCompleteOpen, setIsLevelCompleteOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  // Celebración al superar el quinto y último nivel de la campaña.
  const [celebrating, setCelebrating] = useState<boolean>(false);

  // Audio & Fullscreen
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Missions
  const [missions, setMissions] = useState<Mission[]>([]);

  // Canvas Refs & Particles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  // Initialize Missions for current level
  const initLevelMissions = useCallback((level: LevelConfig) => {
    const list: Mission[] = [
      {
        id: `m_gems_${level.id}`,
        title: 'Recolector de Gemas',
        description: `Consigue ${level.gemsNeeded} gemas prismáticas del ${level.location}.`,
        target: level.gemsNeeded,
        current: 0,
        completed: false,
        rewardXp: 150,
      },
      {
        id: `m_gravity_${level.id}`,
        title: 'Maestro de la Gravedad',
        description: 'Usa la carga de gravedad para desplazar al menos 4 bloques a la vez.',
        target: 1,
        current: 0,
        completed: false,
        rewardXp: 100,
      },
      {
        id: `m_combo_${level.id}`,
        title: 'Resonancia del Tiétar',
        description: 'Alcanza un multiplicador de combo de al menos 2x en este nivel.',
        target: 2,
        current: 1,
        completed: false,
        rewardXp: 120,
      },
    ];
    setMissions(list);
  }, []);

  // Initialize or Reset a Level
  const initLevel = useCallback(
    (levelIndex: number) => {
      const level = TIETAR_LEVELS[levelIndex];
      if (!level) return;

      const newGrid = generateProceduralRuins(level.startingRuinsDensity, level.startingGems);
      const queue = generatePieceQueue(newGrid, 0.4);

      setGrid(newGrid);
      setPieceQueue(queue);
      setSelectedPieceId(null);
      setGemsCollectedInLevel(0);
      setMultiplier(1);
      setActiveCompletedRows([]);
      setActiveCompletedCols([]);
      setIsGravityAnimating(false);
      setGravityProgress(1);
      setIsGameOverOpen(false);
      setIsLevelCompleteOpen(false);

      const levelMaxCharges = level.initialCharges + (completedLevelIds.includes(1) ? 1 : 0);
      setCharges(levelMaxCharges);

      initLevelMissions(level);
    },
    [completedLevelIds, initLevelMissions]
  );

  // Setup on mount and when level changes
  useEffect(() => {
    initLevel(currentLevelIndex);
  }, [currentLevelIndex, initLevel]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Update mission progress helper
  const updateMission = (type: 'gems' | 'gravity' | 'combo', val: number) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.completed) return m;

        let newCurrent = m.current;
        if (type === 'gems' && m.id.startsWith('m_gems')) {
          newCurrent = Math.min(m.target, val);
        } else if (type === 'gravity' && m.id.startsWith('m_gravity')) {
          if (val >= 4) newCurrent = 1;
        } else if (type === 'combo' && m.id.startsWith('m_combo')) {
          newCurrent = Math.max(m.current, val);
        }

        const isNowCompleted = newCurrent >= m.target;
        if (isNowCompleted && !m.completed) {
          setXp((x) => x + m.rewardXp);
        }

        return {
          ...m,
          current: newCurrent,
          completed: isNowCompleted,
        };
      })
    );
  };

  // Spawn visual particles
  const spawnLineClearParticles = (r: number, c: number, color: string, isGem: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = Math.floor(Math.min(canvas.clientWidth / GRID_COLS, canvas.clientHeight / GRID_ROWS));
    const ox = Math.floor((canvas.clientWidth - cellSize * GRID_COLS) / 2);
    const oy = Math.floor((canvas.clientHeight - cellSize * GRID_ROWS) / 2);

    const cx = ox + c * cellSize + cellSize / 2;
    const cy = oy + r * cellSize + cellSize / 2;

    const count = isGem ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 0.4 + 0.4,
        color: isGem
          ? ['#f472b6', '#38bdf8', '#c084fc', '#ffffff'][Math.floor(Math.random() * 4)]
          : color,
        size: isGem ? Math.random() * 4 + 2 : Math.random() * 3 + 1.5,
        isSparkle: true,
        shape: isGem ? 'diamond' : 'circle',
      });
    }
  };

  // Add floating text popup
  const addFloatingText = (text: string, x: number, y: number, color: string = '#38bdf8') => {
    floatingTextsRef.current.push({
      id: `text_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      opacity: 1,
    });
  };

  // Check game over condition
  const verifyQueuePlayability = (currentGrid: GridCell[][], queue: Piece[]) => {
    if (queue.length === 0) return;
    const canMove = canAnyPieceFit(currentGrid, queue);
    if (!canMove) {
      setTimeout(() => {
        setIsGameOverOpen(true);
        onScoreSubmit?.(score, currentLevel.id);
      }, 500);
    }
  };

  // Handle line clears and cascading gravity
  const processBoardMatches = (
    baseGrid: GridCell[][],
    isCascade: boolean = false
  ): Promise<GridCell[][]> => {
    return new Promise((resolve) => {
      const { rows, cols } = findCompletedLines(baseGrid);

      if (rows.length === 0 && cols.length === 0) {
        if (!isCascade) {
          setMultiplier(1);
        }
        resolve(baseGrid);
        return;
      }

      // Highlight the completed lines with neon yellow glow
      setActiveCompletedRows(rows);
      setActiveCompletedCols(cols);

      const totalLines = rows.length + cols.length;
      const newMult = isCascade ? multiplier + 1 : totalLines > 1 ? totalLines : 1;
      setMultiplier(newMult);
      updateMission('combo', newMult);

      sound.playLineClear(totalLines, newMult);

      // Brief pause to display the radiant neon line border (as seen in screenshot 1)
      setTimeout(() => {
        const { newGrid, clearedCells, gemsCollected } = clearCompletedLines(baseGrid, rows, cols);

        // Spawn particles for each cleared cell
        clearedCells.forEach((cell) => {
          spawnLineClearParticles(cell.r, cell.c, '#38bdf8', cell.hadGem);
        });

        // Gem collections
        if (gemsCollected > 0) {
          sound.playGemCollect();
          setGemsCollectedInLevel((prev) => {
            const updated = prev + gemsCollected;
            updateMission('gems', updated);

            // Check if level completed!
            if (updated >= currentLevel.gemsNeeded) {
              sound.playLevelUp();
              setTimeout(() => {
                setCompletedLevelIds((ids) =>
                  ids.includes(currentLevel.id) ? ids : [...ids, currentLevel.id]
                );
                setIsLevelCompleteOpen(true);
                if (currentLevelIndex === TIETAR_LEVELS.length - 1) {
                  setCelebrating(true);
                }
                onScoreSubmit?.(score, currentLevel.id);
              }, 400);
            }
            return updated;
          });
        }

        // Points calculation
        const basePoints = clearedCells.length * 15 + totalLines * 50;
        const gemBonus = gemsCollected * 100;
        const pointsEarned = (basePoints + gemBonus) * newMult;
        setScore((s) => s + pointsEarned);
        setXp((x) => x + Math.round(pointsEarned * 0.1));

        // Floating score popup in board center
        const canvas = canvasRef.current;
        if (canvas) {
          addFloatingText(
            `+${pointsEarned}${newMult > 1 ? ` (${newMult}x)` : ''}`,
            canvas.clientWidth / 2,
            canvas.clientHeight / 2 - 20,
            newMult > 1 ? '#facc15' : '#38bdf8'
          );
        }

        setActiveCompletedRows([]);
        setActiveCompletedCols([]);

        // Award bonus gravity charge if player cleared 2+ lines at once!
        if (totalLines >= 2) {
          setCharges((c) => Math.min(maxCharges, c + 1));
        }

        setGrid(newGrid);
        resolve(newGrid);
      }, 240);
    });
  };

  // Execute Gravity Charge ("Usar carga de gravedad")
  const handleUseGravity = () => {
    if (charges <= 0 || isGravityAnimating) return;

    sound.playGravityCharge();
    setCharges((c) => Math.max(0, c - 1));
    setIsGravityAnimating(true);
    setGravityProgress(0);

    const { newGrid, movedCount } = applyGravity(grid);
    updateMission('gravity', movedCount);

    // Screen shake / rumble effect
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transform = 'translateY(4px)';
      setTimeout(() => {
        if (canvas) canvas.style.transform = 'translateY(-2px)';
      }, 50);
      setTimeout(() => {
        if (canvas) canvas.style.transform = 'translateY(0px)';
      }, 100);
    }

    // Animate falling drop (280ms duration)
    const animStart = performance.now();
    const duration = 280;

    const animateFall = (now: number) => {
      const elapsed = now - animStart;
      const progress = Math.min(1, elapsed / duration);
      setGravityProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animateFall);
      } else {
        setGrid(newGrid);
        setIsGravityAnimating(false);

        // Process any cascading matches created by gravity collapse
        processBoardMatches(newGrid, true).then((finalGrid) => {
          verifyQueuePlayability(finalGrid, pieceQueue);
        });
      }
    };

    requestAnimationFrame(animateFall);
  };

  // Place a piece at (r, c)
  const handlePlacePiece = (piece: Piece, r: number, c: number) => {
    if (!canPlacePiece(grid, piece.shape, r, c)) return;

    sound.playPlace();

    const { newGrid } = placePieceOnGrid(grid, piece, r, c);
    setGrid(newGrid);
    setSelectedPieceId(null);
    setHoverPos(null);
    setDraggedPiece(null);

    // Remove piece from queue
    const remainingQueue = pieceQueue.filter((p) => p.id !== piece.id);

    // If queue is now empty, generate a fresh batch of 3 pieces
    let nextQueue = remainingQueue;
    if (remainingQueue.length === 0) {
      nextQueue = generatePieceQueue(newGrid, 0.38);
    }
    setPieceQueue(nextQueue);

    // Process line clears
    processBoardMatches(newGrid).then((updatedGrid) => {
      verifyQueuePlayability(updatedGrid, nextQueue);
    });
  };

  // Rotate a piece in queue
  const handleRotatePiece = (pieceId: string) => {
    sound.playRotate();
    setPieceQueue((prev) =>
      prev.map((p) => (p.id === pieceId ? rotatePiece(p) : p))
    );
  };

  // Handle cell click on canvas (Tap-to-place)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedPieceId) return;
    const selected = pieceQueue.find((p) => p.id === selectedPieceId);
    if (!selected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellSize = Math.floor(Math.min(canvas.clientWidth / GRID_COLS, canvas.clientHeight / GRID_ROWS));
    const ox = Math.floor((canvas.clientWidth - cellSize * GRID_COLS) / 2);
    const oy = Math.floor((canvas.clientHeight - cellSize * GRID_ROWS) / 2);

    const c = Math.floor((x - ox) / cellSize);
    const r = Math.floor((y - oy) / cellSize);

    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
      handlePlacePiece(selected, r, c);
    }
  };

  // Track hover coordinate on canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const activePiece = draggedPiece || pieceQueue.find((p) => p.id === selectedPieceId);
    if (!activePiece) {
      if (hoverPos !== null) setHoverPos(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellSize = Math.floor(Math.min(canvas.clientWidth / GRID_COLS, canvas.clientHeight / GRID_ROWS));
    const ox = Math.floor((canvas.clientWidth - cellSize * GRID_COLS) / 2);
    const oy = Math.floor((canvas.clientHeight - cellSize * GRID_ROWS) / 2);

    const c = Math.floor((x - ox) / cellSize);
    const r = Math.floor((y - oy) / cellSize);

    if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
      setHoverPos({ r, c });
    } else {
      setHoverPos(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    if (!draggedPiece) {
      setHoverPos(null);
    }
  };

  // Touch & Drag Handling for Mobile & Tablet
  const handleTouchStart = (piece: Piece, e: React.TouchEvent | React.MouseEvent) => {
    sound.playClick();
    setSelectedPieceId(piece.id);
    setDraggedPiece(piece);

    // Haptic feedback if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleWindowTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!draggedPiece || !canvasRef.current) return;

      const touch = e.touches[0];
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Finger offset: position piece slightly above the fingertip so player can clearly see the placement target!
      const fingerOffsetY = 45;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top - fingerOffsetY;

      const cellSize = Math.floor(Math.min(canvas.clientWidth / GRID_COLS, canvas.clientHeight / GRID_ROWS));
      const ox = Math.floor((canvas.clientWidth - cellSize * GRID_COLS) / 2);
      const oy = Math.floor((canvas.clientHeight - cellSize * GRID_ROWS) / 2);

      const c = Math.floor((x - ox) / cellSize);
      const r = Math.floor((y - oy) / cellSize);

      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        setHoverPos({ r, c });
      } else {
        setHoverPos(null);
      }
    },
    [draggedPiece]
  );

  const handleWindowTouchEnd = useCallback(() => {
    if (draggedPiece && hoverPos) {
      handlePlacePiece(draggedPiece, hoverPos.r, hoverPos.c);
    }
    setDraggedPiece(null);
  }, [draggedPiece, hoverPos]);

  useEffect(() => {
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('mouseup', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('mouseup', handleWindowTouchEnd);
    };
  }, [handleWindowTouchMove, handleWindowTouchEnd]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleUseGravity();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedPieceId) {
          handleRotatePiece(selectedPieceId);
        } else if (pieceQueue.length > 0) {
          handleRotatePiece(pieceQueue[0].id);
        }
      } else if (e.key === '1' && pieceQueue[0]) {
        setSelectedPieceId(pieceQueue[0].id);
      } else if (e.key === '2' && pieceQueue[1]) {
        setSelectedPieceId(pieceQueue[1].id);
      } else if (e.key === '3' && pieceQueue[2]) {
        setSelectedPieceId(pieceQueue[2].id);
      } else if (e.key === 'Escape') {
        setIsMenuOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPieceId, pieceQueue, charges, isGravityAnimating]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Toggle audio
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Main 60fps Game Loop & Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }

    const handleResize = () => {
      if (!canvas || !rendererRef.current) return;
      const parent = canvas.parentElement;
      if (parent) {
        const size = Math.min(parent.clientWidth - 8, parent.clientHeight - 8, 480);
        rendererRef.current.resize(size, size);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Frame rendering loop
    const renderLoop = (time: number) => {
      const dt = Math.min((time - startTimeRef.current) / 1000, 0.05);
      startTimeRef.current = time;

      // Update particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= dt;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle gravity
        return p.life > 0;
      });

      // Update floating texts
      floatingTextsRef.current = floatingTextsRef.current.filter((t) => {
        t.y -= 0.6;
        t.opacity -= dt * 1.5;
        return t.opacity > 0;
      });

      // Render board
      if (rendererRef.current) {
        const selected = pieceQueue.find((p) => p.id === selectedPieceId) || null;
        rendererRef.current.render({
          grid,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          hoverPos,
          selectedPiece: selected,
          activeCompletedRows,
          activeCompletedCols,
          particles: particlesRef.current,
          floatingTexts: floatingTextsRef.current,
          gravityProgress,
          gameTime: time / 1000,
        });
      }

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [
    grid,
    hoverPos,
    selectedPieceId,
    pieceQueue,
    activeCompletedRows,
    activeCompletedCols,
    gravityProgress,
  ]);

  const gemsRemaining = currentLevel.gemsNeeded - gemsCollectedInLevel;
  const missionsCompletedCount = missions.filter((m) => m.completed).length;

  return (
    <div className="blocks-game relative w-full h-full overflow-hidden flex flex-col justify-between select-none">
      {/* Stylized Valle del Tiétar Scenery Backdrop */}
      <TietarBackground currentLevel={currentLevel} />

      {/* Top HUD: Level, XP, Objective Banner, Multiplier, Score, Menu */}
      <GameHud
        currentLevel={currentLevel}
        gemsRemaining={gemsRemaining}
        score={score}
        multiplier={multiplier}
        xp={xp}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {/* Centerpiece: Stone Board Frame housing 8x8 Canvas and Piece Queue */}
      <main className="relative flex-1 flex items-center justify-center p-1 sm:p-2 z-10 min-h-0">
        <StoneBoardFrame
          sidecar={
            <PieceQueue
              queue={pieceQueue}
              selectedPieceId={selectedPieceId}
              onSelectPiece={(piece) => {
                sound.playClick();
                setSelectedPieceId((prev) => (prev === piece.id ? null : piece.id));
              }}
              onRotatePiece={handleRotatePiece}
              onDragStartPiece={handleTouchStart}
            />
          }
        >
          <div className="relative w-full aspect-square max-w-[460px] max-h-[460px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-full rounded-lg cursor-pointer touch-none"
            />
          </div>
        </StoneBoardFrame>
      </main>

      {/* Bottom Dock: "Usar carga de gravedad" and "Misiones" */}
      <GravityDock
        charges={charges}
        maxCharges={maxCharges}
        onUseGravity={handleUseGravity}
        onOpenMissions={() => setIsMissionsOpen(true)}
        missionsCompletedCount={missionsCompletedCount}
        totalMissionsCount={missions.length || 3}
        isGravityAnimating={isGravityAnimating}
      />

      {/* Missions & Unlocks Modal */}
      <MissionsModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        currentLevel={currentLevel}
        completedLevelIds={completedLevelIds}
        missions={missions}
        xp={xp}
      />

      {/* Pause & Settings Menu Modal */}
      <PauseMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onRestartLevel={() => initLevel(currentLevelIndex)}
        onSelectLevel={(lvlId) => {
          setCurrentLevelIndex(lvlId - 1);
        }}
        currentLevel={currentLevel}
        completedLevelIds={completedLevelIds}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Level Victory Modal */}
      <LevelCompleteModal
        isOpen={isLevelCompleteOpen}
        level={currentLevel}
        score={score}
        xpEarned={Math.round(score * 0.1) + 200}
        hasNextLevel={currentLevelIndex < TIETAR_LEVELS.length - 1}
        onNextLevel={() => {
          setCurrentLevelIndex((prev) => Math.min(TIETAR_LEVELS.length - 1, prev + 1));
          setIsLevelCompleteOpen(false);
        }}
        onReplayLevel={() => {
          initLevel(currentLevelIndex);
          setIsLevelCompleteOpen(false);
        }}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOverOpen}
        score={score}
        gemsCollected={gemsCollectedInLevel}
        currentLevel={currentLevel}
        charges={charges}
        onEmergencyGravity={() => {
          setIsGameOverOpen(false);
          handleUseGravity();
        }}
        onRestart={() => initLevel(currentLevelIndex)}
      />

      <GameCelebration
        open={celebrating}
        gameTitle="Blocks"
        gameColor="#38bdf8"
        onClose={() => setCelebrating(false)}
      />
    </div>
  );
}
