/**
 * GamePlayer – renderiza el juego seleccionado a pantalla completa.
 *
 * Carga perezosamente el componente del juego desde GAMES_REGISTRY y lo
 * envuelve en un contenedor a pantalla completa con cabecera de vuelta y un
 * Error Boundary para que, si el juego falla al montar, el usuario vea el
 * error en lugar de una pantalla en blanco.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { findGameById } from '../games/registry';
import { GameErrorBoundary } from './GameErrorBoundary';

interface GamePlayerProps {
  /** Identificador del juego a renderizar. */
  gameId: string;
  /** Cierra el juego y vuelve a la portada. */
  onClose: () => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({ gameId, onClose }) => {
  const game = findGameById(gameId);
  const { currentUser } = useApp();
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!game) {
      setLoadError(`Juego no encontrado: ${gameId}`);
      setLoading(false);
      return;
    }
    if (!game.available) {
      setLoadError(`El juego ${game.title} no está disponible todavía`);
      setLoading(false);
      return;
    }
    if (!game.lazy) {
      setLoadError(`El juego ${game.title} no tiene componente implementado`);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setComponent(null);

    game.lazy()
      .then((m: any) => {
        const comp = m.default ?? m;
        // Los componentes son funciones: guardarlos directamente en el estado
        // haría que React los interpretara como actualizadores (`prev => next`)
        // y los invocara con el estado anterior (null). El envoltorio evita ese
        // error, que dejaba la pantalla en blanco al abrir cualquier juego.
        setComponent(() => comp);
        setLoading(false);
      })
      .catch((err: any) => {
        setLoadError(`Error cargando ${game.title}: ${err?.message ?? String(err)}`);
        setLoading(false);
      });
  }, [game, gameId]);

  if (!game) return null;

  // Si falló la carga del módulo, mostrar el error
  if (loadError) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#061033] text-white flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#061033]/80 backdrop-blur-md z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 hover:text-stone-300 transition"
          >
            <ArrowLeft className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium text-stone-300">Volver</span>
          </button>
          <h1 className="text-lg font-bold">{game.title}</h1>
          <div className="w-10" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#061033] text-white p-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold mb-2">No se pudo cargar el juego</h2>
          <p className="text-stone-400 text-sm mb-6">{loadError}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-[#0ea5e9] text-white font-semibold hover:bg-[#0ea5e9]/90 transition"
          >
            Volver a PideTietar Play
          </button>
        </div>
      </div>
    );
  }

  // Si no hay sesión, mostrar aviso
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#061033] text-white flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#061033]/80 backdrop-blur-md z-20">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 hover:text-stone-300 transition"
          >
            <ArrowLeft className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium text-stone-300">Volver</span>
          </button>
          <h1 className="text-lg font-bold">{game.title}</h1>
          <div className="w-10" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#061033] text-white p-6 text-center max-w-md mx-auto">
          <p className="text-amber-400 text-sm mb-6">
            Necesitas iniciar sesión para jugar a {game.title}.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-[#0ea5e9] text-white font-semibold hover:bg-[#0ea5e9]/90 transition"
          >
            Volver a PideTietar Play
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#061033] text-white flex flex-col">
      {/* Cabecera de vuelta */ }
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#061033]/80 backdrop-blur-md z-20">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 hover:text-stone-300 transition"
        >
          <ArrowLeft className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-300">Volver a PideTietar Play</span>
        </button>
        <h1 className="text-lg font-bold">{game.title}</h1>
        <div className="w-10" />
      </header>

      {/* Juego a pantalla completa, protegido por Error Boundary */ }
      <div className="flex-1 overflow-hidden bg-[#061033]">
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-[#061033] text-white">
            Cargando {game.title}…
          </div>
        ) : Component ? (
          <GameErrorBoundary gameTitle={game.title} onBack={onClose}>
            <Component onClose={onClose} />
          </GameErrorBoundary>
        ) : null}
      </div>
    </div>
  );
};
