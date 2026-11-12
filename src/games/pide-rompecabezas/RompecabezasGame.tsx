/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { sessionStore } from '../../utils/browserSession';
import { TitleScreen } from './components/TitleScreen';
import { CampaignSelector } from './components/CampaignSelector';
import { PuzzleBoard } from './components/PuzzleBoard';
import { GoldenHeader } from './components/GoldenHeader';
import { VictoryModal } from './components/VictoryModal';
import { MultiplayerDuel } from './components/MultiplayerDuel';
import { MultiplayerSetupModal } from './components/MultiplayerSetupModal';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { GalleryView } from './components/GalleryView';
import { GameCelebration } from '../../components/GameCelebration';
import { PUZZLES, PuzzleInfo } from './data/puzzles';
import { PieceShape } from './utils/jigsawMath';
import { sound } from './utils/audio';
import {
  getPlayerStats,
  recordPuzzleCompletion,
  PlayerStats,
} from './utils/storage';

type AppScreen =
  | 'TITLE_MENU'
  | 'CAMPAIGN_SELECT'
  | 'PLAYING'
  | 'MULTIPLAYER_PLAYING'
  | 'GALLERY_SELECT';

interface RompecabezasGameProps {
  /** Callback al completar un rompecabezas, con (puntuación, nivel). */
  onScoreSubmit?: (score: number, levelId: number) => void;
}

export default function RompecabezasGame({ onScoreSubmit }: RompecabezasGameProps) {
  const { currentUser } = useApp();

  // Theme state: dark mode as primary default
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = sessionStore.getItem('valletietar_theme');
    return saved !== 'light';
  });

  // Sound mute state
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());

  // Player Stats
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const stats = getPlayerStats();
    if (stats.playerName === 'Explorador del Valle' && currentUser?.name) {
      return { ...stats, playerName: currentUser.name };
    }
    return stats;
  });

  // Screen routing
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('TITLE_MENU');

  // Active puzzle
  const [activePuzzle, setActivePuzzle] = useState<PuzzleInfo>(PUZZLES[0]);

  // Gameplay state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [piecesPlacedCount, setPiecesPlacedCount] = useState<number>(0);

  // HINT STATES: Toggled on/off by player as requested
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.25); // 0 = off, 0.25, 0.50, 0.75
  const [showGridOutlines, setShowGridOutlines] = useState<boolean>(true); // on/off piece outline lines
  const [showPhotoPreview, setShowPhotoPreview] = useState<boolean>(false); // on/off floating reference photo
  const [filterMode, setFilterMode] = useState<'all' | 'edge' | 'inside'>('all');

  // Modals
  const [showDailyModal, setShowDailyModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  // Celebración al completar un rompecabezas del quinto nivel.
  const [celebrating, setCelebrating] = useState<boolean>(false);
  const [showMultiplayerSetupModal, setShowMultiplayerSetupModal] = useState<boolean>(false);
  const [lastCompletedStats, setLastCompletedStats] = useState<{
    stars: number;
    score: number;
    time: number;
    coins: number;
    isNewRecord: boolean;
  }>({ stars: 3, score: 0, time: 0, coins: 0, isNewRecord: false });

  // Multiplayer Duel State
  const [multiplayerTurn, setMultiplayerTurn] = useState<1 | 2>(1);
  const [mpPlayer1Name, setMpPlayer1Name] = useState<string>('Guardián de Gredos');
  const [mpPlayer2Name, setMpPlayer2Name] = useState<string>('Explorador del Tiétar');
  const [mpTurnLimit, setMpTurnLimit] = useState<number>(20);
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);
  const [player1Pieces, setPlayer1Pieces] = useState<number>(0);
  const [player2Pieces, setPlayer2Pieces] = useState<number>(0);

  // Guarda la preferencia de tema de la sesión. No se toca la clase `dark`
  // del documento: el tema del juego se resuelve con clases propias para no
  // alterar el resto de PideTietar.
  useEffect(() => {
    sessionStore.setItem('valletietar_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    sound.playPick();
    setIsDark((prev) => !prev);
  };

  const toggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Timer interval for playing state
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (
      (currentScreen === 'PLAYING' || currentScreen === 'MULTIPLAYER_PLAYING') &&
      !showVictoryModal
    ) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen, showVictoryModal]);

  // Start a puzzle
  const handleStartPuzzle = (puzzle: PuzzleInfo, isMultiplayer = false) => {
    setActivePuzzle(puzzle);
    setTimerSeconds(0);
    setScore(puzzle.basePoints);
    setMovesCount(0);
    setPiecesPlacedCount(0);
    setShowVictoryModal(false);

    if (isMultiplayer) {
      setMultiplayerTurn(1);
      setPlayer1Score(0);
      setPlayer2Score(0);
      setPlayer1Pieces(0);
      setPlayer2Pieces(0);
      setCurrentScreen('MULTIPLAYER_PLAYING');
    } else {
      setCurrentScreen('PLAYING');
    }
  };

  // Start multiplayer duel with chosen level, landscape, and player names
  const handleStartMultiplayerDuel = (
    puzzle: PuzzleInfo,
    p1Name: string,
    p2Name: string,
    turnLimit: number
  ) => {
    setShowMultiplayerSetupModal(false);
    setMpPlayer1Name(p1Name);
    setMpPlayer2Name(p2Name);
    setMpTurnLimit(turnLimit);
    handleStartPuzzle(puzzle, true);
  };

  // When a piece is snapped into place
  const handlePiecePlaced = (_piece: PieceShape, _remainingCount: number) => {
    setPiecesPlacedCount((prev) => prev + 1);
    setMovesCount((prev) => prev + 1);

    // Points calculation: +150 per piece + time speed bonus
    const piecePoints = 150 + Math.max(0, 100 - Math.floor(timerSeconds / 3));
    setScore((prev) => prev + piecePoints);

    // If multiplayer, award points to active player
    if (currentScreen === 'MULTIPLAYER_PLAYING') {
      if (multiplayerTurn === 1) {
        setPlayer1Score((s) => s + piecePoints);
        setPlayer1Pieces((p) => p + 1);
      } else {
        setPlayer2Score((s) => s + piecePoints);
        setPlayer2Pieces((p) => p + 1);
      }
    }
  };

  // Handle wrong attempt in multiplayer
  const handleMultiplayerMove = (success: boolean) => {
    if (!success) {
      // Turn passes to opponent
      setMultiplayerTurn((turn) => (turn === 1 ? 2 : 1));
    }
  };

  // Puzzle completed
  const handlePuzzleCompleted = () => {
    const ratio = timerSeconds / activePuzzle.parTime;
    let stars = 3;
    if (ratio > 1.6) stars = 1;
    else if (ratio > 1.1) stars = 2;

    const coinsEarned = 100 + stars * 50;

    const { stats, isNewHighScore } = recordPuzzleCompletion(
      activePuzzle.id,
      activePuzzle.level,
      activePuzzle.title,
      stars,
      timerSeconds,
      score,
      movesCount,
      coinsEarned
    );

    setPlayerStats(stats);
    setLastCompletedStats({
      stars,
      score,
      time: timerSeconds,
      coins: coinsEarned,
      isNewRecord: isNewHighScore,
    });
    setShowVictoryModal(true);

    // El nivel 5 es el último de la campaña: celebración especial.
    if (activePuzzle.level === 5) {
      setCelebrating(true);
    }

    // Guarda la puntuación en el ranking de PideTietar Play.
    onScoreSubmit?.(score, activePuzzle.level);
  };

  // Find next puzzle in campaign
  const currentIdx = PUZZLES.findIndex((p) => p.id === activePuzzle.id);
  const hasNextPuzzle = currentIdx >= 0 && currentIdx < PUZZLES.length - 1;

  const handleNextPuzzle = () => {
    if (hasNextPuzzle) {
      handleStartPuzzle(PUZZLES[currentIdx + 1]);
    }
  };

  // Pista de fondo: ciclo 0% (apagado) -> 25% -> 50% -> 75% -> 0%
  const cycleGhost = () => {
    sound.playPick();
    setGhostOpacity((prev) => {
      if (prev === 0) return 0.25;
      if (prev === 0.25) return 0.5;
      if (prev === 0.5) return 0.75;
      return 0;
    });
  };

  // Pista de líneas de corte: encender/apagar
  const toggleGridOutlines = () => {
    sound.playPick();
    setShowGridOutlines((prev) => !prev);
  };

  // Pista de miniatura de foto flotante: encender/apagar
  const togglePhotoPreview = () => {
    sound.playPick();
    setShowPhotoPreview((prev) => !prev);
  };

  // Filter mode cycle
  const cycleFilter = () => {
    sound.playPick();
    setFilterMode((prev) => (prev === 'all' ? 'edge' : prev === 'edge' ? 'inside' : 'all'));
  };

  // Daily challenge launcher
  const handleStartDailyChallenge = (type: 'lock' | 'timer' | 'no_ghost') => {
    setShowDailyModal(false);
    const dailyPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    if (type === 'no_ghost') {
      setGhostOpacity(0);
      setShowGridOutlines(false);
    } else {
      setGhostOpacity(0.25);
      setShowGridOutlines(true);
    }
    handleStartPuzzle(dailyPuzzle);
  };

  // Star calculations for active board progress
  const progressRatio =
    activePuzzle.totalPieces > 0 ? piecesPlacedCount / activePuzzle.totalPieces : 0;
  const starsEarnedNow = progressRatio >= 1 ? 3 : progressRatio >= 0.66 ? 2 : progressRatio >= 0.33 ? 1 : 0;

  return (
    <div
      className={`rompecabezas-game h-full w-full overflow-y-auto transition-colors duration-300 ${
        isDark
          ? 'bg-[#18112d] text-slate-100'
          : 'bg-[#f1f5f9] text-slate-900'
      }`}
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(circle at 50% 20%, #2e1d52 0%, #150f26 60%, #0d091a 100%)'
          : 'radial-gradient(circle at 50% 20%, #ffffff 0%, #e2e8f0 70%, #cbd5e1 100%)',
      }}
    >
      {/* 1. TITLE SCREEN */}
      {currentScreen === 'TITLE_MENU' && (
        <TitleScreen
          playerStats={playerStats}
          isDark={isDark}
          isMuted={isMuted}
          onToggleTheme={toggleTheme}
          onToggleMute={toggleMute}
          onStartCampaign={() => setCurrentScreen('CAMPAIGN_SELECT')}
          onStartMultiplayer={() => setShowMultiplayerSetupModal(true)}
          onOpenDaily={() => setShowDailyModal(true)}
          onOpenLeaderboard={() => setShowLeaderboardModal(true)}
          onOpenGallery={() => setCurrentScreen('GALLERY_SELECT')}
        />
      )}

      {/* 2. CAMPAIGN LEVEL SELECTOR (5 NIVELES, 3 IMÁGENES POR NIVEL) */}
      {currentScreen === 'CAMPAIGN_SELECT' && (
        <CampaignSelector
          playerStats={playerStats}
          onSelectPuzzle={(puzzle) => handleStartPuzzle(puzzle)}
          onBack={() => setCurrentScreen('TITLE_MENU')}
        />
      )}

      {/* 3. GALLERY / FREE PLAY SELECTOR */}
      {currentScreen === 'GALLERY_SELECT' && (
        <GalleryView
          playerStats={playerStats}
          onSelectCustomPuzzle={(puzzle) => handleStartPuzzle(puzzle)}
          onBack={() => setCurrentScreen('TITLE_MENU')}
        />
      )}

      {/* 4. ACTIVE PLAYING BOARD (SOLO O MULTIPLAYER) */}
      {(currentScreen === 'PLAYING' || currentScreen === 'MULTIPLAYER_PLAYING') && (
        <div className="w-full min-h-full flex flex-col justify-between py-2 sm:py-4">
          {/* Golden Ribbon Header with 3 Stars and Hint Toggles */}
          <GoldenHeader
            title={activePuzzle.title}
            timerSeconds={timerSeconds}
            score={score}
            piecesRemaining={activePuzzle.totalPieces - piecesPlacedCount}
            totalPieces={activePuzzle.totalPieces}
            starsEarned={starsEarnedNow}
            progressRatio={progressRatio}
            isMuted={isMuted}
            isDark={isDark}
            ghostOpacity={ghostOpacity}
            showGridOutlines={showGridOutlines}
            showPhotoPreview={showPhotoPreview}
            filterMode={filterMode}
            onToggleMute={toggleMute}
            onToggleTheme={toggleTheme}
            onCycleGhost={cycleGhost}
            onToggleGridOutlines={toggleGridOutlines}
            onTogglePhotoPreview={togglePhotoPreview}
            onCycleFilter={cycleFilter}
            onBack={() => setCurrentScreen('TITLE_MENU')}
          />

          {/* Local Multiplayer Duel Status */}
          {currentScreen === 'MULTIPLAYER_PLAYING' && (
            <MultiplayerDuel
              player1Name={mpPlayer1Name}
              player2Name={mpPlayer2Name}
              currentPlayerTurn={multiplayerTurn}
              player1Score={player1Score}
              player2Score={player2Score}
              player1Pieces={player1Pieces}
              player2Pieces={player2Pieces}
              remainingPieces={activePuzzle.totalPieces - piecesPlacedCount}
              totalPieces={activePuzzle.totalPieces}
              turnSecondsLimit={mpTurnLimit}
              onTurnTimeout={() => setMultiplayerTurn((t) => (t === 1 ? 2 : 1))}
            />
          )}

          {/* The Interactive Jigsaw Board */}
          <main className="flex-1 flex items-center justify-center">
            <PuzzleBoard
              puzzleId={activePuzzle.id}
              imageSrc={activePuzzle.image}
              puzzleTitle={activePuzzle.title}
              rows={activePuzzle.rows}
              cols={activePuzzle.cols}
              ghostOpacity={ghostOpacity}
              showGridOutlines={showGridOutlines}
              showPhotoPreview={showPhotoPreview}
              filterMode={filterMode}
              onClosePhotoPreview={() => setShowPhotoPreview(false)}
              onPiecePlaced={handlePiecePlaced}
              onPuzzleCompleted={handlePuzzleCompleted}
              multiplayerMode={currentScreen === 'MULTIPLAYER_PLAYING'}
              currentPlayerTurn={multiplayerTurn}
              onMultiplayerMove={handleMultiplayerMove}
            />
          </main>

          {/* Level Detail Footnote */}
          <footer className="text-center text-[11px] text-slate-400 py-1">
            {activePuzzle.townOrZone} · {activePuzzle.totalPieces} piezas · Nivel {activePuzzle.level}
          </footer>
        </div>
      )}

      {/* MODALS */}
      {/* Victory Celebration Modal */}
      {showVictoryModal && (
        <VictoryModal
          puzzleTitle={activePuzzle.title}
          townOrZone={activePuzzle.townOrZone}
          starsEarned={lastCompletedStats.stars}
          score={lastCompletedStats.score}
          timeSeconds={lastCompletedStats.time}
          coinsEarned={lastCompletedStats.coins}
          isNewRecord={lastCompletedStats.isNewRecord}
          hasNextPuzzle={hasNextPuzzle}
          isMultiplayer={currentScreen === 'MULTIPLAYER_PLAYING'}
          multiplayerStats={
            currentScreen === 'MULTIPLAYER_PLAYING'
              ? {
                  p1Name: mpPlayer1Name,
                  p2Name: mpPlayer2Name,
                  p1Score: player1Score,
                  p2Score: player2Score,
                  p1Pieces: player1Pieces,
                  p2Pieces: player2Pieces,
                }
              : undefined
          }
          onNextPuzzle={handleNextPuzzle}
          onReplay={() => handleStartPuzzle(activePuzzle, currentScreen === 'MULTIPLAYER_PLAYING')}
          onHome={() => {
            setShowVictoryModal(false);
            setCurrentScreen('TITLE_MENU');
          }}
          onShowLeaderboard={() => {
            setShowVictoryModal(false);
            setShowLeaderboardModal(true);
          }}
        />
      )}

      {/* Daily Challenges & Emblems Modal */}
      <DailyChallengesModal
        isOpen={showDailyModal}
        onClose={() => setShowDailyModal(false)}
        playerCoins={playerStats.coins}
        onStartChallenge={handleStartDailyChallenge}
      />

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        playerTotalScore={playerStats.totalScore}
      />

      {/* Multiplayer Setup Modal (Difficulty Level 1-5, landscape, names, and turn limit) */}
      <MultiplayerSetupModal
        isOpen={showMultiplayerSetupModal}
        onClose={() => setShowMultiplayerSetupModal(false)}
        onStartDuel={handleStartMultiplayerDuel}
      />

      <GameCelebration
        open={celebrating}
        gameTitle="Rompecabezas"
        gameColor="#f59e0b"
        onClose={() => setCelebrating(false)}
      />
    </div>
  );
}
