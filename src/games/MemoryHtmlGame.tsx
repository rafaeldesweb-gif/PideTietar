/**
 * Memory – juego de parejas de PideTiétar Play.
 *
 * Diez niveles con dibujos distintos (frutas, animales, mar, espacio…) que van
 * de 16 a 24 parejas. Los niveles se abren al completar el anterior y el
 * progreso vive en `sessionStorage`, igual que en el resto de juegos.
 *
 * El diseño imita la portada: marco neón con degradado naranja→violeta→cian,
 * cartas ocultas moradas con cuadros y cartas descubiertas blancas con el
 * dibujo a color.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Check, ChevronRight, Clock3, Lock, Play, RotateCcw, Trophy, X } from 'lucide-react';
import { GameCelebration } from '../components/GameCelebration';
import { sessionStore } from '../utils/browserSession';
import { parseCompletedLevels } from './gameProgress';
import { useGameProgress } from './useGameProgress';
import { useGameScore } from './useGameScore';
import {
  MEMORY_LEVELS,
  boardColumns,
  createDeck,
  firstPendingIndex,
  isLevelUnlocked,
  memoryScore,
  serverLevelFor,
} from './memoryLevels';
import type { MemoryCard, MemoryLevel } from './memoryLevels';
import './MemoryHtmlGame.css';

interface MemoryHtmlGameProps {
  onClose?: () => void;
}

interface Card extends MemoryCard {
  revealed: boolean;
  matched: boolean;
}

const COMPLETED_KEY = 'pidetietar-game-memory-html-completed-v1';
const SCORE_KEY = 'pidetietar-game-memory-html-best-v1';

const readCompleted = (): number[] =>
  parseCompletedLevels(sessionStore.getItem(COMPLETED_KEY), MEMORY_LEVELS.length);

const dealCards = (level: MemoryLevel): Card[] =>
  createDeck(level).map((card) => ({ ...card, revealed: false, matched: false }));

const formatTime = (totalSeconds: number): string =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

export default function MemoryHtmlGame({ onClose }: MemoryHtmlGameProps) {
  const [levelIndex, setLevelIndex] = useState(() => firstPendingIndex(readCompleted()));
  const level = MEMORY_LEVELS[levelIndex];

  const [cards, setCards] = useState<Card[]>(() => dealCards(level));
  const [first, setFirst] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 599px)').matches,
  );

  // Progreso compartido: servidor + respaldo de la pestaña.
  const { completed, ready, completeLevel } = useGameProgress({
    gameId: 'memory-html',
    maxLevel: MEMORY_LEVELS.length,
    localKey: COMPLETED_KEY,
  });

  const { bestScore, saving, saveScore } = useGameScore('memory-html', SCORE_KEY);

  // Marca de la partida en curso: los temporizadores del volteo no deben tocar
  // el tablero si el jugador ha cambiado de nivel o reiniciado mientras tanto.
  const gameToken = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // En pantallas estrechas el tablero usa menos columnas para que las cartas
  // sigan siendo cómodas de tocar.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 599px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // Si el servidor recuerda más avance que la pestaña, la partida se reanuda
  // en el primer nivel pendiente en lugar de volver al principio.
  const resumed = useRef(false);
  useEffect(() => {
    if (!ready || resumed.current) return;
    resumed.current = true;
    if (started || finished) return;
    const pending = firstPendingIndex(completed);
    if (pending <= levelIndex) return;
    setLevelIndex(pending);
    setCards(dealCards(MEMORY_LEVELS[pending]));
  }, [completed, finished, levelIndex, ready, started]);

  // Cronómetro: solo corre mientras se juega y aún no se ha terminado.
  useEffect(() => {
    if (!started || finished) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [finished, started]);

  const startLevel = useCallback((target: MemoryLevel) => {
    gameToken.current += 1;
    setCards(dealCards(target));
    setFirst(null);
    setBusy(false);
    setStarted(true);
    setFinished(false);
    setSeconds(0);
    setMoves(0);
    setScore(0);
  }, []);

  const selectLevel = (index: number) => {
    // Los niveles bloqueados no se abren aunque se pulse el número.
    if (!isLevelUnlocked(index, completed)) return;
    gameToken.current += 1;
    setLevelIndex(index);
    setCards(dealCards(MEMORY_LEVELS[index]));
    setFirst(null);
    setBusy(false);
    setStarted(false);
    setFinished(false);
    setSeconds(0);
    setMoves(0);
    setScore(0);
  };

  const goToNextLevel = () => {
    const nextIndex = Math.min(levelIndex + 1, MEMORY_LEVELS.length - 1);
    setLevelIndex(nextIndex);
    startLevel(MEMORY_LEVELS[nextIndex]);
  };

  const finishLevel = (nextMoves: number) => {
    const points = memoryScore(level.pairs, seconds, nextMoves);
    setScore(points);
    setFinished(true);
    completeLevel(level.id);

    void saveScore(points, serverLevelFor(level.id));

    // Celebración compartida al superar el quinto nivel y al terminar los diez.
    if (level.id === 5 || level.id === MEMORY_LEVELS.length) setCelebrating(true);
  };

  const chooseCard = (index: number) => {
    if (!started || finished || busy) return;
    const selected = cards[index];
    if (!selected || selected.revealed || selected.matched) return;

    const revealed = cards.map((card, cardIndex) =>
      cardIndex === index ? { ...card, revealed: true } : card,
    );

    if (first === null) {
      setCards(revealed);
      setFirst(index);
      return;
    }

    const previous = first;
    const nextMoves = moves + 1;
    setFirst(null);
    setMoves(nextMoves);

    if (cards[previous]?.symbol === selected.symbol) {
      const matched = revealed.map((card, cardIndex) =>
        cardIndex === index || cardIndex === previous
          ? { ...card, matched: true, revealed: true }
          : card,
      );
      setCards(matched);
      if (matched.every((card) => card.matched)) finishLevel(nextMoves);
      return;
    }

    setCards(revealed);
    setBusy(true);
    const token = gameToken.current;
    window.setTimeout(() => {
      if (gameToken.current !== token) return;
      setCards((current) =>
        current.map((card, cardIndex) =>
          cardIndex === index || cardIndex === previous ? { ...card, revealed: false } : card,
        ),
      );
      setBusy(false);
    }, 650);
  };

  const columns = boardColumns(level, compact);
  const rows = Math.ceil(Math.max(cards.length, 1) / columns);
  const boardStyle = { '--cols': columns, '--rows': rows } as CSSProperties;

  return (
    <section className="pidetietar-memory-html" aria-label="Juego Memory">
      <div className="pidetietar-memory-html__shell">
        <header className="pidetietar-memory-html__header">
          <div>
            <span className="pidetietar-memory-html__eyebrow">PideTiétar Play</span>
            <h2>Memory</h2>
            <p>
              Nivel {level.id} de {MEMORY_LEVELS.length} · {level.pairs} parejas · {level.name}
            </p>
          </div>
          <div className="pidetietar-memory-html__tools">
            {started && !finished && (
              <button
                type="button"
                className="pidetietar-memory-html__close"
                aria-label="Reiniciar la partida"
                title="Reiniciar la partida"
                onClick={() => startLevel(level)}
              >
                <RotateCcw />
              </button>
            )}
            <button
              type="button"
              className="pidetietar-memory-html__close"
              aria-label="Salir de Memory"
              onClick={onClose}
            >
              <X />
            </button>
          </div>
        </header>

        {/* Selector de niveles: se abre uno nuevo al completar el anterior. */}
        <nav className="pidetietar-memory-html__levels" aria-label="Niveles">
          {MEMORY_LEVELS.map((item, index) => {
            const isActive = index === levelIndex;
            const isDone = completed.includes(item.id);
            const isLocked = !isLevelUnlocked(index, completed);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isLocked}
                className={`pidetietar-memory-html__level${isActive ? ' is-active' : ''}${
                  isLocked ? ' is-locked' : ''
                }${isDone ? ' is-done' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Nivel ${item.id}: ${item.name}, ${item.pairs} parejas${
                  isDone ? ' (superado)' : isLocked ? ' (bloqueado)' : ''
                }`}
                title={
                  isLocked
                    ? 'Completa el nivel anterior para desbloquearlo'
                    : `${item.name} · ${item.pairs} parejas`
                }
                onClick={() => selectLevel(index)}
              >
                {isLocked ? <Lock /> : <span>{item.id}</span>}
                {isDone && (
                  <span className="pidetietar-memory-html__level-done" aria-hidden="true">
                    <Check />
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pidetietar-memory-html__stats">
          <span>
            <Clock3 /> {seconds}s
          </span>
          <span>
            Movimientos <b>{moves}</b>
          </span>
          <span>
            <Trophy /> Récord <b>{bestScore}</b>
          </span>
        </div>

        <div className="pidetietar-memory-html__board-wrap">
          <div
            className={`pidetietar-memory-html__board${
              !started || finished ? ' is-dimmed' : ''
            }`}
            style={boardStyle}
            role="grid"
            aria-label={`Tablero de ${level.pairs} parejas`}
          >
            {cards.map((card, index) => {
              const open = card.revealed || card.matched;
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`pidetietar-memory-html__card${open ? ' is-open' : ''}${
                    card.matched ? ' is-matched' : ''
                  }`}
                  aria-label={
                    open
                      ? `Carta ${card.symbol}${card.matched ? ', emparejada' : ''}`
                      : 'Carta oculta'
                  }
                  onClick={() => chooseCard(index)}
                >
                  <span className="pidetietar-memory-html__card-inner">
                    <span
                      className="pidetietar-memory-html__card-face pidetietar-memory-html__card-face--back"
                      aria-hidden="true"
                    />
                    <span
                      className="pidetietar-memory-html__card-face pidetietar-memory-html__card-face--front"
                      aria-hidden="true"
                    >
                      {card.symbol}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inicio y final se pintan sobre el tablero: así la acción principal
              siempre queda a la vista, sin hacer scroll. */}
          {!started && (
            <div className="pidetietar-memory-html__overlay">
              <button
                type="button"
                className="pidetietar-memory-html__primary"
                onClick={() => startLevel(level)}
              >
                <Play /> Empezar
              </button>
              <small className="pidetietar-memory-html__hint">
                Encuentra las {level.pairs} parejas con el menor número de movimientos.
              </small>
            </div>
          )}

          {finished && (
            <div className="pidetietar-memory-html__overlay">
              <div className="pidetietar-memory-html__success" role="status">
                <b>¡Nivel superado!</b>
                <small>
                  {level.pairs} parejas · {moves} movimientos · {formatTime(seconds)} · Puntuación{' '}
                  {score}
                  {saving ? ' · Guardando…' : ''}
                </small>
                <div className="pidetietar-memory-html__actions">
                  {levelIndex < MEMORY_LEVELS.length - 1 ? (
                    <button
                      type="button"
                      className="pidetietar-memory-html__primary"
                      onClick={goToNextLevel}
                    >
                      Siguiente nivel <ChevronRight />
                    </button>
                  ) : (
                    <p className="pidetietar-memory-html__finale">
                      ¡Has completado los diez niveles!
                    </p>
                  )}
                  <button
                    type="button"
                    className="pidetietar-memory-html__secondary"
                    onClick={() => startLevel(level)}
                  >
                    <RotateCcw /> Repetir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <GameCelebration
        open={celebrating}
        gameTitle="Memory"
        gameColor="#b026ff"
        onClose={() => setCelebrating(false)}
      />
    </section>
  );
}
