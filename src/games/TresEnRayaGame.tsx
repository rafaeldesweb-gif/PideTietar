import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, UserRound, UsersRound, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './TresEnRayaGame.css';

interface TresEnRayaGameProps { onClose?: () => void; }
type Mark = 'X' | 'O';
type Mode = 'pvp' | 'cpu';
type Result = Mark | 'draw' | null;

const WINNING_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

const resolveBoard = (board: Array<Mark | ''>): Result => {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as Mark;
  }
  return board.every(Boolean) ? 'draw' : null;
};

const chooseCpuMove = (board: Array<Mark | ''>): number => {
  const available = board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
  for (const mark of ['O', 'X'] as Mark[]) {
    for (const index of available) {
      const trial = [...board]; trial[index] = mark;
      if (resolveBoard(trial) === mark) return index;
    }
  }
  if (!board[4]) return 4;
  return available[Math.floor(Math.random() * available.length)] ?? -1;
};

export default function TresEnRayaGame({ onClose }: TresEnRayaGameProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [board, setBoard] = useState<Array<Mark | ''>>(Array(9).fill(''));
  const [turn, setTurn] = useState<Mark>('X');
  const [result, setResult] = useState<Result>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const cpuTimer = useRef<number | null>(null);
  const { bestScore, saving, saveScore } = useGameScore('tres-en-raya', 'pidetietar-game-tres-en-raya-best-v1');

  const title = useMemo(() => {
    if (result === 'draw') return 'Empate';
    if (result) return `Gana ${result}`;
    return turn === 'X' ? 'Turno de X' : 'Turno de O';
  }, [result, turn]);

  useEffect(() => () => {
    if (cpuTimer.current) window.clearTimeout(cpuTimer.current);
  }, []);

  const startMatch = (nextMode: Mode) => {
    setMode(nextMode); setBoard(Array(9).fill('')); setTurn('X'); setResult(null);
    setScores({ X: 0, O: 0, draws: 0 });
  };

  const playMove = (index: number, mark: Mark) => {
    if (result || board[index] || (mode === 'cpu' && mark === 'X' && turn !== 'X')) return;
    const next = [...board]; next[index] = mark;
    const nextResult = resolveBoard(next);
    setBoard(next);
    if (nextResult) {
      setResult(nextResult);
      const nextScores = nextResult === 'draw'
        ? { ...scores, draws: scores.draws + 1 }
        : { ...scores, [nextResult]: scores[nextResult] + 1 };
      setScores(nextScores);
      void saveScore(nextScores.X * 3 + nextScores.O * 3 + nextScores.draws, 1);
      return;
    }
    setTurn(mark === 'X' ? 'O' : 'X');
  };

  useEffect(() => {
    if (mode !== 'cpu' || turn !== 'O' || result) return undefined;
    cpuTimer.current = window.setTimeout(() => {
      const move = chooseCpuMove(board);
      if (move >= 0) playMove(move, 'O');
    }, 420);
    return () => { if (cpuTimer.current) window.clearTimeout(cpuTimer.current); };
  }, [board, mode, result, turn]);

  const newRound = () => { setBoard(Array(9).fill('')); setTurn('X'); setResult(null); };
  const score = scores.X * 3 + scores.O * 3 + scores.draws;

  return (
    <section className="pidetietar-tres-en-raya" aria-label="Juego Tres en raya">
      {!mode ? (
        <div className="pidetietar-tres-en-raya__panel">
          <span className="pidetietar-tres-en-raya__eyebrow">PideTiétar Play</span>
          <h2>Tres en raya</h2>
          <p>Elige una modalidad y consigue tres símbolos en línea.</p>
          <div className="pidetietar-tres-en-raya__actions">
            <button type="button" onClick={() => startMatch('pvp')}><UsersRound /> Dos jugadores</button>
            <button type="button" onClick={() => startMatch('cpu')}><UserRound /> Contra la máquina</button>
          </div>
          <small>Récord de sesión: {bestScore} puntos</small>
        </div>
      ) : (
        <div className="pidetietar-tres-en-raya__game">
          <div className="pidetietar-tres-en-raya__topline">
            <div><span className="pidetietar-tres-en-raya__eyebrow">{mode === 'cpu' ? 'Jugador contra CPU' : 'Dos jugadores'}</span><h2>{title}</h2></div>
            <button type="button" className="pidetietar-tres-en-raya__icon-button" onClick={onClose} aria-label="Salir"><X /></button>
          </div>
          <div className="pidetietar-tres-en-raya__score"><span>X: {scores.X}</span><span>O: {scores.O}</span><span>Empates: {scores.draws}</span></div>
          <div className="pidetietar-tres-en-raya__board" role="grid" aria-label="Tablero de Tres en raya">
            {board.map((mark, index) => (
              <button key={index} type="button" role="gridcell" aria-label={mark ? `Casilla ${index + 1}: ${mark}` : `Casilla ${index + 1}: vacía`} className={`pidetietar-tres-en-raya__cell ${mark ? `is-${mark.toLowerCase()}` : ''}`} onClick={() => playMove(index, 'X')} disabled={Boolean(mark) || Boolean(result) || (mode === 'cpu' && turn === 'O')}>
                {mark}
              </button>
            ))}
          </div>
          <p className="pidetietar-tres-en-raya__hint">Puntuación de la partida: {score}{saving ? ' · Guardando…' : ''}</p>
          {result && <button type="button" className="pidetietar-tres-en-raya__primary" onClick={newRound}><RotateCcw /> Siguiente ronda</button>}
          <button type="button" className="pidetietar-tres-en-raya__secondary" onClick={() => setMode(null)}>Cambiar modalidad</button>
        </div>
      )}
    </section>
  );
}
