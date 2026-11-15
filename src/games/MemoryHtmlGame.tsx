import React, { useEffect, useState } from 'react';
import { Clock3, RotateCcw, X } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './MemoryHtmlGame.css';

interface MemoryHtmlGameProps { onClose?: () => void; }
interface Card { id: number; symbol: string; revealed: boolean; matched: boolean; }
const createDeck = (): Card[] => ['★', '★', '♥', '♥', '☾', '☾', '◆', '◆', '●', '●', '✦', '✦'].sort(() => Math.random() - .5).map((symbol, id) => ({ id, symbol, revealed: false, matched: false }));

export default function MemoryHtmlGame({ onClose }: MemoryHtmlGameProps) {
  const [cards, setCards] = useState<Card[]>(createDeck);
  const [first, setFirst] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const { bestScore, saving, saveScore } = useGameScore('memory-html', 'pidetietar-game-memory-html-best-v1');
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onClose]);
  useEffect(() => { if (!started || finished) return undefined; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [finished, started]);
  const newGame = () => { setCards(createDeck()); setFirst(null); setBusy(false); setStarted(true); setFinished(false); setSeconds(0); setMoves(0); };
  const chooseCard = (index: number) => {
    if (!started || finished || busy) return;
    const selected = cards[index]; if (!selected || selected.revealed || selected.matched) return;
    const revealed = cards.map((card, cardIndex) => cardIndex === index ? { ...card, revealed: true } : card);
    if (first === null) { setCards(revealed); setFirst(index); return; }
    const previous = first; const nextMoves = moves + 1; setFirst(null); setMoves(nextMoves);
    if (cards[previous]?.symbol === selected.symbol) {
      const matched = revealed.map((card, cardIndex) => cardIndex === index || cardIndex === previous ? { ...card, matched: true } : card); setCards(matched);
      if (matched.every((card) => card.matched)) { const score = Math.max(10, 1400 - seconds * 20 - nextMoves * 12); setFinished(true); void saveScore(score, 1); }
      return;
    }
    setCards(revealed); setBusy(true); window.setTimeout(() => { setCards((current) => current.map((card, cardIndex) => cardIndex === index || cardIndex === previous ? { ...card, revealed: false } : card)); setBusy(false); }, 700);
  };
  const currentScore = Math.max(10, 1400 - seconds * 20 - moves * 12);
  return <section className="pidetietar-memory-html" aria-label="Juego Memory HTML"><div className="pidetietar-memory-html__card"><header><div><span>PideTiétar Play</span><h2>Memory HTML</h2></div><button type="button" aria-label="Salir de Memory HTML" onClick={onClose}><X /></button></header><div className="pidetietar-memory-html__stats"><span><Clock3 /> {seconds}s</span><span>Movimientos <b>{moves}</b></span><span>Récord <b>{bestScore}</b></span></div><div className="pidetietar-memory-html__board">{cards.map((card, index) => <button type="button" key={card.id} aria-label={card.revealed || card.matched ? `Carta ${card.symbol}` : 'Carta oculta'} className={card.revealed || card.matched ? 'is-open' : ''} onClick={() => chooseCard(index)}>{card.revealed || card.matched ? card.symbol : '?'}</button>)}</div>{!started && <button type="button" className="pidetietar-memory-html__primary" onClick={newGame}><RotateCcw /> Empezar</button>}{finished && <div className="pidetietar-memory-html__success"><b>¡Has encontrado todas las parejas!</b><small>Puntuación: {currentScore}{saving ? ' · Guardando…' : ''}</small><button type="button" onClick={newGame}><RotateCcw /> Nueva partida</button></div>}<small className="pidetietar-memory-html__hint">Encuentra las seis parejas con el menor número de movimientos.</small></div></section>;
}
