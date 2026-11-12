import { sessionStore } from '../../../utils/browserSession';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  town: string;
  score: number;
  level: number;
  puzzleTitle: string;
  stars: number;
  timeSeconds: number;
  date: string;
}

export interface PuzzleResult {
  stars: number;
  bestTime: number;
  bestScore: number;
  moves: number;
  completedAt: string;
}

export interface PlayerStats {
  playerName: string;
  town: string;
  totalScore: number;
  coins: number;
  completedPuzzles: Record<string, PuzzleResult>;
  dailyCompletedDates: string[];
  multiplayerWins: {
    player1: number; // Guardián de Gredos
    player2: number; // Explorador del Tiétar
  };
}

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'lb_1',
    playerName: 'Mateo Gredos',
    town: 'Arenas de San Pedro',
    score: 18450,
    level: 5,
    puzzleTitle: 'Olimpo del Tiétar',
    stars: 3,
    timeSeconds: 142,
    date: 'Hoy',
  },
  {
    id: 'lb_2',
    playerName: 'Lucía Alardos',
    town: 'Candeleda',
    score: 16200,
    level: 5,
    puzzleTitle: 'Castillo de la Triste Condesa',
    stars: 3,
    timeSeconds: 165,
    date: 'Ayer',
  },
  {
    id: 'lb_3',
    playerName: 'Carlos Alburquerque',
    town: 'Mombeltrán',
    score: 14800,
    level: 4,
    puzzleTitle: 'Calzada Romana y Puerto del Pico',
    stars: 3,
    timeSeconds: 178,
    date: 'Hace 2 días',
  },
  {
    id: 'lb_4',
    playerName: 'Elena Galayos',
    town: 'Guisando',
    score: 12950,
    level: 4,
    puzzleTitle: 'Los Galayos y Circo de Gredos',
    stars: 3,
    timeSeconds: 189,
    date: 'Hace 3 días',
  },
  {
    id: 'lb_5',
    playerName: 'Javier del Valle',
    town: 'Cuevas del Valle',
    score: 11200,
    level: 3,
    puzzleTitle: 'Cuevas del Águila',
    stars: 3,
    timeSeconds: 135,
    date: 'Hace 4 días',
  },
  {
    id: 'lb_6',
    playerName: 'Sara Castañar',
    town: 'El Tiemblo',
    score: 9800,
    level: 3,
    puzzleTitle: 'Pinceladas del Tiétar',
    stars: 2,
    timeSeconds: 140,
    date: 'Hace 5 días',
  },
  {
    id: 'lb_7',
    playerName: 'Adrián Ribera',
    town: 'Sotillo de la Adrada',
    score: 8400,
    level: 2,
    puzzleTitle: 'Castillo de los Duques',
    stars: 3,
    timeSeconds: 110,
    date: 'Hace 6 días',
  },
  {
    id: 'lb_8',
    playerName: 'Carmen Pedroso',
    town: 'Pedro Bernardo',
    score: 6900,
    level: 2,
    puzzleTitle: 'Garganta y Puente',
    stars: 2,
    timeSeconds: 125,
    date: 'Hace 1 semana',
  },
];

const DEFAULT_STATS: PlayerStats = {
  playerName: 'Explorador del Valle',
  town: 'Arenas de San Pedro',
  totalScore: 0,
  coins: 450,
  completedPuzzles: {},
  dailyCompletedDates: [],
  multiplayerWins: {
    player1: 0,
    player2: 0,
  },
};

const STATS_KEY = 'valletietar_player_stats_v2';
const LEADERBOARD_KEY = 'valletietar_leaderboard_v2';

export function getPlayerStats(): PlayerStats {
  // Copia profunda de los valores por defecto: `recordPuzzleCompletion`
  // modifica el objeto devuelto y no debe contaminar la plantilla compartida.
  const emptyStats = (): PlayerStats => ({
    ...DEFAULT_STATS,
    completedPuzzles: {},
    dailyCompletedDates: [],
    multiplayerWins: { ...DEFAULT_STATS.multiplayerWins },
  });

  try {
    const raw = sessionStore.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw);
    return { ...emptyStats(), ...parsed };
  } catch {
    return emptyStats();
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    sessionStore.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Could not save player stats', err);
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = sessionStore.getItem(LEADERBOARD_KEY);
    if (!raw) return DEFAULT_LEADERBOARD;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_LEADERBOARD;
    return parsed.sort((a, b) => b.score - a.score);
  } catch {
    return DEFAULT_LEADERBOARD;
  }
}

export function addLeaderboardScore(entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry[] {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `lb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: 'Hoy',
  };

  const updated = [newEntry, ...current].sort((a, b) => b.score - a.score).slice(0, 30);
  try {
    sessionStore.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Could not save leaderboard', err);
  }
  return updated;
}

export function recordPuzzleCompletion(
  puzzleId: string,
  level: number,
  puzzleTitle: string,
  stars: number,
  timeSeconds: number,
  score: number,
  moves: number,
  coinsEarned: number
): { stats: PlayerStats; isNewHighScore: boolean; totalStars: number } {
  const stats = getPlayerStats();
  const existing = stats.completedPuzzles[puzzleId];

  const isNewHighScore = !existing || score > existing.bestScore;
  const bestScore = existing ? Math.max(existing.bestScore, score) : score;
  const bestTime = existing ? Math.min(existing.bestTime, timeSeconds) : timeSeconds;
  const bestStars = existing ? Math.max(existing.stars, stars) : stars;

  stats.completedPuzzles[puzzleId] = {
    stars: bestStars,
    bestTime,
    bestScore,
    moves,
    completedAt: new Date().toISOString(),
  };

  // Recalculate total score
  stats.totalScore = Object.values(stats.completedPuzzles).reduce((sum, p) => sum + p.bestScore, 0);
  stats.coins += coinsEarned;

  savePlayerStats(stats);

  // Add to leaderboard if it is a strong score
  if (score > 1000) {
    addLeaderboardScore({
      playerName: stats.playerName,
      town: stats.town,
      score,
      level,
      puzzleTitle,
      stars,
      timeSeconds,
    });
  }

  const totalStars = Object.values(stats.completedPuzzles).reduce((sum, p) => sum + p.stars, 0);
  return { stats, isNewHighScore, totalStars };
}

export function getTotalEarnedStars(stats: PlayerStats): number {
  return Object.values(stats.completedPuzzles).reduce((sum, p) => sum + p.stars, 0);
}

export function getMonthlyEmblem(coins: number): { emblem: 'ninguno' | 'bronce' | 'plata' | 'oro'; progress: number } {
  // Coin milestones from screenshot desafíos diarios: Bronce 2000, Plata 6000, Oro 12000
  if (coins >= 12000) return { emblem: 'oro', progress: 100 };
  if (coins >= 6000) return { emblem: 'plata', progress: Math.min(100, Math.round(((coins - 6000) / 6000) * 100)) };
  if (coins >= 2000) return { emblem: 'bronce', progress: Math.min(100, Math.round(((coins - 2000) / 4000) * 100)) };
  return { emblem: 'ninguno', progress: Math.min(100, Math.round((coins / 2000) * 100)) };
}
