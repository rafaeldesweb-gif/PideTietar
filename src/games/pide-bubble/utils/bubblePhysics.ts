import { Bubble, BubbleColor, TrajectoryPoint } from '../types/game';

export const BUBBLE_RADIUS = 20; // Nominal bubble radius (responsive canvas scales to this)
export const ROW_HEIGHT = Math.round(BUBBLE_RADIUS * Math.sqrt(3));
export const GRID_COLS = 10;
export const MAX_GRID_ROWS = 14;

// Color visual definition
export const BUBBLE_THEMES: Record<BubbleColor, {
  primary: string;
  glow: string;
  accent: string;
  highlight: string;
  dark: string;
  name: string;
}> = {
  magenta: {
    primary: '#e60067',
    glow: '#ff2a8d',
    accent: '#ff77b7',
    highlight: '#ffffff',
    dark: '#770035',
    name: 'Magenta Flame',
  },
  blue: {
    primary: '#0088ff',
    glow: '#00d0ff',
    accent: '#66e0ff',
    highlight: '#ffffff',
    dark: '#003a80',
    name: 'Cosmic Blue',
  },
  yellow: {
    primary: '#f59e0b',
    glow: '#ffcc00',
    accent: '#ffe666',
    highlight: '#ffffff',
    dark: '#854d0e',
    name: 'Solar Amber',
  },
  green: {
    primary: '#10b981',
    glow: '#34d399',
    accent: '#86efac',
    highlight: '#ffffff',
    dark: '#064e3b',
    name: 'Emerald Core',
  },
  purple: {
    primary: '#8b5cf6',
    glow: '#a855f7',
    accent: '#c084fc',
    highlight: '#ffffff',
    dark: '#4c1d95',
    name: 'Neon Violet',
  },
  orange: {
    primary: '#ff6a00',
    glow: '#ff8800',
    accent: '#ffb066',
    highlight: '#ffffff',
    dark: '#8a2c00',
    name: 'Blaze Orange',
  },
  cyan: {
    primary: '#00e5ff',
    glow: '#00ffff',
    accent: '#80f7ff',
    highlight: '#ffffff',
    dark: '#005b66',
    name: 'Neon Turquoise',
  },
  red: {
    primary: '#e50914',
    glow: '#ff1e27',
    accent: '#ff6b72',
    highlight: '#ffffff',
    dark: '#6b0005',
    name: 'Crimson Ruby',
  },
  lime: {
    primary: '#84cc16',
    glow: '#a3e635',
    accent: '#bef264',
    highlight: '#ffffff',
    dark: '#365314',
    name: 'Electric Lime',
  },
  mortar: {
    primary: '#ff3300',
    glow: '#ff6600',
    accent: '#ffcc00',
    highlight: '#ffffff',
    dark: '#4a0000',
    name: 'Super Mortero',
  },
  lightning: {
    primary: '#00e5ff',
    glow: '#80ffff',
    accent: '#ffffff',
    highlight: '#ffffff',
    dark: '#005577',
    name: 'Burbuja Rayo',
  },
  rainbow: {
    primary: '#ec4899',
    glow: '#f43f5e',
    accent: '#38bdf8',
    highlight: '#ffffff',
    dark: '#4338ca',
    name: 'Arcoíris Estrella',
  },
  freeze: {
    primary: '#38bdf8',
    glow: '#0ea5e9',
    accent: '#e0f2fe',
    highlight: '#ffffff',
    dark: '#0369a1',
    name: 'Burbuja Hielo',
  },
};

// Calculate pixel coordinates for a given row and col
export function getBubbleCoordinates(
  row: number,
  col: number,
  gridWidth: number,
  ceilingY: number = 0,
  radius: number = BUBBLE_RADIUS
): { x: number; y: number } {
  const isOdd = row % 2 !== 0;
  const colCount = isOdd ? GRID_COLS - 1 : GRID_COLS;
  const horizontalSpacing = 2 * radius;
  const totalRowWidth = (colCount - 1) * horizontalSpacing + 2 * radius;
  const startX = (gridWidth - totalRowWidth) / 2 + radius;
  const x = startX + col * horizontalSpacing + (isOdd ? radius : 0);
  const y = ceilingY + radius + row * (radius * 1.732);
  return { x, y };
}

// Find grid neighbors for hexagonal grid (6 neighbors)
export function getNeighbors(row: number, col: number, maxRows: number = MAX_GRID_ROWS): { row: number; col: number }[] {
  const neighbors: { row: number; col: number }[] = [];
  const isOdd = row % 2 !== 0;

  // Directions depending on whether row is odd or even
  const deltas = isOdd
    ? [
        { r: 0, c: -1 }, // Left
        { r: 0, c: 1 },  // Right
        { r: -1, c: 0 }, // Up-left
        { r: -1, c: 1 }, // Up-right
        { r: 1, c: 0 },  // Down-left
        { r: 1, c: 1 },  // Down-right
      ]
    : [
        { r: 0, c: -1 }, // Left
        { r: 0, c: 1 },  // Right
        { r: -1, c: -1 },// Up-left
        { r: -1, c: 0 }, // Up-right
        { r: 1, c: -1 }, // Down-left
        { r: 1, c: 0 },  // Down-right
      ];

  for (const d of deltas) {
    const nr = row + d.r;
    const nc = col + d.c;
    const maxCol = nr % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
    if (nr >= 0 && nr < maxRows && nc >= 0 && nc < maxCol) {
      neighbors.push({ row: nr, col: nc });
    }
  }

  return neighbors;
}

// Find closest empty grid slot for an impact position
export function findClosestGridSlot(
  impactX: number,
  impactY: number,
  grid: (Bubble | null)[][],
  gridWidth: number,
  ceilingY: number,
  radius: number = BUBBLE_RADIUS
): { row: number; col: number } | null {
  let closestDist = Infinity;
  let bestSlot: { row: number; col: number } | null = null;

  for (let r = 0; r < grid.length; r++) {
    const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
    for (let c = 0; c < colsInRow; c++) {
      if (grid[r][c] === null) {
        // Must be adjacent to an existing bubble OR row 0
        const neighbors = getNeighbors(r, c, grid.length);
        const hasAdjacent = r === 0 || neighbors.some(n => grid[n.row]?.[n.col] !== null);
        if (hasAdjacent) {
          const { x, y } = getBubbleCoordinates(r, c, gridWidth, ceilingY, radius);
          const dist = Math.hypot(impactX - x, impactY - y);
          if (dist < closestDist) {
            closestDist = dist;
            bestSlot = { row: r, col: c };
          }
        }
      }
    }
  }

  return bestSlot;
}

// Flood-fill BFS to find all connected matching bubbles
export function findMatchingCluster(
  startRow: number,
  startCol: number,
  grid: (Bubble | null)[][]
): { row: number; col: number }[] {
  const targetBubble = grid[startRow]?.[startCol];
  if (!targetBubble) return [];

  const targetColor = targetBubble.color;
  const cluster: { row: number; col: number }[] = [];
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];

  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    cluster.push(current);

    const neighbors = getNeighbors(current.row, current.col, grid.length);
    for (const n of neighbors) {
      const key = `${n.row},${n.col}`;
      if (!visited.has(key)) {
        const neighborBubble = grid[n.row]?.[n.col];
        if (neighborBubble) {
          // Rainbow wildcard matches any color
          const isMatch =
            targetColor === 'rainbow' ||
            neighborBubble.color === 'rainbow' ||
            neighborBubble.color === targetColor;

          if (isMatch) {
            visited.add(key);
            queue.push(n);
          }
        }
      }
    }
  }

  return cluster;
}

// Find all bubbles within a radius for mortar explosion
export function findMortarRadiusBubbles(
  centerRow: number,
  centerCol: number,
  grid: (Bubble | null)[][],
  radiusHops: number = 2
): { row: number; col: number }[] {
  const affected: { row: number; col: number }[] = [];
  const visited = new Set<string>();
  const queue: { row: number; col: number; depth: number }[] = [
    { row: centerRow, col: centerCol, depth: 0 }
  ];

  visited.add(`${centerRow},${centerCol}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (grid[current.row]?.[current.col] !== null) {
      affected.push({ row: current.row, col: current.col });
    }

    if (current.depth < radiusHops) {
      const neighbors = getNeighbors(current.row, current.col, grid.length);
      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ row: n.row, col: n.col, depth: current.depth + 1 });
        }
      }
    }
  }

  return affected;
}

// Detect bubbles disconnected from the ceiling (unanchored bubbles to drop)
export function findFloatingBubbles(grid: (Bubble | null)[][]): { row: number; col: number }[] {
  const connected = new Set<string>();
  const queue: { row: number; col: number }[] = [];

  // Anchor: Row 0 bubbles are connected to the ceiling
  for (let c = 0; c < GRID_COLS; c++) {
    if (grid[0]?.[c] !== null && grid[0]?.[c] !== undefined) {
      const key = `0,${c}`;
      connected.add(key);
      queue.push({ row: 0, col: c });
    }
  }

  // BFS from ceiling anchors
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = getNeighbors(current.row, current.col, grid.length);
    for (const n of neighbors) {
      const key = `${n.row},${n.col}`;
      if (!connected.has(key) && grid[n.row]?.[n.col] !== null && grid[n.row]?.[n.col] !== undefined) {
        connected.add(key);
        queue.push(n);
      }
    }
  }

  // Any non-empty bubble not in `connected` is floating!
  const floating: { row: number; col: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
    for (let c = 0; c < colsInRow; c++) {
      if (grid[r][c] !== null) {
        if (!connected.has(`${r},${c}`)) {
          floating.push({ row: r, col: c });
        }
      }
    }
  }

  return floating;
}

// Calculate the aiming trajectory including bounce off walls
export function calculateTrajectory(
  startX: number,
  startY: number,
  angleRad: number,
  grid: (Bubble | null)[][],
  canvasWidth: number,
  ceilingY: number,
  radius: number = BUBBLE_RADIUS,
  maxPoints: number = 40
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  let vx = Math.cos(angleRad);
  let vy = Math.sin(angleRad);

  const stepSize = 14;
  const leftBound = radius;
  const rightBound = canvasWidth - radius;

  // Flatten active bubbles for fast circle-distance collision
  const activeBubbles: { x: number; y: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
    for (let c = 0; c < colsInRow; c++) {
      if (grid[r][c] !== null) {
        const coords = getBubbleCoordinates(r, c, canvasWidth, ceilingY, radius);
        activeBubbles.push(coords);
      }
    }
  }

  for (let i = 0; i < maxPoints; i++) {
    currentX += vx * stepSize;
    currentY += vy * stepSize;

    // Check wall bounce
    if (currentX <= leftBound) {
      currentX = leftBound + (leftBound - currentX);
      vx = -vx;
    } else if (currentX >= rightBound) {
      currentX = rightBound - (currentX - rightBound);
      vx = -vx;
    }

    // Check ceiling hit
    if (currentY <= ceilingY + radius) {
      points.push({ x: currentX, y: ceilingY + radius });
      break;
    }

    // Check bubble collision
    let hit = false;
    for (const b of activeBubbles) {
      const dist = Math.hypot(currentX - b.x, currentY - b.y);
      if (dist <= radius * 1.85) {
        hit = true;
        break;
      }
    }

    points.push({ x: currentX, y: currentY });

    if (hit) {
      break;
    }
  }

  return points;
}
