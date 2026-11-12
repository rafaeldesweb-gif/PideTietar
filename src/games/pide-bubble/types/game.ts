export type BubbleColor = 'magenta' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'cyan' | 'red' | 'lime' | 'mortar' | 'lightning' | 'rainbow' | 'freeze';

export const BUBBLE_COLOR_VALUES: Record<BubbleColor, number> = {
  magenta: 10,
  blue: 15,
  yellow: 20,
  green: 25,
  purple: 30,
  orange: 35,
  cyan: 40,
  red: 50,
  lime: 60,
  mortar: 150,
  lightning: 120,
  rainbow: 100,
  freeze: 80,
};

export interface Bubble {
  id: string;
  row: number;
  col: number;
  color: BubbleColor;
  x: number;
  y: number;
  radius: number;
  // Dynamic visual states & special multipliers
  scale?: number;
  opacity?: number;
  isColorSpecial?: boolean; // Special version of this same color (from 6 pops of same color)
  specialMultiplier?: number; // 3x normal value when popped
  isPopping?: boolean;
  popProgress?: number;
  isDropping?: boolean;
  vx?: number;
  vy?: number;
  rotation?: number;
  vRot?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
  active: boolean;
  bounces: number;
  isColorSpecial?: boolean;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  sparkle?: boolean;
  type?: 'spark' | 'ring' | 'smoke' | 'score';
  text?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  icon: 'lightning' | 'bomb' | 'star';
  completed: boolean;
}

export interface RewardCoupon {
  id: string;
  code: string;
  discountText: string;
  title: string;
  levelRequired: number;
  unlocked: boolean;
  applied: boolean;
  description: string;
  iconName: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  colors: BubbleColor[];
  initialRows: number;
  totalBubbles: number;
  missesBeforeDrop: number;
  shotsBeforeDrop: number;
  ceilingDropIntervalSec: number;
  targetScore: number;
  mortarChargesNeeded: number;
  rewardCoupon: RewardCoupon;
  rewardXP: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score: number;
  level: number;
  orderFavorite: string;
  avatar: string;
  isUser?: boolean;
  date: string;
}

export interface DeliveryOrder {
  orderId: string;
  restaurant: string;
  items: string[];
  initialEtaMinutes: number;
  currentEtaMinutes: number;
  progressPercent: number; // 0 to 100
  status: 'Preparando' | 'Repartidor en camino' | '¡Cerca de tu puerta!';
  originalTotal: number;
  currentDiscount: number;
  finalTotal: number;
  appliedCouponCode: string | null;
}

export type GameScreen = 'TITLE' | 'PLAYING' | 'PAUSED' | 'LEVEL_COMPLETE' | 'GAME_OVER';
