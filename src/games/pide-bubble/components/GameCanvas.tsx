import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bubble, BubbleColor, Particle, Projectile, TrajectoryPoint, LevelConfig, BUBBLE_COLOR_VALUES } from '../types/game';
import {
  BUBBLE_RADIUS,
  BUBBLE_THEMES,
  GRID_COLS,
  MAX_GRID_ROWS,
  calculateTrajectory,
  findClosestGridSlot,
  findFloatingBubbles,
  findMatchingCluster,
  findMortarRadiusBubbles,
  getBubbleCoordinates,
  getNeighbors,
} from '../utils/bubblePhysics';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  currentLevel: LevelConfig;
  score: number;
  onScoreAdd: (points: number) => void;
  onBubbleDropped: (count: number) => void;
  onBubblePopped: (count: number, combo?: number) => void;
  onMissShot?: () => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
  bubblesRemaining: number;
  setBubblesRemaining: React.Dispatch<React.SetStateAction<number>>;
  mortarCharged: boolean;
  onMortarUsed: () => void;
  isPaused: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  currentLevel,
  score: _score,
  onScoreAdd,
  onBubbleDropped,
  onBubblePopped,
  onMissShot,
  onLevelComplete,
  onGameOver,
  bubblesRemaining,
  setBubblesRemaining,
  mortarCharged,
  onMortarUsed,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game State Refs to maintain 60fps without React re-render lags
  const gridRef = useRef<(Bubble | null)[][]>([]);
  const currentBubbleRef = useRef<BubbleColor>('magenta');
  const nextBubbleRef = useRef<BubbleColor>('blue');
  const projectileRef = useRef<Projectile | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const droppingBubblesRef = useRef<Bubble[]>([]);
  const trajectoryRef = useRef<TrajectoryPoint[]>([]);
  const aimAngleRef = useRef<number>(-Math.PI / 2);
  const isAimingRef = useRef<boolean>(false);
  const ceilingOffsetRowsRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const comboMultiplierRef = useRef<number>(1);
  const isMortarActiveRef = useRef<boolean>(false);

  // Rule 2: For every 10 popped bubbles, 5 new bubbles spawn in diverse places
  const tenPopsAccumulatorRef = useRef<number>(0);

  // Rule 4: For every 6 of the same color popped, spawn a 3X special bubble of that same color!
  const colorPopCountersRef = useRef<Record<string, number>>({});

  // Freeze time duration remaining
  const freezeTimeRemainingRef = useRef<number>(0);

  // Guard to ensure level victory or defeat triggers ONCE and does not loop 60fps audio
  const isLevelFinishedRef = useRef<boolean>(false);

  // Mortar bubbles tracking: guarantee between 3 and 4 appear per level in launcher queue
  const targetMortarsInShooterRef = useRef<number>(3);
  const mortarsGivenInShooterRef = useRef<number>(0);

  // Progressive ceiling drop tracking - strictly paced by level's timer
  const timeUntilDropRef = useRef<number>(currentLevel.ceilingDropIntervalSec || 16);
  const lastTimeRef = useRef<number>(performance.now());

  // Local state for UI indicators
  const [, setFrameTick] = useState(0);

  // Helper to pick random regular color from current level's palette
  const getRandomColor = useCallback((): BubbleColor => {
    const colors = currentLevel.colors;
    return colors[Math.floor(Math.random() * colors.length)];
  }, [currentLevel.colors]);

  // Trigger Ceiling Drop strictly on timer
  const triggerCeilingDrop = useCallback(() => {
    ceilingOffsetRowsRef.current += 1;
    screenShakeRef.current = 1.8;
    soundManager.playCeilingDropAlarm();
    timeUntilDropRef.current = currentLevel.ceilingDropIntervalSec || 16;
  }, [currentLevel.ceilingDropIntervalSec]);

  // RULE 2: Por cada 10 burbujas explotadas salen 5 mas de diversos colores y en diversos lugares (alternativo)
  const spawnFiveBubblesInDiversePlaces = useCallback(
    (width: number, ceilingY: number, dangerLineY: number) => {
      const grid = gridRef.current;
      const candidateSlots: { row: number; col: number }[] = [];

      // Find unoccupied slots that are anchored to ceiling (row 0) or adjacent to existing bubbles
      for (let r = 0; r < MAX_GRID_ROWS - 2; r++) {
        const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < colsInRow; c++) {
          if (grid[r][c] === null) {
            let isAnchored = r === 0;
            if (!isAnchored) {
              const neighbors = getNeighbors(r, c, MAX_GRID_ROWS);
              for (const n of neighbors) {
                if (grid[n.row]?.[n.col]) {
                  isAnchored = true;
                  break;
                }
              }
            }
            if (isAnchored) {
              candidateSlots.push({ row: r, col: c });
            }
          }
        }
      }

      if (candidateSlots.length === 0) return;

      // Pick up to 5 slots spread across different positions
      const shuffledSlots = candidateSlots.sort(() => Math.random() - 0.5).slice(0, 5);
      const levelColors = [...currentLevel.colors].sort(() => Math.random() - 0.5);

      shuffledSlots.forEach((slot, idx) => {
        const chosenColor = levelColors[idx % levelColors.length] || getRandomColor();
        grid[slot.row][slot.col] = {
          id: `bubble-10pop-${Date.now()}-${slot.row}-${slot.col}-${Math.random()}`,
          row: slot.row,
          col: slot.col,
          color: chosenColor,
          x: 0,
          y: 0,
          radius: BUBBLE_RADIUS,
          scale: 1,
          opacity: 1,
        };

        const coords = getBubbleCoordinates(slot.row, slot.col, width, ceilingY, BUBBLE_RADIUS);
        particlesRef.current.push({
          x: coords.x,
          y: coords.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 14,
          color: BUBBLE_THEMES[chosenColor]?.glow || '#fff',
          alpha: 1,
          maxLife: 26,
          life: 0,
          type: 'ring',
        });
      });

      screenShakeRef.current = 1.3;
      soundManager.playBounce();

      // Floating notification tag
      particlesRef.current.push({
        x: width / 2,
        y: ceilingY + 45,
        vx: 0,
        vy: -1.0,
        size: 16,
        color: '#ffbe0b',
        alpha: 1,
        maxLife: 45,
        life: 0,
        type: 'score',
        text: '⚡ ¡+5 BURBUJAS (10 Explotadas)! ⚡',
      });

      // Check danger deadline
      for (let r = 0; r < grid.length; r++) {
        const cols = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < cols; c++) {
          const b = grid[r][c];
          if (b) {
            const coords = getBubbleCoordinates(r, c, width, ceilingY, BUBBLE_RADIUS);
            if (coords.y + BUBBLE_RADIUS >= dangerLineY) {
              if (!isLevelFinishedRef.current) {
                isLevelFinishedRef.current = true;
                screenShakeRef.current = 3.5;
                soundManager.playGameOver();
                onGameOver();
                return;
              }
            }
          }
        }
      }
    },
    [currentLevel.colors, getRandomColor, onGameOver]
  );

  // RULE 4: Por cada 6 del mismo color reventadas aparece una especial de ése mismo color (3X valor)
  const spawnColorSpecialBubble = useCallback(
    (color: BubbleColor, preferRow: number, preferCol: number, width: number, ceilingY: number) => {
      const grid = gridRef.current;
      let targetRow = preferRow;
      let targetCol = preferCol;

      let canPlace = false;
      if (
        targetRow >= 0 &&
        targetRow < MAX_GRID_ROWS &&
        targetCol >= 0 &&
        targetCol < (targetRow % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS) &&
        grid[targetRow][targetCol] === null
      ) {
        const neighbors = getNeighbors(targetRow, targetCol, MAX_GRID_ROWS);
        canPlace = targetRow === 0 || neighbors.some(n => grid[n.row]?.[n.col] !== null);
      }

      if (!canPlace) {
        let bestDist = Infinity;
        for (let r = 0; r < MAX_GRID_ROWS - 2; r++) {
          const cols = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
          for (let c = 0; c < cols; c++) {
            if (grid[r][c] === null) {
              const neighbors = getNeighbors(r, c, MAX_GRID_ROWS);
              const isAnchored = r === 0 || neighbors.some(n => grid[n.row]?.[n.col] !== null);
              if (isAnchored) {
                const dist = Math.hypot(r - preferRow, c - preferCol);
                if (dist < bestDist) {
                  bestDist = dist;
                  targetRow = r;
                  targetCol = c;
                }
              }
            }
          }
        }
      }

      if (targetRow >= 0 && targetRow < MAX_GRID_ROWS) {
        grid[targetRow][targetCol] = {
          id: `bubble-special-${color}-${Date.now()}-${Math.random()}`,
          row: targetRow,
          col: targetCol,
          color,
          x: 0,
          y: 0,
          radius: BUBBLE_RADIUS,
          scale: 1,
          opacity: 1,
          isColorSpecial: true,
          specialMultiplier: 3,
        };

        const coords = getBubbleCoordinates(targetRow, targetCol, width, ceilingY, BUBBLE_RADIUS);
        soundManager.playPop(3);

        for (let i = 0; i < 16; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 1.5 + Math.random() * 4;
          particlesRef.current.push({
            x: coords.x,
            y: coords.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 3.5,
            color: '#ffd700',
            alpha: 1,
            maxLife: 32,
            life: 0,
            sparkle: true,
            type: 'spark',
          });
        }

        particlesRef.current.push({
          x: coords.x,
          y: coords.y - 14,
          vx: 0,
          vy: -1.2,
          size: 16,
          color: '#ffd700',
          alpha: 1,
          maxLife: 45,
          life: 0,
          type: 'score',
          text: `★ ¡BURBUJA ESPECIAL ${color.toUpperCase()} 3X! ★`,
        });
      }
    },
    []
  );

  // Initialize Level Grid
  const initLevel = useCallback(() => {
    const initialGrid: (Bubble | null)[][] = Array.from({ length: MAX_GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );

    const colors = currentLevel.colors;

    // Guaranteed between 3 and 4 mortar bubbles per level in the grid
    const mortarCountToSpawn = 3 + (Math.random() < 0.5 ? 1 : 0);
    // Also guarantee 3 to 4 mortar bubbles appear in the launcher queue throughout the level
    targetMortarsInShooterRef.current = 3 + (Math.random() < 0.5 ? 1 : 0);
    mortarsGivenInShooterRef.current = 0;

    // Generate initial clustered layout
    for (let r = 0; r < currentLevel.initialRows; r++) {
      const cols = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        let chosenColor = colors[Math.floor(Math.random() * colors.length)];
        if (c > 0 && Math.random() < 0.45 && initialGrid[r][c - 1]) {
          chosenColor = initialGrid[r][c - 1]!.color;
        } else if (r > 0 && Math.random() < 0.35 && initialGrid[r - 1][c]) {
          chosenColor = initialGrid[r - 1][c]!.color;
        }

        // Special bubbles in starting grid (lightning, rainbow, freeze)
        const sp = Math.random();
        if (sp < 0.02) chosenColor = 'lightning';
        else if (sp < 0.04) chosenColor = 'rainbow';
        else if (sp < 0.06) chosenColor = 'freeze';

        initialGrid[r][c] = {
          id: `bubble-${r}-${c}-${Date.now()}-${Math.random()}`,
          row: r,
          col: c,
          color: chosenColor,
          x: 0,
          y: 0,
          radius: BUBBLE_RADIUS,
          scale: 1,
          opacity: 1,
        };
      }
    }

    // Place exactly 3 or 4 mortar bubbles across rows 1 to initialRows-1
    let spawnedMortars = 0;
    let attempts = 0;
    while (spawnedMortars < mortarCountToSpawn && attempts < 250) {
      attempts++;
      const r = 1 + Math.floor(Math.random() * Math.max(1, currentLevel.initialRows - 1));
      const maxC = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
      const c = Math.floor(Math.random() * maxC);
      if (initialGrid[r] && initialGrid[r][c] && initialGrid[r][c]!.color !== 'mortar') {
        initialGrid[r][c]!.color = 'mortar';
        spawnedMortars++;
      }
    }

    gridRef.current = initialGrid;
    currentBubbleRef.current = colors[Math.floor(Math.random() * colors.length)];
    nextBubbleRef.current = colors[Math.floor(Math.random() * colors.length)];
    projectileRef.current = null;
    particlesRef.current = [];
    droppingBubblesRef.current = [];
    ceilingOffsetRowsRef.current = 0;
    comboMultiplierRef.current = 1;
    isMortarActiveRef.current = false;
    isLevelFinishedRef.current = false;
    tenPopsAccumulatorRef.current = 0;
    colorPopCountersRef.current = {};
    freezeTimeRemainingRef.current = 0;
    timeUntilDropRef.current = currentLevel.ceilingDropIntervalSec || 16;
    lastTimeRef.current = performance.now();
  }, [currentLevel]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Activate Mortar
  useEffect(() => {
    if (mortarCharged) {
      currentBubbleRef.current = 'mortar';
      isMortarActiveRef.current = true;
      soundManager.playMortarCharge();
    }
  }, [mortarCharged]);

  // Swap current and next bubble
  const handleSwapBubble = useCallback(() => {
    if (projectileRef.current || isMortarActiveRef.current) return;
    const temp = currentBubbleRef.current;
    currentBubbleRef.current = nextBubbleRef.current;
    nextBubbleRef.current = temp;
    soundManager.playClick();
    setFrameTick(t => t + 1);
  }, []);

  // Shoot bubble
  const shootBubble = useCallback(() => {
    if (projectileRef.current || isPaused || bubblesRemaining <= 0 || isLevelFinishedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const speed = 19;
    const angle = aimAngleRef.current;
    const launcherX = canvas.width / (window.devicePixelRatio || 1) / 2;
    const launcherY = canvas.height / (window.devicePixelRatio || 1) - 65;

    projectileRef.current = {
      x: launcherX,
      y: launcherY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: currentBubbleRef.current,
      radius: BUBBLE_RADIUS,
      active: true,
      bounces: 0,
    };

    soundManager.playShoot();

    // Consume bubble
    setBubblesRemaining(prev => Math.max(0, prev - 1));

    // Next bubble advancement
    if (isMortarActiveRef.current) {
      isMortarActiveRef.current = false;
      onMortarUsed();
      currentBubbleRef.current = getRandomColor();
    } else {
      currentBubbleRef.current = nextBubbleRef.current;
      // Guarantee between 3 and 4 mortar bubbles appear in the launcher queue per level
      if (
        mortarsGivenInShooterRef.current < targetMortarsInShooterRef.current &&
        Math.random() < 0.18
      ) {
        nextBubbleRef.current = 'mortar';
        mortarsGivenInShooterRef.current++;
      } else {
        nextBubbleRef.current = getRandomColor();
      }
    }
  }, [bubblesRemaining, getRandomColor, isPaused, onMortarUsed, setBubblesRemaining]);

  // Handle pointer input
  const updateAim = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const launcherX = rect.width / 2;
    const launcherY = rect.height - 65;

    const dx = x - launcherX;
    const dy = y - launcherY;

    let angle = Math.atan2(dy, dx);
    const minAngle = -Math.PI + 0.18;
    const maxAngle = -0.18;

    if (angle > 0) {
      angle = dx < 0 ? minAngle : maxAngle;
    } else {
      angle = Math.max(minAngle, Math.min(maxAngle, angle));
    }

    aimAngleRef.current = angle;

    // Recalculate trajectory
    const ceilingY = ceilingOffsetRowsRef.current * (BUBBLE_RADIUS * 1.732);
    trajectoryRef.current = calculateTrajectory(
      launcherX,
      launcherY,
      angle,
      gridRef.current,
      rect.width,
      ceilingY,
      BUBBLE_RADIUS
    );
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPaused || projectileRef.current || bubblesRemaining <= 0 || isLevelFinishedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const launcherX = rect.width / 2;
    const launcherY = rect.height - 65;

    // Mobile-friendly: If user taps on or around the pedestal (launcher base & next bubble), swap bubbles!
    if (y > launcherY - 24 && Math.abs(x - launcherX) < 80) {
      handleSwapBubble();
      isAimingRef.current = false;
      return;
    }

    isAimingRef.current = true;
    updateAim(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isAimingRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const launcherY = rect.height - 65;

      // Mobile UX: Dragging finger back down near pedestal cancels aiming trajectory
      if (y > launcherY - 12) {
        trajectoryRef.current = [];
        return;
      }

      updateAim(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isAimingRef.current) {
      isAimingRef.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const launcherY = rect.height - 65;

      // Only shoot if finger released in the playfield (not dragged down to cancel)
      if (y <= launcherY - 12) {
        updateAim(e.clientX, e.clientY);
        shootBubble();
      } else {
        trajectoryRef.current = [];
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSwapBubble();
      } else if (e.code === 'ArrowLeft') {
        aimAngleRef.current = Math.max(-Math.PI + 0.18, aimAngleRef.current - 0.05);
      } else if (e.code === 'ArrowRight') {
        aimAngleRef.current = Math.min(-0.18, aimAngleRef.current + 0.05);
      } else if (e.code === 'Enter') {
        shootBubble();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwapBubble, shootBubble]);

  // Create Particle Explosions
  const spawnExplosion = (x: number, y: number, colorKey: BubbleColor, text?: string) => {
    const theme = BUBBLE_THEMES[colorKey] || BUBBLE_THEMES.magenta;
    const pCount = 20;

    // Expanding shockwave ring
    particlesRef.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 15,
      color: theme.glow,
      alpha: 1,
      maxLife: 22,
      life: 0,
      type: 'ring',
    });

    // Glowing spark particles
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        color: Math.random() > 0.4 ? theme.glow : '#ffffff',
        alpha: 1,
        maxLife: 24 + Math.random() * 12,
        life: 0,
        sparkle: Math.random() > 0.5,
        type: 'spark',
      });
    }

    // Floating score tag
    if (text) {
      particlesRef.current.push({
        x,
        y: y - 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -1.6,
        size: 16,
        color: '#ffea79',
        alpha: 1,
        maxLife: 38,
        life: 0,
        type: 'score',
        text,
      });
    }
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      // Delta time calculation
      const now = performance.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      // Freeze duration handling
      const isFrozen = freezeTimeRemainingRef.current > 0;
      if (isFrozen) {
        freezeTimeRemainingRef.current -= dt;
      } else if (!isPaused && !isLevelFinishedRef.current) {
        // Decrement timed ceiling descent only if not frozen
        timeUntilDropRef.current -= dt;
        if (timeUntilDropRef.current <= 0) {
          triggerCeilingDrop();
        }
      }

      // Apply screen shake
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current * 4;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current * 4;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.1);
      }

      // 1. CLEAR & BACKGROUND
      ctx.clearRect(0, 0, width, height);
      drawAtmosphericBackdrop(ctx, width, height);

      const ceilingY = ceilingOffsetRowsRef.current * (BUBBLE_RADIUS * 1.732);

      // 2. DRAW CEILING RAIL WITH COUNTDOWN
      drawCeilingRail(
        ctx,
        width,
        ceilingY,
        Math.max(0, timeUntilDropRef.current),
        isFrozen,
        Math.ceil(freezeTimeRemainingRef.current)
      );

      // 3. DRAW DANGER DEADLINE (If bubbles touch this, you lose!)
      const dangerLineY = height - 125;
      drawDangerLine(ctx, width, dangerLineY);

      // 4. DRAW AIMING TRAJECTORY
      if (!projectileRef.current && bubblesRemaining > 0 && !isPaused && !isLevelFinishedRef.current) {
        drawTrajectory(ctx, trajectoryRef.current, currentBubbleRef.current);
      }

      // 5. DRAW GRID BUBBLES
      const grid = gridRef.current;
      let activeBubbleCount = 0;
      let lowestBubbleY = 0;

      for (let r = 0; r < grid.length; r++) {
        const cols = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
        for (let c = 0; c < cols; c++) {
          const bubble = grid[r][c];
          if (bubble) {
            activeBubbleCount++;
            const { x, y } = getBubbleCoordinates(r, c, width, ceilingY, BUBBLE_RADIUS);
            bubble.x = x;
            bubble.y = y;
            if (y > lowestBubbleY) lowestBubbleY = y;

            // Danger warning aura if close to deadline
            const isDanger = y + BUBBLE_RADIUS >= dangerLineY - 32;
            drawBubble(ctx, bubble.x, bubble.y, bubble.radius, bubble.color, 1, 0, isDanger, bubble.isColorSpecial);
          }
        }
      }

      // Check Victory Condition (ONE-SHOT GUARD)
      if (
        !isLevelFinishedRef.current &&
        activeBubbleCount === 0 &&
        !projectileRef.current &&
        droppingBubblesRef.current.length === 0
      ) {
        isLevelFinishedRef.current = true;
        soundManager.playLevelWin();
        onLevelComplete();
      }

      // Check Game Over Condition 1: Bubbles crossed danger line
      if (!isLevelFinishedRef.current && lowestBubbleY > 0 && lowestBubbleY + BUBBLE_RADIUS >= dangerLineY) {
        isLevelFinishedRef.current = true;
        screenShakeRef.current = 3.0;
        soundManager.playGameOver();
        onGameOver();
      }

      // 6. UPDATE & DRAW PROJECTILE
      const proj = projectileRef.current;
      if (proj && proj.active) {
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Wall collisions
        const leftLimit = proj.radius;
        const rightLimit = width - proj.radius;

        if (proj.x <= leftLimit) {
          proj.x = leftLimit;
          proj.vx = -proj.vx;
          proj.bounces++;
          soundManager.playBounce();
        } else if (proj.x >= rightLimit) {
          proj.x = rightLimit;
          proj.vx = -proj.vx;
          proj.bounces++;
          soundManager.playBounce();
        }

        // Collision check with ceiling
        let landed = false;
        let impactRow = 0;
        let impactCol = 0;

        if (proj.y <= ceilingY + proj.radius) {
          landed = true;
          const slot = findClosestGridSlot(proj.x, ceilingY + proj.radius, grid, width, ceilingY);
          if (slot) {
            impactRow = slot.row;
            impactCol = slot.col;
          }
        }

        // Collision check with existing bubbles
        if (!landed) {
          for (let r = 0; r < grid.length; r++) {
            const cols = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
            for (let c = 0; c < cols; c++) {
              const b = grid[r][c];
              if (b) {
                const dist = Math.hypot(proj.x - b.x, proj.y - b.y);
                if (dist <= proj.radius * 1.85) {
                  landed = true;
                  const slot = findClosestGridSlot(proj.x, proj.y, grid, width, ceilingY);
                  if (slot) {
                    impactRow = slot.row;
                    impactCol = slot.col;
                  } else {
                    impactRow = Math.min(MAX_GRID_ROWS - 1, r + 1);
                    impactCol = c;
                  }
                  break;
                }
              }
            }
            if (landed) break;
          }
        }

        // Handle impact
        if (landed) {
          proj.active = false;
          projectileRef.current = null;

          if (proj.color === 'mortar') {
            // Mortar Explosion
            soundManager.playMortarExplosion();
            screenShakeRef.current = 2.5;

            const radiusAffected = findMortarRadiusBubbles(impactRow, impactCol, grid, 2);
            let mortarPoints = 0;
            const specialSpawnsInMortar: BubbleColor[] = [];

            radiusAffected.forEach(pos => {
              const b = grid[pos.row][pos.col];
              if (b) {
                const baseVal = BUBBLE_COLOR_VALUES[b.color] || 20;
                const isSpecial = b.isColorSpecial;
                const mult = isSpecial ? 3 : 1;
                const pts = baseVal * mult;
                mortarPoints += pts;

                // Track color pop counter for 6-pop special of same color
                colorPopCountersRef.current[b.color] = (colorPopCountersRef.current[b.color] || 0) + 1;
                if (colorPopCountersRef.current[b.color] >= 6) {
                  colorPopCountersRef.current[b.color] -= 6;
                  specialSpawnsInMortar.push(b.color);
                }

                const tag = isSpecial ? `+${pts} ★3X!` : `+${pts}`;
                spawnExplosion(b.x, b.y, b.color, tag);
                grid[pos.row][pos.col] = null;
              }
            });

            onBubblePopped(radiusAffected.length, 1);
            onScoreAdd(mortarPoints);

            // Spawn any 3X special bubbles earned
            specialSpawnsInMortar.forEach(color => {
              spawnColorSpecialBubble(color, impactRow, impactCol, width, ceilingY);
            });

            // RULE 2: Por cada 10 burbujas explotadas salen 5 mas de diversos colores y en diversos lugares
            tenPopsAccumulatorRef.current += radiusAffected.length;
            while (tenPopsAccumulatorRef.current >= 10) {
              tenPopsAccumulatorRef.current -= 10;
              spawnFiveBubblesInDiversePlaces(width, ceilingY, dangerLineY);
            }

            // Check floating drops after mortar
            checkAndDropFloatingBubbles(grid, width, ceilingY);
          } else {
            // Normal / Special Bubble Placement
            const newBubble: Bubble = {
              id: `bubble-${impactRow}-${impactCol}-${Date.now()}`,
              row: impactRow,
              col: impactCol,
              color: proj.color,
              x: proj.x,
              y: proj.y,
              radius: BUBBLE_RADIUS,
              scale: 1,
              opacity: 1,
            };

            grid[impactRow][impactCol] = newBubble;

            // Find matching cluster (supports rainbow wildcard)
            const cluster = findMatchingCluster(impactRow, impactCol, grid);

            if (cluster.length >= 3) {
              const combo = comboMultiplierRef.current;
              comboMultiplierRef.current += 1;
              soundManager.playPop(combo);
              screenShakeRef.current = 0.8;

              // Check if any special bubbles are inside the cluster!
              const toPopSet = new Set<string>();
              cluster.forEach(p => toPopSet.add(`${p.row},${p.col}`));

              cluster.forEach(p => {
                const b = grid[p.row][p.col];
                if (!b) return;

                if (b.color === 'lightning') {
                  // Lightning: wipes the whole row!
                  soundManager.playLightning();
                  screenShakeRef.current = 2.0;
                  const rowCols = p.row % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
                  for (let c = 0; c < rowCols; c++) {
                    if (grid[p.row][c]) {
                      toPopSet.add(`${p.row},${c}`);
                    }
                  }
                } else if (b.color === 'mortar') {
                  // Mortar inside cluster: blast radius 2!
                  soundManager.playMortarExplosion();
                  const bombAffected = findMortarRadiusBubbles(p.row, p.col, grid, 2);
                  bombAffected.forEach(bp => toPopSet.add(`${bp.row},${bp.col}`));
                } else if (b.color === 'freeze') {
                  // Freeze: freeze time +8 seconds!
                  freezeTimeRemainingRef.current += 8;
                  soundManager.playFreeze();
                  const freezeAffected = findMortarRadiusBubbles(p.row, p.col, grid, 1);
                  freezeAffected.forEach(fp => toPopSet.add(`${fp.row},${fp.col}`));
                  spawnExplosion(b.x, b.y, 'cyan', '❄ CONGELADO +8s');
                }
              });

              const allPoppedCoords: { row: number; col: number }[] = [];
              toPopSet.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                allPoppedCoords.push({ row: r, col: c });
              });

              // RULE 3: Las burbujas deben tener diferentes colores y valores que se suman al score
              // RULE 4: Por cada 6 del mismo color reventadas aparece una especial de ése mismo color (3X valor)
              let totalClusterPoints = 0;
              const colorSpecialSpawns: BubbleColor[] = [];
              let targetSpecialRow = impactRow;
              let targetSpecialCol = impactCol;

              allPoppedCoords.forEach(pos => {
                const b = grid[pos.row]?.[pos.col];
                if (!b) return;

                const baseVal = BUBBLE_COLOR_VALUES[b.color] || 15;
                const isSpecial = b.isColorSpecial;
                const mult = (isSpecial ? 3 : 1) * combo;
                const bubblePts = baseVal * mult;
                totalClusterPoints += bubblePts;

                // Track pops per color
                colorPopCountersRef.current[b.color] = (colorPopCountersRef.current[b.color] || 0) + 1;
                if (colorPopCountersRef.current[b.color] >= 6) {
                  colorPopCountersRef.current[b.color] -= 6;
                  colorSpecialSpawns.push(b.color);
                  targetSpecialRow = pos.row;
                  targetSpecialCol = pos.col;
                }
              });

              onScoreAdd(totalClusterPoints);
              onBubblePopped(allPoppedCoords.length, combo);

              allPoppedCoords.forEach((pos, idx) => {
                const b = grid[pos.row]?.[pos.col];
                if (b) {
                  const baseVal = BUBBLE_COLOR_VALUES[b.color] || 15;
                  const isSpecial = b.isColorSpecial;
                  const mult = (isSpecial ? 3 : 1) * combo;
                  const bubblePts = baseVal * mult;
                  const tag = isSpecial
                    ? `+${bubblePts} ★3X!`
                    : idx === 0
                    ? `+${totalClusterPoints}`
                    : `+${bubblePts}`;
                  spawnExplosion(b.x, b.y, b.color, tag);
                  grid[pos.row][pos.col] = null;
                }
              });

              // Spawn any 3X special bubbles earned from 6 of the same color
              colorSpecialSpawns.forEach(color => {
                spawnColorSpecialBubble(color, targetSpecialRow, targetSpecialCol, width, ceilingY);
              });

              // RULE 2: Por cada 10 burbujas explotadas salen 5 mas de diversos colores y en diversos lugares (alternativo)
              tenPopsAccumulatorRef.current += allPoppedCoords.length;
              while (tenPopsAccumulatorRef.current >= 10) {
                tenPopsAccumulatorRef.current -= 10;
                spawnFiveBubblesInDiversePlaces(width, ceilingY, dangerLineY);
              }

              // Check for orphaned floating bubbles that drop!
              checkAndDropFloatingBubbles(grid, width, ceilingY);
            } else {
              // Miss / No match: reset combo & decay mortar charge
              comboMultiplierRef.current = 1;
              onMissShot?.();

              // Check if out of bubbles
              if (bubblesRemaining <= 0) {
                setTimeout(() => {
                  if (activeBubbleCount > 0 && !isLevelFinishedRef.current) {
                    isLevelFinishedRef.current = true;
                    soundManager.playGameOver();
                    onGameOver();
                  }
                }, 600);
              }
            }
          }
        } else {
          // Draw flying projectile
          drawBubble(ctx, proj.x, proj.y, proj.radius, proj.color, 1.05, 0, false, proj.isColorSpecial);

          // Trail sparkles
          if (Math.random() < 0.6) {
            particlesRef.current.push({
              x: proj.x + (Math.random() - 0.5) * 8,
              y: proj.y + (Math.random() - 0.5) * 8,
              vx: -proj.vx * 0.15 + (Math.random() - 0.5) * 1.5,
              vy: -proj.vy * 0.15 + (Math.random() - 0.5) * 1.5,
              size: 2.2,
              color: BUBBLE_THEMES[proj.color]?.glow || '#fff',
              alpha: 0.85,
              maxLife: 15,
              life: 0,
              type: 'spark',
            });
          }
        }
      }

      // 7. UPDATE & DRAW DROPPING ORPHAN BUBBLES
      for (let i = droppingBubblesRef.current.length - 1; i >= 0; i--) {
        const b = droppingBubblesRef.current[i];
        b.vy = (b.vy || 0) + 0.45;
        b.x += b.vx || 0;
        b.y += b.vy;
        b.rotation = (b.rotation || 0) + (b.vRot || 0.05);

        drawBubble(ctx, b.x, b.y, b.radius, b.color, 0.95, b.rotation, false, b.isColorSpecial);

        if (b.y >= height - 20) {
          spawnExplosion(b.x, height - 20, b.color, '+50');
          droppingBubblesRef.current.splice(i, 1);
        }
      }

      // 8. UPDATE & DRAW PARTICLES & SCORE LABELS
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.type === 'ring') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + (p.life / p.maxLife) * 35, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * p.alpha;
          ctx.globalAlpha = p.alpha;
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (p.type === 'score' && p.text) {
          ctx.save();
          ctx.font = 'bold 18px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = p.color || '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.globalAlpha = p.alpha;
          ctx.fillText(p.text, p.x, p.y);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - (p.life / p.maxLife) * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.sparkle ? 8 : 4;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 9. DRAW BUBBLE LAUNCHER PEDESTAL
      const launcherX = width / 2;
      const launcherY = height - 65;
      drawLauncherPedestal(
        ctx,
        launcherX,
        launcherY,
        currentBubbleRef.current,
        nextBubbleRef.current,
        bubblesRemaining
      );

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    bubblesRemaining,
    currentLevel.ceilingDropIntervalSec,
    isPaused,
    onBubblePopped,
    onGameOver,
    onLevelComplete,
    onMissShot,
    onScoreAdd,
    spawnColorSpecialBubble,
    spawnFiveBubblesInDiversePlaces,
    triggerCeilingDrop,
  ]);

  // Handle dropping unanchored bubbles
  const checkAndDropFloatingBubbles = (
    grid: (Bubble | null)[][],
    width: number,
    ceilingY: number
  ) => {
    const floating = findFloatingBubbles(grid);
    if (floating.length > 0) {
      soundManager.playDrop(floating.length);
      onBubbleDropped(floating.length);

      // RULE 3: Score based on color value
      let dropTotalPoints = 0;
      floating.forEach(pos => {
        const b = grid[pos.row][pos.col];
        if (b) {
          const baseVal = BUBBLE_COLOR_VALUES[b.color] || 15;
          const mult = b.isColorSpecial ? 3 : 1;
          dropTotalPoints += baseVal * mult * 2; // Dropping gives 2x color value
        }
      });
      onScoreAdd(dropTotalPoints);

      // Dropped bubbles also count towards RULE 2: 10-pops rule!
      tenPopsAccumulatorRef.current += floating.length;
      const dangerLineY = (canvasRef.current?.getBoundingClientRect().height || 560) - 125;
      while (tenPopsAccumulatorRef.current >= 10) {
        tenPopsAccumulatorRef.current -= 10;
        spawnFiveBubblesInDiversePlaces(width, ceilingY, dangerLineY);
      }

      floating.forEach(pos => {
        const b = grid[pos.row][pos.col];
        if (b) {
          const coords = getBubbleCoordinates(pos.row, pos.col, width, ceilingY, BUBBLE_RADIUS);
          droppingBubblesRef.current.push({
            ...b,
            x: coords.x,
            y: coords.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            vRot: (Math.random() - 0.5) * 0.1,
          });
          grid[pos.row][pos.col] = null;
        }
      });
    }
  };

  // -------------------------------------------------------------
  // BESPOKE CANVAS ART & RENDERING FUNCTIONS
  // -------------------------------------------------------------

  const drawAtmosphericBackdrop = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0a0520');
    skyGrad.addColorStop(0.5, '#190e3d');
    skyGrad.addColorStop(0.85, '#3b1248');
    skyGrad.addColorStop(1, '#5a1d52');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const glowGrad = ctx.createRadialGradient(width / 2, height * 0.7, 10, width / 2, height * 0.7, width * 0.7);
    glowGrad.addColorStop(0, 'rgba(255, 110, 80, 0.25)');
    glowGrad.addColorStop(0.6, 'rgba(180, 50, 140, 0.1)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    const pillarWidth = 44;
    drawPillar(ctx, 4, height, pillarWidth);
    drawPillar(ctx, width - pillarWidth - 4, height, pillarWidth);
  };

  const drawPillar = (ctx: CanvasRenderingContext2D, x: number, height: number, w: number) => {
    ctx.save();
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#221447');
    grad.addColorStop(0.35, '#422585');
    grad.addColorStop(0.7, '#2b1759');
    grad.addColorStop(1, '#180c38');

    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, w, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let lx = x + 8; lx < x + w - 4; lx += 9) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }

    ctx.fillStyle = '#5733a8';
    ctx.fillRect(x - 4, height - 140, w + 8, 14);
    ctx.fillRect(x - 2, height - 120, w + 4, 8);
    ctx.restore();
  };

  // Ceiling Gold Rail with Countdown Indicator & Freeze State
  const drawCeilingRail = (
    ctx: CanvasRenderingContext2D,
    width: number,
    ceilingY: number,
    secondsLeft: number,
    isFrozen: boolean,
    freezeSec: number
  ) => {
    const barHeight = 14;
    const isImminent = !isFrozen && secondsLeft <= 4;

    // Glowing bar gradient
    const grad = ctx.createLinearGradient(0, ceilingY, 0, ceilingY + barHeight);
    if (isFrozen) {
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(0.5, '#38bdf8');
      grad.addColorStop(1, '#0369a1');
    } else if (isImminent) {
      grad.addColorStop(0, '#ff77aa');
      grad.addColorStop(0.5, '#ff2a8d');
      grad.addColorStop(1, '#770035');
    } else {
      grad.addColorStop(0, '#fff4b8');
      grad.addColorStop(0.4, '#f59e0b');
      grad.addColorStop(1, '#92400e');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(20, ceilingY, width - 40, barHeight);

    // Diamond accents
    ctx.fillStyle = '#fffbeb';
    for (let x = 35; x < width - 35; x += 18) {
      ctx.beginPath();
      ctx.arc(x, ceilingY + barHeight / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Drop countdown warning badge
    const badgeW = isFrozen ? 160 : 144;
    const badgeH = 18;
    const badgeX = width / 2 - badgeW / 2;
    const badgeY = ceilingY + barHeight - 2;

    ctx.fillStyle = isFrozen
      ? 'rgba(3, 40, 70, 0.95)'
      : isImminent
      ? 'rgba(80, 0, 30, 0.95)'
      : 'rgba(20, 10, 45, 0.9)';
    ctx.strokeStyle = isFrozen ? '#38bdf8' : isImminent ? '#ff2a8d' : '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFrozen ? '#e0f2fe' : isImminent ? '#ffffff' : '#ffd700';
    ctx.font = 'bold 9.5px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isFrozen) {
      ctx.fillText(`❄ CONGELADO (${freezeSec}s) ❄`, width / 2, badgeY + badgeH / 2);
    } else {
      ctx.fillText(`▼ DESCENSO EN ${Math.ceil(secondsLeft)}s ▼`, width / 2, badgeY + badgeH / 2);
    }
  };

  // Laser Danger Deadline across the screen
  const drawDangerLine = (ctx: CanvasRenderingContext2D, width: number, dangerLineY: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 42, 100, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.shadowColor = '#ff2a64';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(35, dangerLineY);
    ctx.lineTo(width - 35, dangerLineY);
    ctx.stroke();

    const badgeW = 150;
    const badgeH = 18;
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(40, 10, 30, 0.9)';
    ctx.strokeStyle = '#ff2a64';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(width / 2 - badgeW / 2, dangerLineY - badgeH / 2, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff8cb4';
    ctx.font = 'bold 9px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ LÍNEA DE PELIGRO ⚠', width / 2, dangerLineY);
    ctx.restore();
  };

  // Dotted Aiming Trajectory
  const drawTrajectory = (
    ctx: CanvasRenderingContext2D,
    points: TrajectoryPoint[],
    colorKey: BubbleColor
  ) => {
    if (points.length < 2) return;

    const theme = BUBBLE_THEMES[colorKey] || BUBBLE_THEMES.magenta;

    ctx.save();
    points.forEach((pt, idx) => {
      if (idx === 0) return;
      const alpha = Math.max(0.2, 1 - (idx / points.length) * 0.7);
      const dotRadius = idx % 2 === 0 ? 3.5 : 2.5;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = alpha;
      ctx.fill();
    });
    ctx.restore();
  };

  // 3D Glass / Neon Marble Bubble Drawing with Special Symbols
  const drawBubble = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colorKey: BubbleColor,
    scale: number = 1,
    rotation: number = 0,
    isDanger: boolean = false,
    isColorSpecial: boolean = false
  ) => {
    const theme = BUBBLE_THEMES[colorKey] || BUBBLE_THEMES.magenta;
    const r = radius * scale;

    ctx.save();
    ctx.translate(x, y);
    if (rotation !== 0) ctx.rotate(rotation);

    // Warning pulsing red glow if close to danger line
    if (isDanger) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 30, 80, 0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff1e50';
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    // Outer Neon Glow
    ctx.shadowColor = isColorSpecial ? '#ffd700' : theme.glow;
    ctx.shadowBlur = isColorSpecial ? 15 : 10;
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Golden Corona for 3X Special Bubble
    if (isColorSpecial) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 3D Radial Core Gradient
    const coreGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.08, 0, 0, r);
    coreGrad.addColorStop(0, theme.highlight);
    coreGrad.addColorStop(0.2, theme.accent);
    coreGrad.addColorStop(0.65, theme.primary);
    coreGrad.addColorStop(0.95, theme.dark);
    coreGrad.addColorStop(1, '#050210');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner Swirl Texture & Special Emblems
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;

    if (colorKey === 'yellow' || colorKey === 'magenta' || colorKey === 'orange') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0.4, 2.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.1, r * 0.1, r * 0.35, 3.2, 5.8);
      ctx.stroke();
    } else if (colorKey === 'blue' || colorKey === 'green' || colorKey === 'lime' || colorKey === 'purple') {
      ctx.beginPath();
      ctx.arc(r * 0.15, r * 0.15, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fill();
      ctx.stroke();
    } else if (colorKey === 'cyan') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, 0);
      ctx.lineTo(r * 0.4, 0);
      ctx.moveTo(0, -r * 0.4);
      ctx.lineTo(0, r * 0.4);
      ctx.stroke();
    } else if (colorKey === 'red') {
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.1, r * 0.45, 0.2, 3.0);
      ctx.stroke();
    }
    ctx.restore();

    // Distinct Emblems for Special Bubbles
    if (colorKey === 'mortar') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else if (colorKey === 'lightning') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡', 0, 0);
    } else if (colorKey === 'rainbow') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff2a8d';
      ctx.shadowBlur = 10;
      ctx.fillText('★', 0, 0);
    } else if (colorKey === 'freeze') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillText('❄', 0, 0);
    }

    // Distinct Center Emblem for 3X Special Bubble
    if (isColorSpecial) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.font = '900 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ 3X', 0, 1);
      ctx.restore();
    }

    // Specular highlight
    const specGrad = ctx.createRadialGradient(-r * 0.38, -r * 0.42, 0, -r * 0.38, -r * 0.42, r * 0.5);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    specGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.4, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Rim light reflection
    ctx.beginPath();
    ctx.arc(0, 0, r - 1.2, 0.7, 2.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  };

  // Cylindrical Stone Launcher Pedestal
  const drawLauncherPedestal = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    currentCol: BubbleColor,
    nextCol: BubbleColor,
    bubblesCount: number
  ) => {
    ctx.save();

    const pedestalR = 72;

    const bodyGrad = ctx.createLinearGradient(x - pedestalR, y, x + pedestalR, y);
    bodyGrad.addColorStop(0, '#38226e');
    bodyGrad.addColorStop(0.35, '#5d38a8');
    bodyGrad.addColorStop(0.7, '#482a88');
    bodyGrad.addColorStop(1, '#291754');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + 25, pedestalR, pedestalR * 0.38, 0, 0, Math.PI);
    ctx.rect(x - pedestalR, y, pedestalR * 2, 32);
    ctx.fill();

    const topGrad = ctx.createRadialGradient(x, y - 8, 10, x, y, pedestalR);
    topGrad.addColorStop(0, '#7548ce');
    topGrad.addColorStop(0.8, '#523098');
    topGrad.addColorStop(1, '#3b2072');

    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, pedestalR, pedestalR * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8c5fe6';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#221144';
    ctx.beginPath();
    ctx.ellipse(x, y, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9969ff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Next bubble preview
    drawBubble(ctx, x - 34, y + 8, BUBBLE_RADIUS * 0.75, nextCol, 1, 0);

    // Decorative side jewel
    drawBubble(ctx, x + 34, y + 8, BUBBLE_RADIUS * 0.75, 'yellow', 1, 0);

    // Swap arrows indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⇄', x - 18, y + 10);

    // Current loaded bubble
    drawBubble(ctx, x, y - 14, BUBBLE_RADIUS * 1.15, currentCol, 1, 0);

    // Counter Badge
    const badgeW = 76;
    const badgeH = 28;
    const badgeY = y + 26;

    ctx.fillStyle = '#2b1464';
    ctx.strokeStyle = '#8550eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - badgeW / 2, badgeY, badgeW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${bubblesCount}`, x, badgeY + 14);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '9px "Outfit", sans-serif';
    ctx.fillText('Bubbles', x, badgeY + 23);

    ctx.restore();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden min-h-0 min-w-0 p-0.5 sm:p-1 select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-auto h-full max-h-full max-w-full aspect-[9/16] object-contain touch-none cursor-crosshair rounded-xl shadow-2xl border border-purple-900/40 select-none"
      />

      {/* Floating Quick Action: Swap Bubble (Tapping pedestal also swaps!) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSwapBubble();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        title="Cambiar burbuja (o toca el pedestal / presiona Espacio)"
        className="absolute bottom-1.5 sm:bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-purple-950/90 hover:bg-purple-900 text-purple-200 text-[11px] sm:text-xs font-semibold rounded-full border border-purple-500/50 transition-all flex items-center gap-1 sm:gap-1.5 shadow-lg backdrop-blur-md active:scale-95 z-10 cursor-pointer select-none touch-none"
      >
        <span className="text-xs sm:text-sm font-bold text-amber-300">⇄</span>
        <span>Alternar Burbuja</span>
      </button>
    </div>
  );
};
