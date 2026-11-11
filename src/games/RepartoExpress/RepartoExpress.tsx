import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Pause,
  Play,
  X,
  ChevronLeft,
  ArrowUp,
  ChevronRight,
  Clock,
  Star,
  BarChart3,
  ShoppingBag,
  Trophy,
  Gamepad2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { apiFetch } from "../../context/AppContext";
import { ProjectLogo } from "../../components/ProjectLogo";
import { MediaView } from "../../components/MediaView";
import { sessionStore } from "../../utils/browserSession";
import {
  GAME_ID,
  DEFAULT_DURATION_SECONDS,
  LEVEL_RULES,
  LOCAL_RECORD_KEY,
  LOCAL_LEVEL_KEY,
  LEGACY_RECORD_KEY,
  LEGACY_LEVEL_KEY,
  MAX_SCORE_PER_GAME,
} from "./gameConstants";
import type { GameLeaderboard, GameLeaderboardEntry } from "../../types";
import {
  init,
  start,
  pause,
  resume,
  togglePause,
  stop,
  moveLeft,
  moveRight,
  toggleJump,
  setCallbacks,
} from "./useGameEngine";
import "./RepartoExpress.css";

interface RepartoExpressProps {
  onClose?: () => void;
}

/**
 * Reparto Express – minijuego integrado en PideTiétar.
 *
 * Objetivo: completar cinco niveles recogiendo la meta de bolsas de cada uno.
 * La carretera acelera un 10 % cada 10 segundos de juego en cada nivel.
 *
 * - Canvas a pantalla completa.
 * - Estética arcade brillante copiada de la referencia: HUD acristalado,
 *   botones circulares glossy y marco neón.
 * - Récord y nivel en /game/score (BD) o en la sesión del navegador (invitado).
 */

const START_TAB = {
  info: "info",
  ranking: "ranking",
} as const;

type StartTab = (typeof START_TAB)[keyof typeof START_TAB];

const LEADERBOARD_LIMIT = 25;

export default function RepartoExpress({ onClose }: RepartoExpressProps) {
  const { currentUser, showNotification } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bestScoreRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Estado lento (cambia en transiciones de pantalla): pantalla actual y datos finales.
  const [screen, setScreen] = useState("start"); // start | playing | paused | gameover | victory
  const [durationSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [finalDeliveries, setFinalDeliveries] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [bestLevel, setBestLevel] = useState(1);
  const [newRecord, setNewRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startTab, setStartTab] = useState<StartTab>(START_TAB.info);
  const [leaders, setLeaders] = useState<GameLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<GameLeaderboardEntry | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // Estado rápido (cambia cada frame del juego): se guarda en refs para evitar
  // re-renders de React en cada fotograma del canvas. El HUD se sincroniza
  // desde los callbacks del motor sin forzar render de todo el componente.
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const deliveriesRef = useRef(0);
  const levelBagsRef = useRef(0);
  const timeRemainingRef = useRef(DEFAULT_DURATION_SECONDS);

  const targetBags = LEVEL_RULES[levelRef.current - 1].bags;

  // Récord de invitado en la sesión del navegador: AGENTS.md reserva
  // localStorage para preferencias y las claves antiguas se migran una vez.
  useEffect(() => {
    try {
      const legacyScore = window.localStorage.getItem(LEGACY_RECORD_KEY);
      const legacyLevel = window.localStorage.getItem(LEGACY_LEVEL_KEY);
      if (legacyScore && !sessionStore.getItem(LOCAL_RECORD_KEY)) {
        sessionStore.setItem(LOCAL_RECORD_KEY, legacyScore);
      }
      if (legacyLevel && !sessionStore.getItem(LOCAL_LEVEL_KEY)) {
        sessionStore.setItem(LOCAL_LEVEL_KEY, legacyLevel);
      }
      window.localStorage.removeItem(LEGACY_RECORD_KEY);
      window.localStorage.removeItem(LEGACY_LEVEL_KEY);

      const saved = sessionStore.getItem(LOCAL_RECORD_KEY);
      const savedLevel = sessionStore.getItem(LOCAL_LEVEL_KEY);
      if (saved) setBestScore(Number(saved));
      if (savedLevel) setBestLevel(Number(savedLevel));
    } catch { /* Almacenamiento bloqueado */ }

    if (!currentUser) return;
    const loadFromServer = async () => {
      try {
        const data = await apiFetch(`/game/score?game=${encodeURIComponent(GAME_ID)}`);
        if (data && typeof data.bestScore === "number") setBestScore(data.bestScore);
        if (data && typeof data.bestLevel === "number") setBestLevel(data.bestLevel);
      } catch {
        // Si falla (401, red, etc.) se queda el récord de la sesión.
      }
    };
    void loadFromServer();
  }, [currentUser]);

  const loadLeaderboard = useCallback(async () => {
    if (!currentUser) {
      setLeaders([]);
      setMyRank(null);
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const data = (await apiFetch(
        `/game/leaderboard?game=${encodeURIComponent(GAME_ID)}&limit=${LEADERBOARD_LIMIT}`,
      )) as GameLeaderboard;
      setLeaders(Array.isArray(data?.leaders) ? data.leaders : []);
      setMyRank(data?.me ?? null);
    } catch (error) {
      setLeaderboardError(
        error instanceof Error ? error.message : "No se pudo cargar la clasificación.",
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (screen !== "start" || startTab !== START_TAB.ranking) return;
    void loadLeaderboard();
  }, [screen, startTab, loadLeaderboard]);

  // Guardar puntuación al terminar la partida
  const saveScore = useCallback(
    async (finalScore: number, finalLevel: number) => {
      if (finalScore > MAX_SCORE_PER_GAME) return;

      try {
        // Siempre guardar el último puntaje y nivel alcanzados, sean mejores
        // o peores que los previos. Esos son los que se publican y se usan
        // para la posición en la clasificación.
        sessionStore.setItem(LOCAL_RECORD_KEY, String(finalScore));
        sessionStore.setItem(LOCAL_LEVEL_KEY, String(finalLevel));
        setBestScore(finalScore);
        setBestLevel(finalLevel);
      } catch { /* Almacenamiento bloqueado */ }

      if (currentUser) {
        setSaving(true);
        try {
          await apiFetch("/game/score", {
            method: "POST",
            body: JSON.stringify({
              game: GAME_ID,
              score: finalScore,
              level_reached: finalLevel,
            }),
          });
          showNotification("Puntuación guardada en tu perfil.", "success");
          if (startTab === START_TAB.ranking) void loadLeaderboard();
        } catch (error) {
          showNotification(
            error instanceof Error ? error.message : "No se pudo guardar en el servidor.",
            "error"
          );
        } finally {
          setSaving(false);
        }
      }
    },
    [currentUser, loadLeaderboard, showNotification, startTab]
  );

  // Callbacks del motor: escriben en refs para forzar re-render de React solo en
  // transiciones de pantalla, no en cada fotograma del canvas.
  useEffect(() => {
    setCallbacks({
      onScoreChange: (s) => {
        scoreRef.current = s;
      },
      onTimeChange: (remainingMs) => {
        timeRemainingRef.current = Math.max(0, Math.ceil(remainingMs / 1000));
      },
      onLevelChange: (l) => {
        levelRef.current = l;
      },
      onDelivery: (count, inLevel) => {
        deliveriesRef.current = count;
        levelBagsRef.current = inLevel;
      },
      onGameOver: ({ score: finalScore, level: finalLevel, deliveries: finalCount, victory: won }) => {
        scoreRef.current = finalScore;
        levelRef.current = finalLevel;
        setFinalDeliveries(finalCount);
        setNewRecord(finalScore > bestScoreRef.current);
        setScreen(won ? "victory" : "gameover");
        void saveScore(finalScore, finalLevel);
      },
    });
  }, [saveScore]);

  // Inicializar canvas al montar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    init(canvas, { durationSeconds });
  }, [durationSeconds]);

  // Pausa automática al cambiar de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (screen === "playing" && document.visibilityState === "hidden") {
        pause();
        setScreen("paused");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [screen]);

  // Teclado (PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== "playing" && screen !== "paused") return;
      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        toggleJump();
      }
      if (e.key === "Escape" && screen === "playing") {
        togglePause();
        setScreen("paused");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen]);

  // Bloquear scroll del body mientras se juega
  useEffect(() => {
    const isOpen = screen !== "start" && screen !== "gameover" && screen !== "victory";
    if (isOpen) document.body.classList.add("game-open");
    else document.body.classList.remove("game-open");
    return () => document.body.classList.remove("game-open");
  }, [screen]);

  const beginRound = () => {
    setScreen("playing");
    scoreRef.current = 0;
    levelRef.current = 1;
    deliveriesRef.current = 0;
    levelBagsRef.current = 0;
    setFinalDeliveries(0);
    setNewRecord(false);
    timeRemainingRef.current = durationSeconds;
    start();
  };

  const handleTogglePause = () => {
    if (screen === "playing") {
      pause();
      setScreen("paused");
    } else if (screen === "paused") {
      resume();
      setScreen("playing");
    }
  };

  const handleExit = () => {
    stop();
    if (onClose) onClose();
    else setScreen("start");
  };

  // Gestos táctiles: deslizar en horizontal cambia de carril y hacia arriba salta.
  // Los botones de la interfaz conservan su propio `onClick` y se ignoran aquí.
  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (screen !== "playing") return;
    if ((event.target as HTMLElement).closest("button")) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || screen !== "playing") return;
    if (performance.now() - start.time > 700) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 28) return;
    if (absX > absY) {
      if (dx < 0) moveLeft();
      else moveRight();
    } else if (dy < 0) {
      toggleJump();
    }
  };

  return (
    <section
      className="reparto-express-overlay"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { swipeStartRef.current = null; }}
    >
      {/* Canvas a pantalla completa */}
      <canvas ref={canvasRef} className="reparto-express-canvas" aria-hidden="true" />

      {/* Marco neón exterior */}
      <div className="reparto-express-frame" aria-hidden="true" />

      {/* UI sobre el canvas */}
      <div className="reparto-express-ui">
        <div className="reparto-express-header" aria-hidden="true" />
        {/* Cabecera de marca: la referencia coloca el logotipo sobre la
            carretera, antes de los paneles de juego. */}
        <div className="reparto-express-brand" aria-label="PideTiétar">
          <ProjectLogo variant="split" alt="PideTiétar" />
        </div>

        {/* Barra superior: pausa/inicio a la izquierda, cerrar a la derecha */}
        <div className="reparto-express-topbar">
          <button
            className="reparto-express-btn pause"
            onClick={screen === "playing" || screen === "paused" ? handleTogglePause : beginRound}
            title={screen === "playing" ? "Pausar" : screen === "paused" ? "Reanudar" : "Jugar"}
            aria-label={screen === "playing" ? "Pausar juego" : screen === "paused" ? "Reanudar juego" : "Jugar"}
          >
            {screen === "playing" ? <Pause /> : <Play />}
          </button>
          <button
            className="reparto-express-btn close"
            onClick={handleExit}
            title="Cerrar juego"
            aria-label="Cerrar juego"
          >
            <X />
          </button>
        </div>

        {/* HUD durante la partida: tiempo, puntos, nivel y bolsas recogidas */}
        {screen === "playing" && (
          <div className="hud-wrap">
            <div className="reparto-express-hud">
              <div className="hud-panel hud-time">
                <span className="hud-label">TIEMPO</span>
                <span className="hud-value">
                  <Clock className="hud-icon" aria-hidden="true" />
                  {timeRemainingRef.current}s
                </span>
              </div>
              <div className="hud-panel hud-points">
                <span className="hud-label">PUNTOS</span>
                <span className={`hud-value ${scoreRef.current >= 10000 ? "hud-value-compact" : ""}`}>
                  <Star className="hud-icon" aria-hidden="true" />
                  {scoreRef.current}
                </span>
              </div>
              <div className="hud-panel hud-level">
                <span className="hud-label">NIVEL</span>
                <span className="hud-value">
                  <BarChart3 className="hud-icon" aria-hidden="true" />
                  {levelRef.current}
                </span>
              </div>
              <div className="hud-panel hud-bags" role="status" aria-live="polite" aria-label={`Bolsas del nivel ${levelRef.current}: ${levelBagsRef.current} de ${LEVEL_RULES[levelRef.current - 1].bags}. Total: ${deliveriesRef.current}.`}>
                <span className="hud-label">BOLSAS</span>
                <span className="hud-value">
                  <ShoppingBag className="hud-icon" aria-hidden="true" />
                  {levelBagsRef.current}<span className="hud-goal">/{LEVEL_RULES[levelRef.current - 1].bags}</span>
                </span>
              </div>
            </div>
            <div className="hud-dashes" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {/* Controles táctiles abajo centrado */}
        <div className="reparto-express-controls">
          <button
            className="reparto-express-btn move"
            onClick={moveLeft}
            aria-label="Mover izquierda"
          >
            <ChevronLeft />
          </button>
          <button
            className="reparto-express-btn jump"
            onClick={toggleJump}
            aria-label="Saltar"
          >
            <ArrowUp />
          </button>
          <button
            className="reparto-express-btn move"
            onClick={moveRight}
            aria-label="Mover derecha"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Pantalla de inicio */}
        <div className={`reparto-express-screen start-screen ${screen !== "start" ? "hidden" : ""}`}>
          <div className="start-game-logo" aria-label="PideTiétar">
            <img
              src="/PideTietar_logo_animado.gif"
              alt="Logo animado de PideTiétar"
            />
          </div>
          <div className="reparto-express-card">
            <h2>Reparto Express</h2>
            <div className="reparto-tabs" role="tablist" aria-label="Información del juego">
              <button
                type="button"
                role="tab"
                aria-selected={startTab === START_TAB.info}
                className={startTab === START_TAB.info ? "is-active" : ""}
                onClick={() => setStartTab(START_TAB.info)}
              >
                <Gamepad2 aria-hidden="true" />
                Cómo jugar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={startTab === START_TAB.ranking}
                className={startTab === START_TAB.ranking ? "is-active" : ""}
                onClick={() => setStartTab(START_TAB.ranking)}
              >
                <Trophy aria-hidden="true" />
                Clasificación
              </button>
            </div>

            {startTab === START_TAB.info ? (
              <>
                <p>
                  Completa cinco niveles recogiendo las bolsas de cada nivel.
                  Salta por encima de conos, motos, reductores y señales de obras,
                  cambio de sentido o paso cerrado. Cada cubierto añade 3 segundos.
                </p>
                <div className="stats">
                  <div className="stat">
                    <span>Mejor puntuación</span>
                    <span className="value">{bestScore}</span>
                  </div>
                  <div className="stat">
                    <span>Nivel alcanzado</span>
                    <span className="value">{bestLevel}</span>
                  </div>
                  <div className="stat">
                    <span>Tiempo por nivel</span>
                    <span className="value">{durationSeconds}s</span>
                  </div>
                </div>
                <p className="reparto-express-hint">
                  {currentUser
                    ? "Récord sincronizado con tu cuenta."
                    : "Modo invitado: el récord dura lo que esta pestaña."}
                </p>
              </>
            ) : (
              <div className="reparto-ranking" role="tabpanel">
                {!currentUser ? (
                  <p className="reparto-express-hint">
                    Inicia sesión para comparar tu récord con el resto del valle.
                  </p>
                ) : leaderboardLoading ? (
                  <p className="reparto-express-hint">Cargando clasificación…</p>
                ) : leaderboardError ? (
                  <p className="reparto-express-hint">{leaderboardError}</p>
                ) : leaders.length === 0 ? (
                  <p className="reparto-express-hint">Todavía no hay partidas. ¡Sé el primero!</p>
                ) : (
                  <ol className="reparto-ranking-list">
                    {leaders.map((entry) => (
                      <li
                        key={entry.userId}
                        className={entry.userId === currentUser.id ? "is-me" : ""}
                      >
                        <span className="reparto-ranking-pos">{entry.position}</span>
                        <MediaView
                          src={entry.avatarUrl}
                          defaultSrc="/Logo.png"
                          alt={entry.name}
                          className="reparto-ranking-avatar"
                          fit="cover"
                        />
                        <div className="reparto-ranking-meta">
                          <span className="reparto-ranking-name">{entry.name}</span>
                        </div>
                        <span className="reparto-ranking-score">
                          {entry.score} pts · Lvl {entry.levelReached}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {myRank && !leaders.some((entry) => entry.userId === myRank.userId) && (
                  <p className="reparto-express-hint">
                    Tu puesto: {myRank.position} · {myRank.score} puntos
                  </p>
                )}
              </div>
            )}

            <button className="reparto-express-btn-primary" onClick={beginRound}>
              Jugar
            </button>
            <button className="reparto-express-btn-secondary" onClick={handleExit}>
              Volver
            </button>
          </div>
        </div>

        {/* Pantalla de pausa */}
        <div className={`reparto-express-screen ${screen !== "paused" ? "hidden" : ""}`}>
          <div className="reparto-express-card">
            <h2>Pausa</h2>
            <p>
              Tiempo: {timeRemainingRef.current}s · Bolsas nivel {levelRef.current}: {levelBagsRef.current}/{LEVEL_RULES[levelRef.current - 1].bags} · Puntos: {scoreRef.current}
            </p>
            <button className="reparto-express-btn-primary" onClick={handleTogglePause}>
              Continuar
            </button>
            <button className="reparto-express-btn-secondary" onClick={handleExit}>
              Salir
            </button>
          </div>
        </div>

        {/* Pantalla de fin de partida */}
        <div className={`reparto-express-screen ${screen !== "gameover" ? "hidden" : ""}`}>
          <div className="reparto-express-card">
            <h2>¡Tiempo agotado!</h2>
            <div className="stats">
              <div className="stat">
                <span>Puntuación</span>
                <span className="value">{scoreRef.current}</span>
              </div>
              <div className="stat">
                <span>Bolsas recogidas</span>
                <span className="value">{finalDeliveries}</span>
              </div>
              <div className="stat">
                <span>Nivel alcanzado</span>
                <span className="value">{levelRef.current}</span>
              </div>
            </div>
            {newRecord && <div className="record">🏆 ¡Nuevo récord personal!</div>}
            <button className="reparto-express-btn-primary" onClick={beginRound}>
              Volver a jugar
            </button>
            <button className="reparto-express-btn-secondary" onClick={handleExit}>
              Salir
            </button>
            {saving && <p className="reparto-express-save">Guardando puntuación…</p>}
          </div>
        </div>

        {/* Celebración al superar la meta de bolsas del quinto nivel. */}
        <div className={`reparto-express-screen victory-screen ${screen !== "victory" ? "hidden" : ""}`}>
          <div className="victory-effects" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => (
              <span className="victory-confetti" key={index} style={{
                left: `${(index * 37) % 100}%`,
                animationDelay: `${(index % 9) * -0.32}s`,
                animationDuration: `${2.6 + (index % 5) * 0.3}s`,
              }} />
            ))}
            <span className="victory-balloon balloon-one" />
            <span className="victory-balloon balloon-two" />
            <span className="victory-balloon balloon-three" />
            <span className="victory-balloon balloon-four" />
            <span className="victory-streamer streamer-one" />
            <span className="victory-streamer streamer-two" />
          </div>
          <div className="reparto-express-card victory-card">
            <h2>¡Has completado los 5 niveles!</h2>
            <img
              className="victory-rider"
              src="/assets/games/reparto-express/moto-victoria-neon.webp"
              alt="Repartidor en moto celebrando con los brazos levantados"
            />
            <div className="victory-score">
              <span>PUNTUACIÓN FINAL</span>
              <strong>{scoreRef.current}</strong>
            </div>
            <p>{finalDeliveries} bolsas recogidas. ¡Próximos niveles y juegos muy pronto!</p>
            {newRecord && <div className="record">🏆 ¡Nuevo récord personal!</div>}
            <button className="reparto-express-btn-primary" onClick={beginRound}>Volver a jugar</button>
            <button className="reparto-express-btn-secondary" onClick={handleExit}>Salir</button>
            {saving && <p className="reparto-express-save">Guardando puntuación…</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
