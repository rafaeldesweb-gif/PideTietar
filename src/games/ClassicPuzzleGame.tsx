import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './ClassicPuzzleGame.css';

interface ClassicPuzzleGameProps { onClose?: () => void; }
const SOLVED = Array.from({ length: 15 }, (_, index) => index + 1).concat(0);
const neighbours = (index: number, empty: number) => { const row = Math.floor(index / 4); const column = index % 4; const emptyRow = Math.floor(empty / 4); const emptyColumn = empty % 4; return Math.abs(row - emptyRow) + Math.abs(column - emptyColumn) === 1; };
const shufflePuzzle = () => { let board = [...SOLVED]; let empty = 15; for (let step = 0; step < 90; step += 1) { const options = board.map((_, index) => index).filter((index) => neighbours(index, empty)); const index = options[Math.floor(Math.random() * options.length)]; [board[index], board[empty]] = [board[empty], board[index]]; empty = index; } return board; };

export default function ClassicPuzzleGame({ onClose }: ClassicPuzzleGameProps) {
  const [tiles, setTiles] = useState<number[]>(shufflePuzzle);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const { bestScore, saving, saveScore } = useGameScore('classic-puzzle', 'pidetietar-game-classic-puzzle-best-v1');
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onClose]);
  const newGame = useCallback(() => { setTiles(shufflePuzzle()); setMoves(0); setStarted(true); setFinished(false); }, []);
  const moveTile = (index: number) => { if (!started || finished) return; const empty = tiles.indexOf(0); if (!neighbours(index, empty)) return; const next = [...tiles]; [next[index], next[empty]] = [next[empty], next[index]]; const nextMoves = moves + 1; setTiles(next); setMoves(nextMoves); if (next.every((tile, tileIndex) => tile === SOLVED[tileIndex])) { const score = Math.max(10, 1200 - nextMoves * 8); setFinished(true); void saveScore(score, 1); } };
  return <section className="pidetietar-classic-puzzle" aria-label="Juego Classic Puzzle"><div className="pidetietar-classic-puzzle__card"><header><div><span>PideTiétar Play</span><h2>Classic Puzzle</h2></div><button type="button" aria-label="Salir de Classic Puzzle" onClick={onClose}><X /></button></header><p>Ordena las 15 piezas dejando libre un espacio.</p><div className="pidetietar-classic-puzzle__board">{tiles.map((tile, index) => <button key={`${tile}-${index}`} type="button" aria-label={tile === 0 ? 'Espacio vacío' : `Ficha ${tile}`} className={tile === 0 ? 'is-empty' : ''} onClick={() => moveTile(index)}>{tile || ''}</button>)}</div><div className="pidetietar-classic-puzzle__stats"><span>Movimientos <b>{moves}</b></span><span>Récord <b>{bestScore}</b></span></div>{!started && <button type="button" className="pidetietar-classic-puzzle__primary" onClick={newGame}><RotateCcw /> Empezar</button>}{finished && <div className="pidetietar-classic-puzzle__success"><b>¡Puzzle completado!</b><small>Puntuación: {Math.max(10, 1200 - moves * 8)}{saving ? ' · Guardando…' : ''}</small><button type="button" onClick={newGame}><RotateCcw /> Nueva partida</button></div>}<small className="pidetietar-classic-puzzle__hint">Pulsa una ficha vecina al espacio vacío.</small></div></section>;
}
