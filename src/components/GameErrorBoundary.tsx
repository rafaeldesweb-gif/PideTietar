/**
 * GameErrorBoundary – captura errores de montaje de un juego y los muestra
 * en lugar de dejar la pantalla en blanco.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface GameErrorBoundaryProps {
  /** Título del juego que falló. */
  gameTitle: string;
  /** Mensaje opcional adicional. */
  message?: string;
  /** Callback para volver a PideTietar Play. */
  onBack: () => void;
  children?: ReactNode;
}

interface GameErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class GameErrorBoundary extends Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error });
    // eslint-disable-next-line no-console
    console.error(`[PideTietar Play] Error en juego "${this.props.gameTitle}":`, error, errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message ?? 'Error desconocido';
      return (
        <div className="fixed inset-0 z-[100] bg-[#061033] text-white flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#061033]/80 backdrop-blur-md z-20">
            <button
              type="button"
              onClick={this.props.onBack}
              className="flex items-center gap-2 hover:text-stone-300 transition"
            >
              <span className="text-stone-400">←</span>
              <span className="text-sm font-medium text-stone-300">Volver</span>
            </button>
            <h1 className="text-lg font-bold">{this.props.gameTitle}</h1>
            <div className="w-10" />
          </header>
          <div className="flex-1 flex flex-col items-center justify-center bg-[#061033] text-white p-6 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold mb-2">No se pudo cargar el juego</h2>
            <p className="text-stone-400 text-sm mb-4">
              {errorMsg}
            </p>
            {this.props.message && (
              <p className="text-stone-500 text-xs mb-6">{this.props.message}</p>
            )}
            <button
              type="button"
              onClick={this.props.onBack}
              className="px-6 py-2.5 rounded-lg bg-[#0ea5e9] text-white font-semibold hover:bg-[#0ea5e9]/90 transition"
            >
              Volver a PideTietar Play
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
