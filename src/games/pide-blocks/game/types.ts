export type BlockColor = 'cyan' | 'mint' | 'teal' | 'azure';

export interface GridCell {
  filled: boolean;
  color?: BlockColor;
  hasGem?: boolean;
  gemCollected?: boolean;
  isClearing?: boolean;
  isFalling?: boolean;
  id?: string;
  fallDistance?: number;
}

export type PieceShape = number[][]; // 2D matrix (1s and 0s)

export interface Piece {
  id: string;
  shape: PieceShape;
  color: BlockColor;
  gemPosition?: { r: number; c: number }; // cell in shape holding a prismatic gem
}

export interface LevelConfig {
  id: number;
  name: string;
  location: string;
  subtitle: string;
  description: string;
  gemsNeeded: number;
  initialCharges: number;
  startingRuinsDensity: number; // 0 to 1
  startingGems: number;
  unlockName: string;
  unlockType: string;
  unlockDescription: string;
  unlockIcon: string;
  colorTheme: {
    primary: string;
    accent: string;
    glow: string;
    bgSky: string;
  };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isSparkle?: boolean;
  shape?: 'diamond' | 'circle' | 'square';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  rewardXp: number;
}
