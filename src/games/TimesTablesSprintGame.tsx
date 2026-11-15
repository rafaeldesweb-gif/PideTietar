import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { useGameScore } from './useGameScore';
import './TimesTablesSprintGame.css';

interface TimesTablesSprintProps { onClose?: () => void; }
type TableChoice = number | 'mixed';
interface Question { a: number; b: number; }

const makeQuestion = (table: TableChoice): Question => ({
  a: table === 'mixed' ? 2 + Math.floor(Math.random() * 11) : table,
  b: 2 + Math.floor(Math.random() * 10),
});

export default function TimesTablesSprintGame({ onClose }: TimesTablesSprintProps) {
  const [table, setTable] = useState<TableChoice>(2);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(2));
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState<'start' | 'playing' | 'finished'>('start');
  const [feedback, setFeedback] = useState('Elige una tabla y empieza el sprint.');
  const answerRef = useRef<HTMLInputElement | null>(null);
  const scoreRef = useRef(0);
  const { bestScore, saving, saveScore } = useGameScore('times-tables-sprint', 'pidetietar-game-times-tables-best-v1');

  const finish = useCallback(() => {
    setStatus('finished'); setFeedback('¡Tiempo! Revisa tu puntuación y vuelve a intentarlo.'); void saveScore(scoreRef.current, 1);
  }, [saveScore]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => { if (value <= 1) { window.clearInterval(timer); finish(); return 0; } return value - 1; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finish, status]);

  const startGame = (nextTable: TableChoice = table) => {
    setTable(nextTable); setQuestion(makeQuestion(nextTable)); setAnswer(''); setTimeLeft(60); setScore(0); scoreRef.current = 0; setStreak(0); setStatus('playing'); setFeedback('¡Responde tantas como puedas!'); window.setTimeout(() => answerRef.current?.focus(), 0);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (status !== 'playing' || answer.trim() === '') return;
    const correct = Number(answer) === question.a * question.b;
    const nextStreak = correct ? streak + 1 : 0;
    const nextScore = correct ? score + 10 + Math.min(streak, 5) * 2 : Math.max(0, score - 2);
    setScore(nextScore); scoreRef.current = nextScore; setStreak(nextStreak); setFeedback(correct ? '¡Correcto!' : `Era ${question.a * question.b}`); setQuestion(makeQuestion(table)); setAnswer(''); answerRef.current?.focus();
  };

  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose?.(); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [onClose]);

  return (
    <section className="pidetietar-times-tables" aria-label="Times Tables Sprint">
      <div className="pidetietar-times-tables__card">
        <div className="pidetietar-times-tables__header"><div><span className="pidetietar-times-tables__eyebrow">PideTiétar Play</span><h2>Times Tables Sprint</h2></div><div className="pidetietar-times-tables__timer">{timeLeft}s</div></div>
        {status === 'start' && <><p>Elige una tabla y responde durante 60 segundos.</p><div className="pidetietar-times-tables__tables">{[2,3,4,5,6,7,8,9,10,11,12].map((value) => <button key={value} type="button" className={table === value ? 'is-selected' : ''} onClick={() => setTable(value)}>×{value}</button>)}<button type="button" className={table === 'mixed' ? 'is-selected' : ''} onClick={() => setTable('mixed')}>Mixta</button></div><button type="button" className="pidetietar-times-tables__primary" onClick={() => startGame()}><Play /> Empezar</button></>}
        {status === 'playing' && <><div className="pidetietar-times-tables__question"><span>{question.a}</span><b>×</b><span>{question.b}</span><b>=</b><span>?</span></div><form onSubmit={submit} className="pidetietar-times-tables__form"><input ref={answerRef} value={answer} onChange={(event) => setAnswer(event.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" autoComplete="off" aria-label="Respuesta" /><button type="submit">Comprobar</button></form><div className="pidetietar-times-tables__stats"><span>Puntos <b>{score}</b></span><span>Racha <b>{streak}</b></span></div><p className="pidetietar-times-tables__feedback">{feedback}</p></>}
        {status === 'finished' && <div className="pidetietar-times-tables__finished"><Trophy /><h3>¡Buen sprint!</h3><p>Has conseguido <strong>{score}</strong> puntos.</p><button type="button" className="pidetietar-times-tables__primary" onClick={() => startGame()}><RotateCcw /> Volver a jugar</button>{saving && <small>Guardando puntuación…</small>}</div>}
        <div className="pidetietar-times-tables__bottom"><span>Récord: {bestScore}</span><span>Tabla: {table === 'mixed' ? 'mixta' : `×${table}`}</span></div>
      </div>
    </section>
  );
}
