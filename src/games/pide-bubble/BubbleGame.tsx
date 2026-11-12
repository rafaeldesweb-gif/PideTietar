import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Bomb, Zap, Gift, X } from 'lucide-react';
import { TitleScreen } from './components/TitleScreen';
import { GameCanvas } from './components/GameCanvas';
import { HUDLeft } from './components/HUDLeft';
import { HUDRight } from './components/HUDRight';
import { OrderTrackerBar } from './components/OrderTrackerBar';
import { LeaderboardModal } from './components/LeaderboardModal';
import { RewardsModal } from './components/RewardsModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { GAME_LEVELS, INITIAL_LEADERBOARD, INITIAL_ORDER } from './data/levels';
import { DeliveryOrder, LeaderboardEntry, Mission, RewardCoupon } from './types/game';
import { soundManager } from './utils/audio';
import { useApp } from '../../context/AppContext';
import { sessionStore } from '../../utils/browserSession';
import { GameCelebration } from '../../components/GameCelebration';
import './bubble.css';

const STORAGE_KEYS = {
  HIGH_SCORE: 'neon_bubble_highscore_v2',
  MAX_LEVEL: 'neon_bubble_max_level_v2',
  USER_NAME: 'neon_bubble_username_v2',
  COUPONS: 'neon_bubble_coupons_v2',
};

interface BubbleGameProps {
  /** Callback al terminar un nivel o la partida, con (score, levelId). */
  onScoreSubmit?: (score: number, levelId: number) => void;
}

export default function BubbleGame({ onScoreSubmit }: BubbleGameProps) {
  const { currentUser } = useApp();

  // Screen state
  const [screen, setScreen] = useState<'TITLE' | 'PLAYING'>('TITLE');

  // Celebración al completar el quinto y último nivel.
  const [celebrating, setCelebrating] = useState<boolean>(false);

  // Level & Progression
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    const saved = sessionStore.getItem(STORAGE_KEYS.MAX_LEVEL);
    return saved ? Math.min(5, Math.max(1, parseInt(saved, 10))) : 1;
  });

  // Scoring
  const [score, setScore] = useState<number>(0);
  const [levelScore, setLevelScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = sessionStore.getItem(STORAGE_KEYS.HIGH_SCORE);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Gameplay Counters
  const currentLevel = GAME_LEVELS[currentLevelIndex] || GAME_LEVELS[0];
  const [bubblesRemaining, setBubblesRemaining] = useState<number>(currentLevel.totalBubbles);
  const [bubblesPoppedThisLevel, setBubblesPoppedThisLevel] = useState<number>(0);
  const [bubblesDroppedThisLevel, setBubblesDroppedThisLevel] = useState<number>(0);

  // Mortar Power-Up
  const [mortarPopsCount, setMortarPopsCount] = useState<number>(0);
  const [mortarCharged, setMortarCharged] = useState<boolean>(false);

  // Missions
  const [missions, setMissions] = useState<Mission[]>([
    {
      id: 'm-drop',
      title: 'Drop Bubbles',
      description: 'Haz caer burbujas huérfanas',
      current: 8,
      target: 30,
      icon: 'lightning',
      completed: false,
    },
    {
      id: 'm-levels',
      title: 'Clear Levels',
      description: 'Supera niveles de juego',
      current: 1,
      target: 5,
      icon: 'bomb',
      completed: false,
    },
  ]);

  // Delivery Order Tracking
  const [order, setOrder] = useState<DeliveryOrder>(INITIAL_ORDER);

  // Accumulated Coupons
  const [coupons, setCoupons] = useState<RewardCoupon[]>(() => {
    const saved = sessionStore.getItem(STORAGE_KEYS.COUPONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return GAME_LEVELS.map(lvl => lvl.rewardCoupon);
  });

  // Leaderboard
  const [userName, setUserName] = useState<string>(() => {
    return sessionStore.getItem(STORAGE_KEYS.USER_NAME) || currentUser?.name || 'Tú (Cliente)';
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);

  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAmbientMusicOn, setIsAmbientMusicOn] = useState<boolean>(false);

  // Modals
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState<boolean>(false);
  const [isLevelCompleteOpen, setIsLevelCompleteOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isPauseOpen, setIsPauseOpen] = useState<boolean>(false);
  const [isMissionsDrawerOpen, setIsMissionsDrawerOpen] = useState<boolean>(false);
  const [isColorGuideOpen, setIsColorGuideOpen] = useState<boolean>(false);

  // Save High Score & Level
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      sessionStore.setItem(STORAGE_KEYS.HIGH_SCORE, score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    sessionStore.setItem(STORAGE_KEYS.MAX_LEVEL, maxUnlockedLevel.toString());
  }, [maxUnlockedLevel]);

  useEffect(() => {
    sessionStore.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    sessionStore.setItem(STORAGE_KEYS.USER_NAME, userName);
  }, [userName]);

  // Simulate periodic order delivery progress
  useEffect(() => {
    const interval = setInterval(() => {
      setOrder(prev => {
        if (prev.currentEtaMinutes <= 1) {
          return {
            ...prev,
            currentEtaMinutes: 1,
            progressPercent: 95,
            status: '¡Cerca de tu puerta!',
          };
        }
        const nextEta = prev.currentEtaMinutes - 1;
        const nextPercent = Math.min(95, prev.progressPercent + 5);
        return {
          ...prev,
          currentEtaMinutes: nextEta,
          progressPercent: nextPercent,
        };
      });
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  // Sync user score in leaderboard
  useEffect(() => {
    setLeaderboard(prev =>
      prev.map(entry => {
        if (entry.isUser) {
          return {
            ...entry,
            name: userName,
            score: Math.max(entry.score, score),
            level: currentLevelIndex + 1,
          };
        }
        return entry;
      })
    );
  }, [score, userName, currentLevelIndex]);

  // Audio Toggle
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  }, [isMuted]);

  const handleToggleAmbientMusic = useCallback(() => {
    if (isAmbientMusicOn) {
      soundManager.stopAmbientNeonMusic();
      setIsAmbientMusicOn(false);
    } else {
      soundManager.startAmbientNeonMusic();
      setIsAmbientMusicOn(true);
    }
  }, [isAmbientMusicOn]);

  // Start / Change Level
  const startLevel = useCallback((lvlIndex: number) => {
    const cfg = GAME_LEVELS[lvlIndex] || GAME_LEVELS[0];
    setCurrentLevelIndex(lvlIndex);
    setBubblesRemaining(cfg.totalBubbles);
    setLevelScore(0);
    setBubblesPoppedThisLevel(0);
    setBubblesDroppedThisLevel(0);
    setMortarPopsCount(0);
    setMortarCharged(false);
    setIsLevelCompleteOpen(false);
    setIsGameOverOpen(false);
    setIsPauseOpen(false);
    setScreen('PLAYING');
  }, []);

  const handleStartGame = () => {
    startLevel(currentLevelIndex);
  };

  const handleNewGame = () => {
    setScore(0);
    startLevel(0);
  };

  // Score Addition
  const handleScoreAdd = useCallback((points: number) => {
    setScore(prev => prev + points);
    setLevelScore(prev => prev + points);
  }, []);

  // Bubble Popped Event
  const handleBubblePopped = useCallback((count: number, combo: number = 1) => {
    setBubblesPoppedThisLevel(prev => prev + count);

    // Charge mortar: requires more skill, combos give bonuses, and scales with mortarChargesNeeded
    setMortarPopsCount(prev => {
      const chargeGained = count + Math.max(0, (combo - 1) * 3);
      const next = prev + chargeGained;
      const target = currentLevel.mortarChargesNeeded;
      if (next >= target && !mortarCharged) {
        setMortarCharged(true);
      }
      return next;
    });

    // Update missions
    setMissions(prev =>
      prev.map(m => {
        if (m.id === 'm-drop') {
          const nextVal = Math.min(m.target, m.current + count);
          return { ...m, current: nextVal, completed: nextVal >= m.target };
        }
        return m;
      })
    );
  }, [currentLevel.mortarChargesNeeded, mortarCharged]);

  // Miss shot event: gentle penalty so player reliably earns between 3 and 4 mortars per level
  const handleMissShot = useCallback(() => {
    setMortarPopsCount(prev => Math.max(0, prev - 1));
  }, []);

  // Bubble Dropped Event
  const handleBubbleDropped = useCallback((count: number) => {
    setBubblesDroppedThisLevel(prev => prev + count);
    setMissions(prev =>
      prev.map(m => {
        if (m.id === 'm-drop') {
          const nextVal = Math.min(m.target, m.current + count);
          return { ...m, current: nextVal, completed: nextVal >= m.target };
        }
        return m;
      })
    );
  }, []);

  // Mortar Triggered
  const handleLaunchMortar = useCallback(() => {
    if (mortarCharged) {
      soundManager.playClick();
      // Canvas handles projectile firing
    }
  }, [mortarCharged]);

  const handleMortarUsed = useCallback(() => {
    setMortarCharged(false);
    setMortarPopsCount(0);
  }, []);

  // Level Complete Event
  const handleLevelComplete = useCallback(() => {
    const nextLvlNum = currentLevel.level + 1;
    if (nextLvlNum <= 5 && nextLvlNum > maxUnlockedLevel) {
      setMaxUnlockedLevel(nextLvlNum);
    }

    // Unlock reward coupon
    setCoupons(prev =>
      prev.map(c => {
        if (c.levelRequired === currentLevel.level) {
          return { ...c, unlocked: true };
        }
        return c;
      })
    );

    // Update missions
    setMissions(prev =>
      prev.map(m => {
        if (m.id === 'm-levels') {
          const nextVal = Math.min(m.target, currentLevel.level);
          return { ...m, current: nextVal, completed: nextVal >= m.target };
        }
        return m;
      })
    );

    setIsLevelCompleteOpen(true);

    // Al superar el nivel 5 se han completado los cinco niveles del juego.
    if (currentLevel.level >= GAME_LEVELS.length) {
      setCelebrating(true);
    }

    // Guarda la puntuación en el ranking de PideTietar Play.
    onScoreSubmit?.(score, currentLevel.level);
  }, [currentLevel.level, maxUnlockedLevel, onScoreSubmit, score]);

  // Next Level CTA
  const handleNextLevel = () => {
    if (currentLevelIndex < GAME_LEVELS.length - 1) {
      startLevel(currentLevelIndex + 1);
    } else {
      setIsLevelCompleteOpen(false);
      setIsLeaderboardOpen(true);
    }
  };

  // Game Over Event
  const handleGameOver = useCallback(() => {
    setIsGameOverOpen(true);
    onScoreSubmit?.(score, currentLevel.level);
  }, [onScoreSubmit, score, currentLevel.level]);

  // Apply Coupon to Active Order
  const handleApplyCouponToOrder = (coupon: RewardCoupon) => {
    soundManager.playClick();
    let discountAmount = 0;
    if (coupon.code === 'SNACK5') {
      discountAmount = order.originalTotal * 0.05;
    } else if (coupon.code === 'ENVIOGRATIS') {
      discountAmount = 3.50; // standard shipping fee discount
    } else if (coupon.code === 'NEON15') {
      discountAmount = order.originalTotal * 0.15;
    } else if (coupon.code === 'BURGER5USD') {
      discountAmount = 5.00;
    } else if (coupon.code === 'VIPGOLD30') {
      discountAmount = order.originalTotal * 0.30;
    }

    discountAmount = Math.min(order.originalTotal - 1, discountAmount);

    setOrder(prev => ({
      ...prev,
      currentDiscount: discountAmount,
      finalTotal: Math.max(0, prev.originalTotal - discountAmount),
      appliedCouponCode: coupon.code,
    }));

    setCoupons(prev =>
      prev.map(c => ({
        ...c,
        applied: c.code === coupon.code,
      }))
    );
  };

  const mortarProgress = Math.min(1, mortarPopsCount / currentLevel.mortarChargesNeeded);

  return (
    <div className="bubble-game relative w-full h-full max-h-full overflow-hidden bg-[#0a0520] font-sans flex flex-col">
      {screen === 'TITLE' ? (
        <TitleScreen
          highScore={highScore}
          onPlay={handleStartGame}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenRewards={() => setIsRewardsOpen(true)}
          onSelectLevel={(lvl) => {
            setCurrentLevelIndex(lvl - 1);
            startLevel(lvl - 1);
          }}
          currentLevel={currentLevelIndex + 1}
          maxUnlockedLevel={maxUnlockedLevel}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <div className="relative w-full h-full flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Top Delivery Tracker Header */}
          <OrderTrackerBar
            order={order}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onOpenRewards={() => setIsRewardsOpen(true)}
          />

          {/* Mobile & Tablet Compact Sub-Header Strip (lg:hidden) - Ultra-compact, Zero Overlapping */}
          <div className="lg:hidden w-full bg-[#120727]/95 backdrop-blur-md border-b border-purple-800/40 px-1.5 sm:px-3 py-1 flex items-center justify-between text-xs z-20 shrink-0 shadow-md">
            {/* Left: Menu & Level */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setIsPauseOpen(true)}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-900/80 hover:bg-purple-800 border border-purple-600/50 rounded-lg text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow transition-transform active:scale-95 cursor-pointer"
              >
                <Menu className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span className="hidden xs:inline">Menú</span>
              </button>
              <div className="flex items-center gap-1 bg-purple-950/70 border border-purple-800/50 rounded-lg px-1.5 sm:px-2 py-0.5 text-purple-200">
                <span className="font-extrabold text-white text-[11px] sm:text-xs">Lvl {currentLevel.level}</span>
                <span className="text-[10px] text-amber-300 font-semibold hidden md:inline truncate max-w-[90px]">
                  {currentLevel.name}
                </span>
              </div>
            </div>

            {/* Center: Live Glowing Score */}
            <div className="flex items-center gap-1">
              <div className="px-2 sm:px-2.5 py-0.5 bg-purple-950/90 border border-cyan-500/40 rounded-lg text-xs sm:text-sm font-mono font-black text-[#00f0ff] text-glow-cyan shadow">
                {score.toLocaleString('es-ES')}
              </div>
            </div>

            {/* Right: Mortar, Missions, and Points Rules */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {mortarCharged ? (
                <button
                  onClick={handleLaunchMortar}
                  className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-amber-500 to-rose-600 rounded-lg text-[10px] sm:text-[11px] font-black text-white shadow-lg animate-pulse flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Bomb className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-current" />
                  <span>¡Mortero!</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsMissionsDrawerOpen(true)}
                  title="Progreso de Mortero"
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-700/40 rounded-lg text-[10px] sm:text-[11px] font-semibold text-purple-300 hover:text-white flex items-center gap-0.5 sm:gap-1 cursor-pointer"
                >
                  <Bomb className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-amber-400" />
                  <span className="font-mono text-[9px] sm:text-[10px]">{Math.round(mortarProgress * 100)}%</span>
                </button>
              )}

              {/* Missions Trigger */}
              <button
                onClick={() => setIsMissionsDrawerOpen(true)}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-900/60 hover:bg-purple-800 border border-purple-600/40 rounded-lg text-[10px] sm:text-[11px] font-bold text-pink-300 flex items-center gap-1 shadow cursor-pointer active:scale-95"
              >
                <Zap className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-pink-400" />
                <span className="text-[9px] sm:text-[10px] font-mono text-white/90">
                  {missions[0]?.current}/{missions[0]?.target}
                </span>
              </button>

              {/* Color Values & 3X Guide Trigger */}
              <button
                onClick={() => setIsColorGuideOpen(true)}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-950/80 hover:bg-purple-900 border border-amber-500/40 rounded-lg text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-0.5 sm:gap-1 shadow cursor-pointer active:scale-95"
                title="Valores de Color & Reglas"
              >
                <span>★ 3X</span>
              </button>
            </div>
          </div>

          {/* Main Gameplay Screen */}
          <div className="relative flex-1 w-full max-w-7xl mx-auto flex items-center justify-between px-1 sm:px-3 md:px-6 py-1 sm:py-2 overflow-hidden min-h-0">
            {/* Left HUD Panel */}
            <div className="hidden lg:block shrink-0 z-10 h-full max-h-[640px] overflow-y-auto">
              <HUDLeft
                currentLevel={currentLevel}
                score={score}
                highScore={highScore}
                onOpenMenu={() => setIsPauseOpen(true)}
                onNewGame={handleNewGame}
              />
            </div>

            {/* Center Canvas Game Area - Completely unobstructed */}
            <div className="relative flex-1 h-full min-h-0 flex items-center justify-center max-w-[560px] mx-auto z-0">
              <GameCanvas
                currentLevel={currentLevel}
                score={score}
                onScoreAdd={handleScoreAdd}
                onBubbleDropped={handleBubbleDropped}
                onBubblePopped={handleBubblePopped}
                onMissShot={handleMissShot}
                onLevelComplete={handleLevelComplete}
                onGameOver={handleGameOver}
                bubblesRemaining={bubblesRemaining}
                setBubblesRemaining={setBubblesRemaining}
                mortarCharged={mortarCharged}
                onMortarUsed={handleMortarUsed}
                isPaused={
                  isPauseOpen ||
                  isLevelCompleteOpen ||
                  isGameOverOpen ||
                  isLeaderboardOpen ||
                  isRewardsOpen ||
                  isMissionsDrawerOpen ||
                  isColorGuideOpen
                }
              />
            </div>

            {/* Right HUD Panel */}
            <div className="hidden lg:block shrink-0 z-10 h-full max-h-[640px] overflow-y-auto">
              <HUDRight
                missions={missions}
                mortarCharge={mortarProgress}
                isMortarReady={mortarCharged}
                onLaunchMortar={handleLaunchMortar}
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        userScore={score}
        userName={userName}
        onUpdateUserName={setUserName}
      />

      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        coupons={coupons}
        maxUnlockedLevel={maxUnlockedLevel}
        onApplyCouponToOrder={handleApplyCouponToOrder}
        appliedCouponCode={order.appliedCouponCode}
      />

      <LevelCompleteModal
        isOpen={isLevelCompleteOpen}
        level={currentLevel}
        score={levelScore}
        bubblesSaved={bubblesRemaining}
        onNextLevel={handleNextLevel}
        onReplayLevel={() => startLevel(currentLevelIndex)}
        onOpenLeaderboard={() => {
          setIsLevelCompleteOpen(false);
          setIsLeaderboardOpen(true);
        }}
        hasNextLevel={currentLevelIndex < GAME_LEVELS.length - 1}
      />

      <GameOverModal
        isOpen={isGameOverOpen}
        level={currentLevel}
        score={levelScore}
        highScore={highScore}
        onRetry={() => startLevel(currentLevelIndex)}
        onTitleMenu={() => {
          setIsGameOverOpen(false);
          setScreen('TITLE');
        }}
        onOpenLeaderboard={() => {
          setIsGameOverOpen(false);
          setIsLeaderboardOpen(true);
        }}
        onOpenRewards={() => {
          setIsGameOverOpen(false);
          setIsRewardsOpen(true);
        }}
      />

      <PauseModal
        isOpen={isPauseOpen}
        onResume={() => setIsPauseOpen(false)}
        onRestart={() => startLevel(currentLevelIndex)}
        onTitleMenu={() => {
          setIsPauseOpen(false);
          setScreen('TITLE');
        }}
        onOpenLeaderboard={() => {
          setIsPauseOpen(false);
          setIsLeaderboardOpen(true);
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isAmbientMusicOn={isAmbientMusicOn}
        onToggleAmbientMusic={handleToggleAmbientMusic}
      />

      {/* Mobile/Tablet Missions Drawer */}
      {isMissionsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#180a33] border-2 border-purple-500/50 rounded-3xl p-5 shadow-[0_0_40px_rgba(140,50,230,0.4)] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-purple-700/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-900 border border-pink-400 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-pink-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Misiones & Poderes</h3>
                  <p className="text-[11px] text-purple-300">Nivel {currentLevel.level}: {currentLevel.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMissionsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-purple-900/60 hover:bg-purple-800 border border-purple-700/50 flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Missions List */}
            <div className="mt-4 space-y-3">
              <div className="text-xs uppercase tracking-wider text-purple-300 font-bold">Objetivos Activos</div>
              {missions.map(mission => {
                const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
                const isCompleted = mission.completed || pct >= 100;
                return (
                  <div key={mission.id} className="bg-purple-950/70 border border-purple-700/40 rounded-2xl p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-white">{mission.title}</span>
                      <span className="text-[11px] text-purple-300">{mission.description}</span>
                    </div>
                    <div className="relative h-6 bg-purple-950 rounded-full border border-purple-600/50 overflow-hidden flex items-center">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-black text-white drop-shadow">
                        {mission.current} / {mission.target} ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mortar Charge Box */}
            <div className="mt-4 bg-gradient-to-r from-purple-950/80 to-[#2c103e] border border-amber-500/30 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                    mortarCharged
                      ? 'bg-gradient-to-br from-amber-500 to-rose-600 border-yellow-200 text-white animate-pulse'
                      : 'bg-purple-950 border-purple-600 text-purple-300'
                  }`}>
                    <Bomb className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Burbuja Mortero</div>
                    <div className="text-[10px] text-purple-300">
                      {mortarCharged ? '¡Listo para disparar!' : `Carga: ${mortarPopsCount}/${currentLevel.mortarChargesNeeded} pops`}
                    </div>
                  </div>
                </div>

                {mortarCharged ? (
                  <button
                    onClick={() => {
                      setIsMissionsDrawerOpen(false);
                      handleLaunchMortar();
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-600 rounded-xl text-xs font-black text-white shadow-lg animate-pulse active:scale-95 cursor-pointer"
                  >
                    💣 Disparar
                  </button>
                ) : (
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {Math.round(mortarProgress * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Reward Coupon Preview */}
            <div className="mt-4 bg-purple-950/50 border border-purple-800/40 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Premio por ganar</span>
                <div className="text-xs font-bold text-amber-300">{currentLevel.rewardCoupon.title} ({currentLevel.rewardCoupon.discountText})</div>
              </div>
              <button
                onClick={() => {
                  setIsMissionsDrawerOpen(false);
                  setIsRewardsOpen(true);
                }}
                className="px-2.5 py-1 bg-purple-900/80 hover:bg-purple-800 border border-purple-600/50 rounded-lg text-xs font-bold text-pink-300 flex items-center gap-1 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Ver Todos</span>
              </button>
            </div>

            <button
              onClick={() => setIsMissionsDrawerOpen(false)}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-2xl text-xs font-bold text-white tracking-wide active:scale-98 transition shadow cursor-pointer"
            >
              Continuar Jugando
            </button>
          </div>
        </div>
      )}

      {/* Color Guide & Rules Modal */}
      {isColorGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#180a33] border-2 border-purple-500/50 rounded-3xl p-5 shadow-[0_0_40px_rgba(140,50,230,0.4)] text-white">
            <div className="flex items-center justify-between pb-3 border-b border-purple-700/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-extrabold text-xs">
                  ★
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Valores & Reglas Especiales</h3>
                  <p className="text-[11px] text-purple-300">Puntaje por color y combos</p>
                </div>
              </div>
              <button
                onClick={() => setIsColorGuideOpen(false)}
                className="w-8 h-8 rounded-full bg-purple-900/60 hover:bg-purple-800 border border-purple-700/50 flex items-center justify-center text-purple-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bubble Colors & Points Breakdown */}
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-purple-300 font-bold mb-2">Puntos por Burbuja</div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-pink-950/60 border border-pink-500/40">
                  <div className="w-4 h-4 mx-auto rounded-full bg-pink-500 shadow-[0_0_8px_rgba(255,42,141,0.8)]" />
                  <div className="text-[10px] font-bold text-white mt-1">Magenta</div>
                  <div className="text-xs font-mono font-black text-pink-300">10 pts</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/40">
                  <div className="w-4 h-4 mx-auto rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,210,255,0.8)]" />
                  <div className="text-[10px] font-bold text-white mt-1">Cyan</div>
                  <div className="text-xs font-mono font-black text-cyan-300">15 pts</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40">
                  <div className="w-4 h-4 mx-auto rounded-full bg-amber-400 shadow-[0_0_8px_rgba(255,200,0,0.8)]" />
                  <div className="text-[10px] font-bold text-white mt-1">Amarillo</div>
                  <div className="text-xs font-mono font-black text-amber-300">20 pts</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
                  <div className="w-4 h-4 mx-auto rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,255,140,0.8)]" />
                  <div className="text-[10px] font-bold text-white mt-1">Verde</div>
                  <div className="text-xs font-mono font-black text-emerald-300">25 pts</div>
                </div>
                <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40">
                  <div className="w-4 h-4 mx-auto rounded-full bg-purple-400 shadow-[0_0_8px_rgba(180,60,255,0.8)]" />
                  <div className="text-[10px] font-bold text-white mt-1">Púrpura</div>
                  <div className="text-xs font-mono font-black text-purple-300">30 pts</div>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-start gap-2.5">
                <span className="text-base text-amber-300 leading-none">★</span>
                <div>
                  <span className="font-bold text-amber-300">Burbuja Especial 3X:</span>{' '}
                  <span className="text-purple-200">Cada 6 burbujas del mismo color reventadas, aparece una burbuja resplandeciente con corona dorada. ¡Al explotarla, triplica (3X) sus puntos normales!</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-start gap-2.5">
                <span className="text-base text-cyan-300 leading-none">⚡</span>
                <div>
                  <span className="font-bold text-cyan-300">Oleada por 10 Pops:</span>{' '}
                  <span className="text-purple-200">Cada 10 burbujas explotadas en total, caen 5 nuevas burbujas de colores empujando el racimo hacia abajo.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-start gap-2.5">
                <span className="text-base text-rose-300 leading-none">⚠️</span>
                <div>
                  <span className="font-bold text-rose-300">Descenso Continuo:</span>{' '}
                  <span className="text-purple-200">El techo baja cada {currentLevel.ceilingDropIntervalSec}s (el doble de rápido). ¡Si las burbujas tocan la línea de peligro inferior, pierdes!</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsColorGuideOpen(false)}
              className="mt-4 w-full py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 rounded-2xl text-xs font-bold text-white tracking-wide active:scale-98 transition shadow cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <GameCelebration
        open={celebrating}
        gameTitle="Burbujas"
        gameColor="#b026ff"
        onClose={() => setCelebrating(false)}
      />
    </div>
  );
}
