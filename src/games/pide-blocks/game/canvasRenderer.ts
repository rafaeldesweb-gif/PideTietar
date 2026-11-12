import { GridCell, Piece, Particle, FloatingText, BlockColor } from './types';
import { GRID_ROWS, GRID_COLS } from './puzzleLogic';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for mobile battery & high FPS
  }

  public resize(width: number, height: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  // Draw the full game scene
  public render({
    grid,
    width,
    height,
    hoverPos,
    selectedPiece,
    activeCompletedRows,
    activeCompletedCols,
    particles,
    floatingTexts,
    gravityProgress, // 0 to 1 during gravity animation
    gameTime,
  }: {
    grid: GridCell[][];
    width: number;
    height: number;
    hoverPos: { r: number; c: number } | null;
    selectedPiece: Piece | null;
    activeCompletedRows: number[];
    activeCompletedCols: number[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    gravityProgress: number;
    gameTime: number;
  }) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // Calculate board positioning
    const cellSize = Math.floor(Math.min(width / GRID_COLS, height / GRID_ROWS));
    const boardW = cellSize * GRID_COLS;
    const boardH = cellSize * GRID_ROWS;
    const offsetX = Math.floor((width - boardW) / 2);
    const offsetY = Math.floor((height - boardH) / 2);

    // 1. Draw recessed grid background tiles with cracked slate look
    this.drawGridBackground(ctx, offsetX, offsetY, cellSize, gameTime);

    // 2. Draw placed blocks
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = grid[r][c];
        if (cell.filled) {
          const isRowClearing = activeCompletedRows.includes(r);
          const isColClearing = activeCompletedCols.includes(c);
          const isClearing = isRowClearing || isColClearing || !!cell.isClearing;

          // Compute y position with gravity fall animation if applicable
          let drawY = offsetY + r * cellSize;
          if (gravityProgress < 1 && cell.fallDistance && cell.fallDistance > 0) {
            const ease = 1 - Math.pow(1 - gravityProgress, 3); // easeOutCubic
            const currentDist = cell.fallDistance * (1 - ease);
            drawY -= currentDist * cellSize;
          }

          const drawX = offsetX + c * cellSize;

          this.drawBlock(
            ctx,
            drawX,
            drawY,
            cellSize,
            cell.color || 'cyan',
            cell.hasGem || false,
            isClearing,
            gameTime,
            r,
            c
          );
        }
      }
    }

    // 3. Highlight completed lines with radiant yellow/gold neon glow (matching reference screenshot 1)
    if (activeCompletedRows.length > 0 || activeCompletedCols.length > 0) {
      this.drawCompletedLinesGlow(
        ctx,
        offsetX,
        offsetY,
        cellSize,
        activeCompletedRows,
        activeCompletedCols,
        gameTime
      );
    }

    // 4. Draw ghost preview if hovering with a selected piece
    if (selectedPiece && hoverPos) {
      this.drawGhostPiece(ctx, offsetX, offsetY, cellSize, selectedPiece, hoverPos, grid, gameTime);
    }

    // 5. Draw particles
    this.drawParticles(ctx, particles);

    // 6. Draw floating score popups
    this.drawFloatingTexts(ctx, floatingTexts);
  }

  // Draw recessed grid background with subtle stone tile lines
  private drawGridBackground(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    cellSize: number,
    _gameTime: number
  ) {
    const totalW = cellSize * GRID_COLS;
    const totalH = cellSize * GRID_ROWS;

    // Dark slate recessed floor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(ox, oy, totalW, totalH);

    // Subtle inner shadow along edges
    const gradTop = ctx.createLinearGradient(ox, oy, ox, oy + 12);
    gradTop.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    gradTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(ox, oy, totalW, 12);

    // Grid lines and individual cell recesses
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
    ctx.lineWidth = 1;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = ox + c * cellSize;
        const y = oy + r * cellSize;

        // Alternate subtle shade for checkerboard stone texture
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);

        // Subtle tiny stone dot in cell center
        ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
        ctx.fillRect(x + cellSize / 2 - 1, y + cellSize / 2 - 1, 2, 2);
      }
    }
  }

  // Draw carved faceted stone block matching screenshot bevels and tribal engravings
  private drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: BlockColor,
    hasGem: boolean,
    isClearing: boolean,
    gameTime: number,
    row: number,
    col: number
  ) {
    const pad = 1.5;
    const bx = x + pad;
    const by = y + pad;
    const bsize = size - pad * 2;
    const cx = bx + bsize / 2;
    const cy = by + bsize / 2;
    const bevel = Math.max(4, Math.floor(bsize * 0.22));

    ctx.save();

    // If clearing, add pulsing neon scale & brightness
    if (isClearing) {
      const flash = (Math.sin(gameTime * 20) + 1) / 2;
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.95 - flash * 0.3;
    }

    // Color definitions based on color variant
    let baseColor = '#14b8a6'; // teal
    let lightFacet = '#5eead4';
    let midFacet = '#2dd4bf';
    let darkFacet = '#0f766e';
    let deepDarkFacet = '#134e4a';
    let glyphColor = 'rgba(19, 78, 74, 0.65)';

    if (color === 'cyan') {
      baseColor = '#06b6d4';
      lightFacet = '#67e8f9';
      midFacet = '#22d3ee';
      darkFacet = '#0891b2';
      deepDarkFacet = '#164e63';
      glyphColor = 'rgba(22, 78, 99, 0.7)';
    } else if (color === 'mint') {
      baseColor = '#10b981';
      lightFacet = '#6ee7b7';
      midFacet = '#34d399';
      darkFacet = '#059669';
      deepDarkFacet = '#064e3b';
      glyphColor = 'rgba(6, 78, 59, 0.7)';
    } else if (color === 'azure') {
      baseColor = '#0ea5e9';
      lightFacet = '#7dd3fc';
      midFacet = '#38bdf8';
      darkFacet = '#0284c7';
      deepDarkFacet = '#0c4a6e';
      glyphColor = 'rgba(12, 74, 110, 0.7)';
    }

    // Base fill
    ctx.fillStyle = baseColor;
    ctx.fillRect(bx, by, bsize, bsize);

    // 1. Top facet (brightest)
    ctx.fillStyle = lightFacet;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bsize, by);
    ctx.lineTo(bx + bsize - bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.closePath();
    ctx.fill();

    // 2. Left facet (medium-light)
    ctx.fillStyle = midFacet;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bevel, by + bevel);
    ctx.lineTo(bx + bevel, by + bsize - bevel);
    ctx.lineTo(bx, by + bsize);
    ctx.closePath();
    ctx.fill();

    // 3. Right facet (darker)
    ctx.fillStyle = darkFacet;
    ctx.beginPath();
    ctx.moveTo(bx + bsize, by);
    ctx.lineTo(bx + bsize, by + bsize);
    ctx.lineTo(bx + bsize - bevel, by + bsize - bevel);
    ctx.lineTo(bx + bsize - bevel, by + bevel);
    ctx.closePath();
    ctx.fill();

    // 4. Bottom facet (deepest dark)
    ctx.fillStyle = deepDarkFacet;
    ctx.beginPath();
    ctx.moveTo(bx, by + bsize);
    ctx.lineTo(bx + bevel, by + bsize - bevel);
    ctx.lineTo(bx + bsize - bevel, by + bsize - bevel);
    ctx.lineTo(bx + bsize, by + bsize);
    ctx.closePath();
    ctx.fill();

    // 5. Center plateau
    ctx.fillStyle = baseColor;
    ctx.fillRect(bx + bevel, by + bevel, bsize - bevel * 2, bsize - bevel * 2);

    // 6. Ancient carved line hieroglyphs (spiral / T / step / Vetón runes)
    ctx.strokeStyle = glyphColor;
    ctx.lineWidth = Math.max(1.5, Math.floor(bsize * 0.05));
    ctx.lineCap = 'round';
    ctx.beginPath();

    const patternIdx = (row * 3 + col * 5) % 4;
    const innerW = bsize - bevel * 2;
    const px = bx + bevel;
    const py = by + bevel;

    if (patternIdx === 0) {
      // Stepped vertical line with crossbars (⊏⊐)
      ctx.moveTo(cx, py + 2);
      ctx.lineTo(cx, py + innerW - 2);
      ctx.moveTo(cx - 3, py + innerW * 0.35);
      ctx.lineTo(cx + 3, py + innerW * 0.35);
      ctx.moveTo(cx - 3, py + innerW * 0.65);
      ctx.lineTo(cx + 3, py + innerW * 0.65);
    } else if (patternIdx === 1) {
      // Celtic rune corner / spiral notch
      ctx.moveTo(px + 3, py + innerW * 0.3);
      ctx.lineTo(px + innerW * 0.5, py + innerW * 0.3);
      ctx.lineTo(px + innerW * 0.5, py + innerW - 3);
    } else if (patternIdx === 2) {
      // Inverted T anchor (⊥)
      ctx.moveTo(cx, py + 3);
      ctx.lineTo(cx, py + innerW - 4);
      ctx.moveTo(px + 4, py + innerW - 4);
      ctx.lineTo(px + innerW - 4, py + innerW - 4);
    } else {
      // Pyramid step lines
      ctx.moveTo(px + 3, py + innerW * 0.5);
      ctx.lineTo(px + innerW - 3, py + innerW * 0.5);
      ctx.moveTo(cx, py + 2);
      ctx.lineTo(cx, py + innerW * 0.5);
    }
    ctx.stroke();

    // Outer subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bsize - 1, bsize - 1);

    // 7. If block holds a Prismatic Diamond Crystal, render it with high neon brilliance!
    if (hasGem) {
      this.drawPrismaticGem(ctx, cx, cy, bsize * 0.36, gameTime);
    }

    ctx.restore();
  }

  // Draw the iconic Prismatic Rainbow Diamond Crystal from reference screenshots
  private drawPrismaticGem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    gameTime: number
  ) {
    ctx.save();

    // Pulsing outer neon glow aura
    const pulse = Math.sin(gameTime * 4) * 0.15 + 0.85;
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.2);
    glowGrad.addColorStop(0, 'rgba(244, 114, 182, 0.7)'); // soft pink/magenta core
    glowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)'); // cyan halo
    glowGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.2 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Octahedral diamond geometry (8 triangular facets)
    const top = { x: cx, y: cy - radius * 1.15 };
    const bottom = { x: cx, y: cy + radius * 1.15 };
    const left = { x: cx - radius * 0.85, y: cy };
    const right = { x: cx + radius * 0.85, y: cy };
    const center = { x: cx, y: cy - radius * 0.1 };

    // Facet 1: Top-Left (Brilliant Ice Cyan)
    ctx.fillStyle = '#cffafe';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(center.x, center.y);
    ctx.closePath();
    ctx.fill();

    // Facet 2: Top-Right (Pure White Specular Shimmer)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(center.x, center.y);
    ctx.closePath();
    ctx.fill();

    // Facet 3: Bottom-Left (Electric Magenta/Violet)
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(center.x, center.y);
    ctx.closePath();
    ctx.fill();

    // Facet 4: Bottom-Right (Deep Lapis Purple / Blue)
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(center.x, center.y);
    ctx.closePath();
    ctx.fill();

    // Facet boundaries (delicate crystal facets)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();

    // Star sparkle on top-right vertex
    const sparkAngle = gameTime * 3;
    const sparkX = top.x + radius * 0.2;
    const sparkY = top.y + radius * 0.2;
    const sparkLen = radius * 0.55 * (0.8 + Math.sin(gameTime * 6) * 0.2);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // 4-pointed star
    ctx.moveTo(sparkX - sparkLen, sparkY);
    ctx.lineTo(sparkX + sparkLen, sparkY);
    ctx.moveTo(sparkX, sparkY - sparkLen);
    ctx.lineTo(sparkX, sparkY + sparkLen);
    ctx.stroke();

    ctx.restore();
  }

  // Draw glowing electric golden/yellow line clear borders (matching screenshot 1)
  private drawCompletedLinesGlow(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    cellSize: number,
    rows: number[],
    cols: number[],
    gameTime: number
  ) {
    ctx.save();
    const flash = (Math.sin(gameTime * 12) + 1) / 2;

    // Glowing rows
    for (const r of rows) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = ox + c * cellSize;
        const y = oy + r * cellSize;

        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12 + flash * 8;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.85 + flash * 0.15})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      }
    }

    // Glowing cols
    for (const c of cols) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const x = ox + c * cellSize;
        const y = oy + r * cellSize;

        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12 + flash * 8;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.85 + flash * 0.15})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      }
    }

    ctx.restore();
  }

  // Draw ghost preview for piece being hovered or dragged
  private drawGhostPiece(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    cellSize: number,
    piece: Piece,
    hoverPos: { r: number; c: number },
    grid: GridCell[][],
    gameTime: number
  ) {
    const shape = piece.shape;
    const canPlace = this.checkPlacement(grid, shape, hoverPos.r, hoverPos.c);

    ctx.save();
    const alpha = (Math.sin(gameTime * 8) + 1) * 0.1 + 0.55;

    for (let sr = 0; sr < shape.length; sr++) {
      for (let sc = 0; sc < shape[0].length; sc++) {
        if (shape[sr][sc] === 1) {
          const gr = hoverPos.r + sr;
          const gc = hoverPos.c + sc;

          if (gr >= 0 && gr < GRID_ROWS && gc >= 0 && gc < GRID_COLS) {
            const x = ox + gc * cellSize;
            const y = oy + gr * cellSize;

            if (canPlace) {
              ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
              ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            } else {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
              ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            }
          }
        }
      }
    }

    ctx.restore();
  }

  private checkPlacement(grid: GridCell[][], shape: number[][], r: number, c: number): boolean {
    for (let sr = 0; sr < shape.length; sr++) {
      for (let sc = 0; sc < shape[0].length; sc++) {
        if (shape[sr][sc] === 1) {
          const tr = r + sr;
          const tc = c + sc;
          if (tr < 0 || tr >= GRID_ROWS || tc < 0 || tc >= GRID_COLS) return false;
          if (grid[tr][tc].filled) return false;
        }
      }
    }
    return true;
  }

  // Draw particle system
  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    ctx.save();
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;

      if (p.isSparkle) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
      }

      if (p.shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Draw floating combo/points text
  private drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Outfit", sans-serif';

    for (const t of texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.opacity));
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}
