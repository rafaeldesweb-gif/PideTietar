/**
 * Registro central de juegos de "PideTietar Play".
 *
 * Cada juego disponible en la sección de juegos se declara aquí con su
 * identificador, nombre visible, descripción, portada (imagen de inicio),
 * categoría, color de marca y carga lazy del componente React.
 *
 * Para añadir un nuevo juego:
 * 1. Crea su carpeta en src/games/<juego>/ con su componente default export.
 * 2. Coloca su portada en public/assets/games/<id>/icon.jpg o icon.webp.
 * 3. Añade una entrada a GAMES_REGISTRY con un id único, su título y su imagen.
 * 4. El hub, la navegación y los rankings se actualizan solos a partir de este registro.
 */

import type { ComponentType } from 'react';

export interface GameEntry {
  /** Identificador único usado en las URLs de API (/game/score?game=...) y hash. */
  id: string;
  /** Nombre visible del juego (pantalla de inicio, clasificación, tarjetas…). */
  title: string;
  /** Descripción corta mostrada en la tarjeta del catálogo. */
  description: string;
  /** Ruta de la portada del juego (imagen-enlace de la home). */
  image: string;
  /** Nombre del componente de lucide-react que se usará como ícono del juego (opcional, solo para el hub antiguo). */
  icon?: string;
  /** Categoría del juego (arcade, carreras, puzle, reflejos…). */
  category: string;
  /** Color de marca del juego (usado en la tarjeta y el enlace activo). */
  color: string;
  /** Si el juego ya está implementado y se puede jugar. */
  available: boolean;
  /** Función que importa perezosamente el componente del juego (solo si available). */
  lazy?: () => Promise<ComponentType<any>>;
}

/**
 * Catálogo de juegos de PideTietar Play.
 */
export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'reparto-express',
    title: 'Reparto Express',
    description:
      'Conduce la moto por la carretera del valle, recoge bolsas y salta obstáculos para completar los cinco niveles.',
    image: '/assets/games/reparto-express/icon.webp',
    category: 'Arcade',
    color: '#ff7a00',
    icon: 'Gamepad2',
    available: true,
    lazy: () =>
      import('./RepartoExpress/RepartoExpress').then((m) => m.default),
  },
  {
    id: 'burbujas',
    title: 'Burbujas',
    description: 'Dispara burbujas de colores y forma grupos de tres o más para reventarlas.',
    image: '/assets/games/burbujas/icon.webp',
    category: 'Arcade',
    color: '#c084fc',
    icon: 'Sparkles',
    available: true,
    lazy: () =>
      import('./pide-bubble').then((m) => m.PideBubble as import('react').ComponentType<any>),
  },
  {
    id: 'pide-blocks',
    title: 'Blocks',
    description: 'Coloca bloques de colores y completa líneas para sumar puntos.',
    image: '/assets/games/pide-blocks/icon.webp',
    category: 'Puzle',
    color: '#06b6d4',
    icon: 'Grid',
    available: true,
    lazy: () =>
      import('./pide-blocks').then((m) => m.PideBlocks as import('react').ComponentType<any>),
  },
  {
    id: 'rompecabezas',
    title: 'Rompecabezas',
    description: 'Arma los paisajes del Valle del Tiétar pieza a pieza a lo largo de cinco niveles.',
    image: '/assets/games/rompecabezas/icon.webp',
    category: 'Puzle',
    color: '#f59e0b',
    icon: 'Puzzle',
    available: true,
    lazy: () =>
      import('./pide-rompecabezas').then(
        (m) => m.PideRompecabezas as import('react').ComponentType<any>,
      ),
  },
  {
    id: 'breakout',
    title: 'Breakout',
    description: 'Rompe los bloques con la pala y supera los modos clásico y arcade.',
    image: '/assets/games/breakout/icon.jpg',
    category: 'Arcade',
    color: '#00cfff',
    icon: 'Zap',
    available: true,
    lazy: () => import('./BreakoutGame').then((m) => m.default),
  },
  {
    id: 'tres-en-raya',
    title: 'Tres en raya',
    description: 'Juega contra otra persona o reta a la máquina y consigue tres en línea.',
    image: '/assets/games/tres-en-raya/icon.jpg',
    category: 'Estrategia',
    color: '#ff9d00',
    icon: 'Grid3X3',
    available: true,
    lazy: () => import('./TresEnRayaGame').then((m) => m.default),
  },
  {
    id: 'times-tables-sprint',
    title: 'Times Tables Sprint',
    description: 'Responde operaciones de multiplicar durante un sprint de 60 segundos.',
    image: '/assets/games/times-tables-sprint/icon.jpg',
    category: 'Educativo',
    color: '#00cfff',
    icon: 'Calculator',
    available: true,
    lazy: () => import('./TimesTablesSprintGame').then((m) => m.default),
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    description: 'Ayuda al pájaro a volar entre los tubos y supera tu récord.',
    image: '/assets/games/flappy-bird/icon.jpg',
    category: 'Reflejos',
    color: '#ffd447',
    icon: 'Bird',
    available: true,
    lazy: () => import('./FlappyBirdGame').then((m) => m.default),
  },
  {
    id: 'asteroids-html5',
    title: 'Asteroids HTML5',
    description: 'Controla la nave, dispara a los asteroides y sobrevive en el espacio.',
    image: '/assets/games/asteroids-html5/icon.jpg',
    category: 'Arcade',
    color: '#b86cff',
    icon: 'Orbit',
    available: true,
    lazy: () => import('./AsteroidsHtml5Game').then((m) => m.default),
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    description: 'Defiende tu nave, elimina las filas invasoras y consigue la mayor puntuación.',
    image: '/assets/games/space-invaders/icon.jpg',
    category: 'Arcade',
    color: '#00e5ff',
    icon: 'Zap',
    available: true,
    lazy: () => import('./SpaceInvadersGame').then((m) => m.default),
  },
  {
    id: 'classic-puzzle',
    title: 'Classic Puzzle',
    description: 'Ordena las 15 fichas deslizantes hasta reconstruir el tablero.',
    image: '/assets/games/classic-puzzle/icon.jpg',
    category: 'Puzle',
    color: '#00cfff',
    icon: 'Grid3X3',
    available: true,
    lazy: () => import('./ClassicPuzzleGame').then((m) => m.default),
  },
  {
    id: 'memory-html',
    title: 'Memory HTML',
    description: 'Encuentra las seis parejas y consigue el mejor tiempo y número de movimientos.',
    image: '/assets/games/memory-html/icon.jpg',
    category: 'Memoria',
    color: '#c084fc',
    icon: 'Grid3X3',
    available: true,
    lazy: () => import('./MemoryHtmlGame').then((m) => m.default),
  },
];

/**
 * Busca un juego del registro por su id. Devuelve undefined si no existe.
 */
export const findGameById = (id: string): GameEntry | undefined =>
  GAMES_REGISTRY.find((game) => game.id === id);

/**
 * Devuelve el ícono de un juego por nombre de componente de lucide-react.
 * Se resuelve dinámicamente para evitar importar todo lucide en el hub.
 */
export const resolveGameIcon = (iconName: string): ComponentType<any> | null => {
  const lucideIcons: Record<string, ComponentType<any>> = {
    Gamepad2: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Gamepad2 ?? null;
      } catch {
        return null;
      }
    })(),
    Zap: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Zap ?? null;
      } catch {
        return null;
      }
    })(),
    Grid3X3: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Grid3X3 ?? null;
      } catch {
        return null;
      }
    })(),
    Calculator: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Calculator ?? null;
      } catch {
        return null;
      }
    })(),
    Bird: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Bird ?? null;
      } catch {
        return null;
      }
    })(),
    Orbit: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('lucide-react');
        return mod.Orbit ?? null;
      } catch {
        return null;
      }
    })(),
  };
  return lucideIcons[iconName] ?? null;
};
