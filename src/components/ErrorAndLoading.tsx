import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorPageProps {
  errorMessage?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  errorMessage = 'Ha ocurrido un error inesperado al procesar la solicitud.',
  onRetry,
  onGoHome
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-stone-900 p-8 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 text-[#A32300] dark:text-red-400 mx-auto flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mb-2">
          Ups, algo no ha salido bien
        </h2>
        
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
          {errorMessage}
        </p>

        <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-lg text-xs text-stone-500 dark:text-stone-400 text-left mb-6 font-mono">
          <span>Código de estado: </span>
          <span className="text-amber-600 font-bold">ERR_TIETAR_DISPATCH</span>
          <br />
          <span>Localidad actual: </span>Valle del Tiétar
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#FF4E00] hover:bg-[#A32300] text-white font-medium text-sm transition shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar</span>
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-sm transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Volver a la portada</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const LoadingPage: React.FC<{ message?: string }> = ({
  message = 'Preparando el valle a tu puerta...'
}) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      {/* Animated courier scooter logo pulse */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF4E00] to-[#F5BB00] flex items-center justify-center text-white shadow-lg animate-bounce">
          <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
            <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-4 7a2 2 0 012-2h4a2 2 0 012 2v2h1a1 1 0 011 1v1a2 2 0 01-2 2h-1v2h2a1 1 0 011 1v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a1 1 0 011-1h2v-2H6a2 2 0 01-2-2v-1a1 1 0 011-1h1V9zm6 7v-4h-4v4h4z" />
          </svg>
        </div>
        <div className="w-16 h-2 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto blur-[1px] opacity-70 animate-pulse mt-2" />
      </div>

      <h3 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100 mb-2">
        PideTiétar
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm animate-pulse">
        {message}
      </p>

      {/* Skeletons preview */}
      <div className="w-full max-w-sm mt-8 space-y-3">
        <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-3 bg-stone-100 dark:bg-stone-850 rounded-full w-1/2 mx-auto animate-pulse" />
      </div>
    </div>
  );
};
