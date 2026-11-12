/**
 * Registro central de juegos de "PideTietar Play".
 *
 * Cada juego disponible en la sección de juegos se declara aquí con su
 * identificador, nombre visible, descripción, portada (imagen de inicio),
 * categoría, color de marca y carga lazy del componente React.
 *
 * Para añadir un nuevo juego:
 * 1. Crea su carpeta en src/games/<juego>/ con su componente default export.
 * 2. Coloca su portada en public/assets/games/<id>/icon.png.
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
 * El primero es "Reparto Express" (el juego existente). Los demás se añaden
 * con su portada; no tienen componente propio aún y muestran "Próximamente".
 */
export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'reparto-express',
    title: 'Reparto Express',
    description:
      'Conduce la moto por la carretera del valle, recoge bolsas y salta obstáculos para completar los cinco niveles.',
    image: '/assets/games/reparto-express/icon.png',
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
    image: '/assets/games/burbujas/icon.png',
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
    image: '/assets/games/pide-blocks/icon.png',
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
    image: '/assets/games/rompecabezas/icon.png',
    category: 'Puzle',
    color: '#f59e0b',
    icon: 'Puzzle',
    available: true,
    lazy: () =>
      import('./pide-rompecabezas').then(
        (m) => m.PideRompecabezas as import('react').ComponentType<any>,
      ),
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
  };
  return lucideIcons[iconName] ?? null;
};
