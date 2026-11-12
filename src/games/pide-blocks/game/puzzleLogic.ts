import { GridCell, Piece, PieceShape, BlockColor } from './types';

export const GRID_ROWS = 8;
export const GRID_COLS = 8;

// All polyomino shapes inspired by classic gravity blocks & tetris
export const PIECE_TEMPLATES: { name: string; shape: PieceShape; weight: number }[] = [
  // 1-cell (dot with gem)
  { name: 'dot', shape: [[1]], weight: 2 },
  // 2-cells
  { name: 'domino_h', shape: [[1, 1]], weight: 8 },
  { name: 'domino_v', shape: [[1], [1]], weight: 8 },
  // 3-cells
  { name: 'trio_h', shape: [[1, 1, 1]], weight: 6 },
  { name: 'trio_v', shape: [[1], [1], [1]], weight: 6 },
  { name: 'corner_tl', shape: [[1, 1], [1, 0]], weight: 6 },
  { name: 'corner_tr', shape: [[1, 1], [0, 1]], weight: 6 },
  { name: 'corner_bl', shape: [[1, 0], [1, 1]], weight: 6 },
  { name: 'corner_br', shape: [[0, 1], [1, 1]], weight: 6 },
  // 4-cells (Tetrominoes)
  { name: 'square', shape: [[1, 1], [1, 1]], weight: 7 },
  { name: 'line_4h', shape: [[1, 1, 1, 1]], weight: 5 },
  { name: 'line_4v', shape: [[1], [1], [1], [1]], weight: 5 },
  { name: 't_up', shape: [[0, 1, 0], [1, 1, 1]], weight: 5 },
  { name: 't_down', shape: [[1, 1, 1], [0, 1, 0]], weight: 5 },
  { name: 'l_left', shape: [[1, 0], [1, 0], [1, 1]], weight: 5 },
  { name: 'l_right', shape: [[0, 1], [0, 1], [1, 1]], weight: 5 },
  { name: 's_shape', shape: [[0, 1, 1], [1, 1, 0]], weight: 4 },
  { name: 'z_shape', shape: [[1, 1, 0], [0, 1, 1]], weight: 4 },
  // 5-cells (special long bar as seen in reference screenshot 2!)
  { name: 'line_5h', shape: [[1, 1, 1, 1, 1]], weight: 3 },
  { name: 'step_shape', shape: [[1, 1, 0], [0, 1, 1]], weight: 4 },
];

export const COLOR_VARIANTS: BlockColor[] = ['cyan', 'mint', 'teal', 'azure'];

// Create an empty 8x8 grid
export function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({ filled: false });
    }
    grid.push(row);
  }
  return grid;
}

// Clone grid
export function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
    }))
  );
}

// Generate procedural starting ruins with embedded prismatic gems matching the screenshots
export function generateProceduralRuins(density: number, targetGems: number): GridCell[][] {
  const grid = createEmptyGrid();
  // Determine height of columns on bottom rows (rows 4 to 7)
  const colHeights = [
    Math.floor(Math.random() * 3) + 2,
    Math.floor(Math.random() * 4) + 1,
    Math.floor(Math.random() * 3) + 2,
    0, // occasional gap for tactical gravity puzzle
    Math.floor(Math.random() * 3) + 1,
    Math.floor(Math.random() * 4) + 2,
    Math.floor(Math.random() * 3) + 1,
    Math.floor(Math.random() * 3) + 2,
  ];

  let placedGems = 0;
  const gemPositions: { r: number; c: number }[] = [];

  for (let c = 0; c < GRID_COLS; c++) {
    const h = colHeights[c];
    for (let i = 0; i < h; i++) {
      const r = GRID_ROWS - 1 - i;
      if (r >= 0) {
        const color = COLOR_VARIANTS[Math.floor(Math.random() * COLOR_VARIANTS.length)];
        grid[r][c] = {
          filled: true,
          color,
          hasGem: false,
          id: `ruin_${r}_${c}`,
        };
      }
    }
  }

  // Find filled cells to place starting gems
  const filledCoords: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c].filled) {
        filledCoords.push({ r, c });
      }
    }
  }

  // Shuffle filled coords to disperse gems naturally
  filledCoords.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(targetGems, filledCoords.length); i++) {
    const { r, c } = filledCoords[i];
    grid[r][c].hasGem = true;
    placedGems++;
  }

  return grid;
}

// Rotate a 2D matrix clockwise
export function rotateMatrix(matrix: PieceShape): PieceShape {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: PieceShape = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

// Rotate a piece and update gem coordinate
export function rotatePiece(piece: Piece): Piece {
  const newShape = rotateMatrix(piece.shape);
  let newGemPos = undefined;
  if (piece.gemPosition) {
    const oldR = piece.gemPosition.r;
    const oldC = piece.gemPosition.c;
    const oldRows = piece.shape.length;
    newGemPos = {
      r: oldC,
      c: oldRows - 1 - oldR,
    };
  }
  return {
    ...piece,
    shape: newShape,
    gemPosition: newGemPos,
  };
}

// Check if a piece can be placed at a given top-left coordinate (r, c)
export function canPlacePiece(grid: GridCell[][], shape: PieceShape, r: number, c: number): boolean {
  const shapeRows = shape.length;
  const shapeCols = shape[0].length;

  for (let sr = 0; sr < shapeRows; sr++) {
    for (let sc = 0; sc < shapeCols; sc++) {
      if (shape[sr][sc] === 1) {
        const targetR = r + sr;
        const targetC = c + sc;

        // Check grid boundary
        if (targetR < 0 || targetR >= GRID_ROWS || targetC < 0 || targetC >= GRID_COLS) {
          return false;
        }

        // Check if cell is occupied
        if (grid[targetR][targetC].filled) {
          return false;
        }
      }
    }
  }

  return true;
}

// Check if piece can fit ANYWHERE on the board
export function canFitAnywhere(grid: GridCell[][], piece: Piece): boolean {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (canPlacePiece(grid, piece.shape, r, c)) {
        return true;
      }
    }
  }
  return false;
}

// Check if any piece in the queue can be placed
export function canAnyPieceFit(grid: GridCell[][], pieces: Piece[]): boolean {
  for (const p of pieces) {
    if (canFitAnywhere(grid, p)) {
      return true;
    }
    // Also check rotated versions
    let rot = rotatePiece(p);
    if (canFitAnywhere(grid, rot)) return true;
    rot = rotatePiece(rot);
    if (canFitAnywhere(grid, rot)) return true;
    rot = rotatePiece(rot);
    if (canFitAnywhere(grid, rot)) return true;
  }
  return false;
}

// Generate a random piece with balanced probabilities
export function generateRandomPiece(withGemProbability: number = 0.35): Piece {
  // Weighted selection
  const totalWeight = PIECE_TEMPLATES.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;
  let selected = PIECE_TEMPLATES[0];

  for (const item of PIECE_TEMPLATES) {
    if (randomVal <= item.weight) {
      selected = item;
      break;
    }
    randomVal -= item.weight;
  }

  const color = COLOR_VARIANTS[Math.floor(Math.random() * COLOR_VARIANTS.length)];
  let gemPos: { r: number; c: number } | undefined = undefined;

  // Chance to embed prismatic diamond crystal
  if (Math.random() < withGemProbability) {
    // Pick an active cell in the shape
    const activeCells: { r: number; c: number }[] = [];
    for (let r = 0; r < selected.shape.length; r++) {
      for (let c = 0; c < selected.shape[0].length; c++) {
        if (selected.shape[r][c] === 1) {
          activeCells.push({ r, c });
        }
      }
    }
    if (activeCells.length > 0) {
      gemPos = activeCells[Math.floor(Math.random() * activeCells.length)];
    }
  }

  return {
    id: `piece_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    shape: selected.shape,
    color,
    gemPosition: gemPos,
  };
}

// Generate queue of 3 playable pieces
export function generatePieceQueue(grid: GridCell[][], gemProb: number = 0.35): Piece[] {
  const queue: Piece[] = [];
  for (let i = 0; i < 3; i++) {
    let piece = generateRandomPiece(gemProb);
    // Anti-frustration: if this is the first piece and nothing fits, make it a smaller shape
    if (i === 0 && !canFitAnywhere(grid, piece)) {
      piece = {
        id: `piece_safe_${Date.now()}`,
        shape: [[1, 1]],
        color: COLOR_VARIANTS[Math.floor(Math.random() * COLOR_VARIANTS.length)],
        gemPosition: Math.random() < 0.5 ? { r: 0, c: 0 } : undefined,
      };
    }
    queue.push(piece);
  }
  return queue;
}

// Place piece onto grid
export function placePieceOnGrid(
  grid: GridCell[][],
  piece: Piece,
  r: number,
  c: number
): { newGrid: GridCell[][]; placedCoords: { r: number; c: number }[] } {
  const newGrid = cloneGrid(grid);
  const placedCoords: { r: number; c: number }[] = [];

  for (let sr = 0; sr < piece.shape.length; sr++) {
    for (let sc = 0; sc < piece.shape[0].length; sc++) {
      if (piece.shape[sr][sc] === 1) {
        const gr = r + sr;
        const gc = c + sc;
        const hasGem = !!(piece.gemPosition && piece.gemPosition.r === sr && piece.gemPosition.c === sc);

        newGrid[gr][gc] = {
          filled: true,
          color: piece.color,
          hasGem,
          id: `placed_${gr}_${gc}_${Date.now()}`,
        };
        placedCoords.push({ r: gr, c: gc });
      }
    }
  }

  return { newGrid, placedCoords };
}

// Find completed rows and columns
export function findCompletedLines(grid: GridCell[][]): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];

  // Check horizontal rows
  for (let r = 0; r < GRID_ROWS; r++) {
    let full = true;
    for (let c = 0; c < GRID_COLS; c++) {
      if (!grid[r][c].filled) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }

  // Check vertical columns
  for (let c = 0; c < GRID_COLS; c++) {
    let full = true;
    for (let r = 0; r < GRID_ROWS; r++) {
      if (!grid[r][c].filled) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }

  return { rows, cols };
}

// Clear completed lines and return stats (gems collected, score)
export function clearCompletedLines(
  grid: GridCell[][],
  completedRows: number[],
  completedCols: number[]
): {
  newGrid: GridCell[][];
  clearedCells: { r: number; c: number; hadGem: boolean; color: BlockColor }[];
  gemsCollected: number;
} {
  const newGrid = cloneGrid(grid);
  const clearedCells: { r: number; c: number; hadGem: boolean; color: BlockColor }[] = [];
  const clearedSet = new Set<string>();
  let gemsCollected = 0;

  // Clear rows
  for (const r of completedRows) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${r},${c}`;
      if (!clearedSet.has(key) && newGrid[r][c].filled) {
        clearedSet.add(key);
        const hadGem = !!newGrid[r][c].hasGem;
        if (hadGem) gemsCollected++;
        clearedCells.push({
          r,
          c,
          hadGem,
          color: newGrid[r][c].color || 'cyan',
        });
        newGrid[r][c] = { filled: false };
      }
    }
  }

  // Clear cols
  for (const c of completedCols) {
    for (let r = 0; r < GRID_ROWS; r++) {
      const key = `${r},${c}`;
      if (!clearedSet.has(key) && newGrid[r][c].filled) {
        clearedSet.add(key);
        const hadGem = !!newGrid[r][c].hasGem;
        if (hadGem) gemsCollected++;
        clearedCells.push({
          r,
          c,
          hadGem,
          color: newGrid[r][c].color || 'cyan',
        });
        newGrid[r][c] = { filled: false };
      }
    }
  }

  return { newGrid, clearedCells, gemsCollected };
}

// Apply Gravity: all unsupported blocks slide down into empty spaces column by column!
export function applyGravity(grid: GridCell[][]): {
  newGrid: GridCell[][];
  movedCount: number;
  fallOffsets: { r: number; c: number; fallDist: number }[];
} {
  const newGrid = cloneGrid(grid);
  const fallOffsets: { r: number; c: number; fallDist: number }[] = [];
  let movedCount = 0;

  for (let c = 0; c < GRID_COLS; c++) {
    // For each column, compact blocks down to the bottom
    let writeRow = GRID_ROWS - 1;
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (newGrid[r][c].filled) {
        if (writeRow !== r) {
          const fallDist = writeRow - r;
          fallOffsets.push({ r: writeRow, c, fallDist });
          newGrid[writeRow][c] = {
            ...newGrid[r][c],
            fallDistance: fallDist,
          };
          newGrid[r][c] = { filled: false };
          movedCount++;
        }
        writeRow--;
      }
    }
  }

  return { newGrid, movedCount, fallOffsets };
}
