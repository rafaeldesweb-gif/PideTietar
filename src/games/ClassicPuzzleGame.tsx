/**
 * Classic Puzzle – puzle deslizante con dibujos para niños.
 *
 * El tablero no muestra números: cada ficha es un trozo del dibujo de un nivel
 * (sol, arcoíris, gatito, granja, bosque…) y solo aparece la imagen completa al
 * recomponer el orden. Los 12 niveles están ordenados de menor a mayor detalle y
 * el tablero crece de 3×3 a 5×5.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Lock, Play, RotateCcw, Timer, Trophy, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import { GameCelebration } from '../components/GameCelebration';
import { useGameProgress } from './useGameProgress';
import { CLASSIC_PUZZLE_LEVELS } from './classicPuzzleLevels';
import type { ClassicPuzzleLevel } from './classicPuzzleLevels';
import './ClassicPuzzleGame.css';

interface ClassicPuzzleGameProps {
  onClose?: () => void;
}

const COMPLETED_KEY = 'pidetietar-game-classic-puzzle-completed-v1';
const SCORE_KEY = 'pidetietar-game-classic-puzzle-best-v1';

/** Tres fichas o más movidas no cuentan como victoria. */
const createSolvedBoard = (grid: number): number[] =>
  Array.from({ length: grid * grid }, (_, index) => (index === grid * grid - 1 ? 0 : index + 1));

/** Comprueba si la ficha `index` está pegada al hueco (sin diagonales). */
const isNeighbour = (index: number, empty: number, grid: number): boolean => {
  const row = Math.floor(index / grid);
  const column = index % grid;
  const emptyRow = Math.floor(empty / grid);
  const emptyColumn = empty % grid;
  return Math.abs(row - emptyRow) + Math.abs(column - emptyColumn) === 1;
};

/**
 * Desordena el tablero con movimientos legales desde la posición resuelta.
 * Así la partida siempre se puede terminar (el puzle deslizante tiene dos
 * mitades incompatibles y un desorden aleatorio dejaría tableros imposibles).
 */
const shuffleBoard = (grid: number): number[] => {
  const solved = createSolvedBoard(grid);
  const board = [...solved];
  let empty = board.length - 1;
  const steps = grid * grid * 16 + 40;

  for (let step = 0; step < steps; step += 1) {
    const options: number[] = [];
    for (let index = 0; index < board.length; index += 1) {
      if (isNeighbour(index, empty, grid)) options.push(index);
    }
    const pick = options[Math.floor(Math.random() * options.length)];
    [board[pick], board[empty]] = [board[empty], board[pick]];
    empty = pick;
  }

  const unchanged = board.every((tile, index) => tile === solved[index]);
  return unchanged ? shuffleBoard(grid) : board;
};

const formatTime = (totalSeconds: number): string =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

/**
 * Un nivel se desbloquea al completar el anterior: el 1 siempre está abierto y
 * el resto espera a que el jugador termine el dibujo de delante.
 */
const isLevelUnlocked = (index: number, completed: number[]): boolean =>
  index === 0 || completed.includes(CLASSIC_PUZZLE_LEVELS[index - 1].id);

/** Primer nivel pendiente: donde se reanuda la partida al volver al juego. */
const firstPendingLevel = (completed: number[]): number => {
  const index = CLASSIC_PUZZLE_LEVELS.findIndex((item) => !completed.includes(item.id));
  return index === -1 ? 0 : index;
};

export default function ClassicPuzzleGame({ onClose }: ClassicPuzzleGameProps) {
  // El progreso se carga por usuario en `useGameProgress`; no se lee una
  // clave común de la pestaña porque podría pertenecer a otra cuenta.
  const [levelIndex, setLevelIndex] = useState(0);
  const level: ClassicPuzzleLevel = CLASSIC_PUZZLE_LEVELS[levelIndex];

  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const { completed, ready, completeLevel } = useGameProgress({
    gameId: 'classic-puzzle',
    maxLevel: CLASSIC_PUZZLE_LEVELS.length,
    localKey: COMPLETED_KEY,
  });

  const { bestScore, saving, saveScore } = useGameScore('classic-puzzle', SCORE_KEY);

  // Escape cierra el juego, igual que el resto de PideTiétar Play.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Cronómetro: solo corre mientras se juega y aún no se ha terminado.
  useEffect(() => {
    if (!started || finished) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  // Si el servidor recuerda más avance que la pestaña, se reanuda en el primer
  // nivel pendiente en lugar de volver al principio.
  const resumed = useRef(false);
  useEffect(() => {
    if (!ready || resumed.current) return;
    resumed.current = true;
    if (started || finished) return;
    const pending = firstPendingLevel(completed);
    if (pending <= levelIndex) return;
    setLevelIndex(pending);
  }, [completed, finished, levelIndex, ready, started]);

  const startLevel = useCallback((target: ClassicPuzzleLevel) => {
    setTiles(shuffleBoard(target.grid));
    setMoves(0);
    setSeconds(0);
    setScore(0);
    setStarted(true);
    setFinished(false);
  }, []);

  const selectLevel = (index: number) => {
    // Los niveles bloqueados no se pueden abrir aunque se pulse la miniatura.
    if (!isLevelUnlocked(index, completed)) return;
    setLevelIndex(index);
    setTiles([]);
    setMoves(0);
    setSeconds(0);
    setScore(0);
    setStarted(false);
    setFinished(false);
  };

  const finishLevel = (totalMoves: number, elapsed: number, currentLevel: ClassicPuzzleLevel) => {
    const points = Math.max(
      10,
      Math.round(currentLevel.basePoints - totalMoves * 5 - elapsed * 2),
    );
    setScore(points);
    setFinished(true);
    completeLevel(currentLevel.id);

    void saveScore(points, currentLevel.serverLevel);

    // Celebración compartida al superar el quinto nivel y al terminar los doce.
    if (currentLevel.id === 5 || currentLevel.id === CLASSIC_PUZZLE_LEVELS.length) {
      setCelebrating(true);
    }
  };

  const moveTile = (index: number) => {
    if (!started || finished) return;
    const empty = tiles.indexOf(0);
    if (!isNeighbour(index, empty, level.grid)) return;

    const next = [...tiles];
    [next[index], next[empty]] = [next[empty], next[index]];
    const nextMoves = moves + 1;
    setTiles(next);
    setMoves(nextMoves);

    const solved = next.every((tile, tileIndex) => tile === solvedPreview[tileIndex]);
    if (solved) finishLevel(nextMoves, seconds, level);
  };

  const goToNextLevel = () => {
    const nextIndex = Math.min(levelIndex + 1, CLASSIC_PUZZLE_LEVELS.length - 1);
    selectLevel(nextIndex);
  };

  // Posición de cada ficha dentro del dibujo. `tile` es el número de pieza
  // (1 arriba a la izquierda) y no cambia al moverla: por eso al recomponer el
  // orden numérico aparece la imagen completa.
  const tileBackground = useMemo(() => {
    const size = level.grid;
    return (tile: number) => {
      const row = Math.floor((tile - 1) / size);
      const column = (tile - 1) % size;
      return {
        backgroundImage: `url(${level.image})`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${(column / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`,
      };
    };
  }, [level]);

  const solvedPreview = createSolvedBoard(level.grid);
  const totalPieces = level.grid * level.grid - 1;
  const placedPieces = tiles.filter((tile, index) => tile !== 0 && tile === solvedPreview[index]).length;
  const progress = started ? Math.round((placedPieces / totalPieces) * 100) : 0;

  return (
    <section className="pidetietar-classic-puzzle" aria-label="Juego Classic Puzzle">
      <div className="pidetietar-classic-puzzle__shell">
        <header className="pidetietar-classic-puzzle__header">
          <div>
            <span>PideTiétar Play</span>
            <h2>Classic Puzzle</h2>
            <p>Doce dibujos para niños, del más sencillo al más detallado.</p>
          </div>
          <button type="button" aria-label="Salir de Classic Puzzle" onClick={onClose}>
            <X />
          </button>
        </header>

        {/* Selector de niveles: se abre uno nuevo al completar el dibujo anterior. */}
        <nav className="pidetietar-classic-puzzle__levels" aria-label="Niveles">
          {CLASSIC_PUZZLE_LEVELS.map((item, index) => {
            const isActive = index === levelIndex;
            const isDone = completed.includes(item.id);
            const isLocked = !isLevelUnlocked(index, completed);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isLocked}
                className={`pidetietar-classic-puzzle__level${isActive ? ' is-active' : ''}${
                  isLocked ? ' is-locked' : ''
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Nivel ${item.id}: ${item.name}${
                  isDone ? ' (superado)' : isLocked ? ' (bloqueado)' : ''
                }`}
                title={isLocked ? 'Completa el nivel anterior para desbloquearlo' : item.name}
                onClick={() => selectLevel(index)}
              >
                <img src={item.thumbnail} alt="" width={64} height={64} loading="lazy" />
                <span className="pidetietar-classic-puzzle__level-number">{item.id}</span>
                {isDone && (
                  <span className="pidetietar-classic-puzzle__level-done" aria-hidden="true">
                    <Check />
                  </span>
                )}
                {isLocked && (
                  <span className="pidetietar-classic-puzzle__level-lock" aria-hidden="true">
                    <Lock />
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <p className="pidetietar-classic-puzzle__levels-hint">
          Completa un dibujo para desbloquear el siguiente.
        </p>

        <div className="pidetietar-classic-puzzle__stage">
          <div className="pidetietar-classic-puzzle__board-wrap">
            <div
              className={`pidetietar-classic-puzzle__board${finished ? ' is-solved' : ''}`}
              style={{ '--grid': level.grid } as React.CSSProperties}
            >
              {(started ? tiles : solvedPreview).map((tile, index) => {
                if (tile === 0) {
                  return (
                    <span
                      key={`empty-${index}`}
                      className="pidetietar-classic-puzzle__tile is-empty"
                      aria-hidden="true"
                    />
                  );
                }

                const isSolvedPosition = tile === solvedPreview[index];
                return (
                  <button
                    key={`${tile}-${index}`}
                    type="button"
                    className={`pidetietar-classic-puzzle__tile${
                      isSolvedPosition && finished ? ' is-placed' : ''
                    }`}
                    style={tileBackground(tile)}
                    aria-label={`Ficha del dibujo ${index + 1}${
                      isSolvedPosition ? ', en su sitio' : ''
                    }`}
                    onClick={() => moveTile(index)}
                  ></button>
                );
              })}
            </div>

            {/* En móvil el panel queda debajo del tablero: el botón de inicio
                se coloca sobre el propio tablero para no tener que bajar. */}
            {!started && (
              <button
                type="button"
                className="pidetietar-classic-puzzle__board-start"
                onClick={() => startLevel(level)}
              >
                <Play /> Empezar
              </button>
            )}
          </div>

          <aside className="pidetietar-classic-puzzle__panel">
            <div className="pidetietar-classic-puzzle__panel-head">
              <span className="pidetietar-classic-puzzle__badge">Nivel {level.id} de 12</span>
              <h3>{level.name}</h3>
            </div>

            <img
              className="pidetietar-classic-puzzle__preview"
              src={level.thumbnail}
              alt={`Dibujo del nivel ${level.id}: ${level.name}`}
            />

            <div className="pidetietar-classic-puzzle__stats">
              <span>
                <Timer /> {formatTime(seconds)}
              </span>
              <span>
                Movimientos <b>{moves}</b>
              </span>
              <span>
                <Trophy /> {bestScore}
              </span>
            </div>

            {started && (
              <div className="pidetietar-classic-puzzle__progress" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            )}

            {!started && (
              <button
                type="button"
                className="pidetietar-classic-puzzle__primary"
                onClick={() => startLevel(level)}
              >
                <Play /> Empezar
              </button>
            )}

            {started && !finished && (
              <div className="pidetietar-classic-puzzle__actions">
                <button type="button" onClick={() => startLevel(level)}>
                  <RotateCcw /> Reiniciar
                </button>
              </div>
            )}

            {finished && (
              <div className="pidetietar-classic-puzzle__success">
                <b>¡Dibujo completado!</b>
                <small>
                  {moves} movimientos · {formatTime(seconds)} · Puntuación {score}
                  {saving ? ' · Guardando…' : ''}
                </small>
                <div className="pidetietar-classic-puzzle__actions">
                  {levelIndex < CLASSIC_PUZZLE_LEVELS.length - 1 ? (
                    <button
                      type="button"
                      className="pidetietar-classic-puzzle__primary"
                      onClick={goToNextLevel}
                    >
                      Siguiente nivel <ChevronRight />
                    </button>
                  ) : (
                    <p className="pidetietar-classic-puzzle__finale">
                      ¡Has terminado los doce dibujos!
                    </p>
                  )}
                  <button type="button" onClick={() => startLevel(level)}>
                    <RotateCcw /> Repetir
                  </button>
                </div>
              </div>
            )}

            {!finished && (
              <small className="pidetietar-classic-puzzle__hint">
                {started
                  ? 'Toca una ficha pegada al hueco para deslizarla.'
                  : 'Pulsa Empezar para desordenar el dibujo y recomponerlo.'}
              </small>
            )}
          </aside>
        </div>
      </div>

      <GameCelebration
        open={celebrating}
        gameTitle="Classic Puzzle"
        gameColor="#00cfff"
        onClose={() => setCelebrating(false)}
      />
    </section>
  );
}
