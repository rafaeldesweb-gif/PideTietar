export interface PieceShape {
  id: string;
  row: number;
  col: number;
  isEdge: boolean;
  isCorner: boolean;
  // Tabs: +1 (outward knob), -1 (inward socket), 0 (flat outer border)
  tabs: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  // Bounds in full puzzle coordinate space
  x: number;
  y: number;
  width: number;
  height: number;
  // SVG path in full puzzle coordinates
  fullPath: string;
  // SVG path relative to piece's bounding box
  localPath: string;
  // Bounding box with tabs included
  bbox: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
}

export interface PuzzleGridData {
  rows: number;
  cols: number;
  puzzleWidth: number;
  puzzleHeight: number;
  pieces: PieceShape[];
}

/**
 * Deterministic pseudo-random number generator for consistent cuts
 */
function seededRandom(seed: number) {
  const s = Math.sin(seed++) * 10000;
  return s - Math.floor(s);
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

/**
 * Classic jigsaw edge curve generator with authentic neck, bulb, and shoulders
 */
function generateClassicJigsawEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tab: number,
  seedModifier: number,
  isFirst = false
): string {
  if (tab === 0) {
    return `${isFirst ? `M ${x1.toFixed(2)},${y1.toFixed(2)} ` : ''}L ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;

  // Normal pointing outward (CCW rotation in screen coordinates)
  const nx = uy;
  const ny = -ux;

  // Subtle organic variation in knob size for authentic classic puzzle feel
  const randVal = seededRandom(seedModifier);
  const depthScale = (0.21 + randVal * 0.03) * len * tab;
  const neckIndent = (0.04 + randVal * 0.01) * len * tab;

  // Coordinate helper along edge t (0 to 1) and normal offset n (0 to 1)
  const pt = (t: number, n: number) => {
    const px = x1 + ux * len * t + nx * depthScale * n;
    const py = y1 + uy * len * t + ny * depthScale * n;
    return `${px.toFixed(2)},${py.toFixed(2)}`;
  };

  // Authentic classic jigsaw Bézier spline
  let path = isFirst ? `M ${pt(0, 0)} ` : '';

  // 1. Straight shoulder to start of neck
  path += `L ${pt(0.35, 0)} `;

  // 2. Curve through narrow neck into bulb shoulder
  path += `C ${pt(0.36, -0.2)} ${pt(0.33, 0.45)} ${pt(0.39, 0.85)} `;

  // 3. Rounded circular bulb head
  path += `C ${pt(0.44, 1.08)} ${pt(0.56, 1.08)} ${pt(0.61, 0.85)} `;

  // 4. Return through narrow neck to right shoulder
  path += `C ${pt(0.67, 0.45)} ${pt(0.64, -0.2)} ${pt(0.65, 0)} `;

  // 5. Straight shoulder to end corner
  path += `L ${pt(1.0, 0)}`;

  return path;
}

export function generatePuzzleGrid(
  puzzleId: string,
  rows: number,
  cols: number,
  puzzleWidth = 640,
  puzzleHeight = 480
): PuzzleGridData {
  let seed = stringToSeed(puzzleId);
  const pieceW = puzzleWidth / cols;
  const pieceH = puzzleHeight / rows;

  // Determine internal horizontal edges: between (r, c) and (r, c+1)
  const hEdges: { tab: number; seed: number }[][] = [];
  for (let r = 0; r < rows; r++) {
    hEdges[r] = [];
    for (let c = 0; c < cols - 1; c++) {
      seed += 7;
      const tab = seededRandom(seed) > 0.5 ? 1 : -1;
      hEdges[r][c] = { tab, seed };
    }
  }

  // Determine internal vertical edges: between (r, c) and (r+1, c)
  const vEdges: { tab: number; seed: number }[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    vEdges[r] = [];
    for (let c = 0; c < cols; c++) {
      seed += 11;
      const tab = seededRandom(seed) > 0.5 ? 1 : -1;
      vEdges[r][c] = { tab, seed };
    }
  }

  const pieces: PieceShape[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const topInfo = r === 0 ? { tab: 0, seed: 0 } : { tab: -vEdges[r - 1][c].tab, seed: vEdges[r - 1][c].seed };
      const rightInfo = c === cols - 1 ? { tab: 0, seed: 0 } : hEdges[r][c];
      const bottomInfo = r === rows - 1 ? { tab: 0, seed: 0 } : vEdges[r][c];
      const leftInfo = c === 0 ? { tab: 0, seed: 0 } : { tab: -hEdges[r][c - 1].tab, seed: hEdges[r][c - 1].seed };

      const x = c * pieceW;
      const y = r * pieceH;

      const isCorner =
        (r === 0 && c === 0) ||
        (r === 0 && c === cols - 1) ||
        (r === rows - 1 && c === 0) ||
        (r === rows - 1 && c === cols - 1);
      const isEdge = isCorner || r === 0 || r === rows - 1 || c === 0 || c === cols - 1;

      // 4 corners of piece in puzzle coordinates
      const tl = { x, y };
      const tr = { x: x + pieceW, y };
      const br = { x: x + pieceW, y: y + pieceH };
      const bl = { x, y: y + pieceH };

      // Build full puzzle SVG path (clockwise)
      const topPath = generateClassicJigsawEdge(tl.x, tl.y, tr.x, tr.y, topInfo.tab, topInfo.seed, true);
      const rightPath = generateClassicJigsawEdge(tr.x, tr.y, br.x, br.y, rightInfo.tab, rightInfo.seed, false);
      const bottomPath = generateClassicJigsawEdge(br.x, br.y, bl.x, bl.y, bottomInfo.tab, bottomInfo.seed, false);
      const leftPath = generateClassicJigsawEdge(bl.x, bl.y, tl.x, tl.y, leftInfo.tab, leftInfo.seed, false);

      const fullPath = `${topPath} ${rightPath} ${bottomPath} ${leftPath} Z`;

      // Bounding box with tab padding (knob protrusion ~25% of piece dimension)
      const padX = pieceW * 0.26;
      const padY = pieceH * 0.26;
      const minX = Math.max(0, x - (leftInfo.tab > 0 ? padX : 0));
      const minY = Math.max(0, y - (topInfo.tab > 0 ? padY : 0));
      const maxX = Math.min(puzzleWidth, x + pieceW + (rightInfo.tab > 0 ? padX : 0));
      const maxY = Math.min(puzzleHeight, y + pieceH + (bottomInfo.tab > 0 ? padY : 0));

      // Local path relative to piece origin (0, 0)
      const localTop = generateClassicJigsawEdge(0, 0, pieceW, 0, topInfo.tab, topInfo.seed, true);
      const localRight = generateClassicJigsawEdge(pieceW, 0, pieceW, pieceH, rightInfo.tab, rightInfo.seed, false);
      const localBottom = generateClassicJigsawEdge(pieceW, pieceH, 0, pieceH, bottomInfo.tab, bottomInfo.seed, false);
      const localLeft = generateClassicJigsawEdge(0, pieceH, 0, 0, leftInfo.tab, leftInfo.seed, false);
      const localPath = `${localTop} ${localRight} ${localBottom} ${localLeft} Z`;

      pieces.push({
        id: `piece_${r}_${c}`,
        row: r,
        col: c,
        isEdge,
        isCorner,
        tabs: {
          top: topInfo.tab,
          right: rightInfo.tab,
          bottom: bottomInfo.tab,
          left: leftInfo.tab,
        },
        x,
        y,
        width: pieceW,
        height: pieceH,
        fullPath,
        localPath,
        bbox: {
          minX,
          minY,
          width: maxX - minX,
          height: maxY - minY,
        },
      });
    }
  }

  return {
    rows,
    cols,
    puzzleWidth,
    puzzleHeight,
    pieces,
  };
}
