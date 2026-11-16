/**
 * Catálogo de los 12 niveles de Classic Puzzle.
 *
 * Cada nivel es un dibujo para niños descargado de bancos de imágenes de
 * dominio público (rawpixel, licencia CC0) y recortado a 1000 × 1000. El orden
 * va del dibujo más sencillo al más detallado: cuanto más pequeño y repetido es
 * el trazo, más difícil resulta reconstruir la imagen con las fichas.
 *
 * `grid` indica la cantidad de filas y columnas del tablero: 3 (8 fichas),
 * 4 (15 fichas) o 5 (24 fichas).
 */

export interface ClassicPuzzleLevel {
  /** Número de nivel, de 1 a 12. */
  id: number;
  /** Nombre visible del nivel. */
  name: string;
  /** Imagen de 1000 × 1000 usada en el tablero. */
  image: string;
  /** Miniatura de 240 × 240 para el selector de niveles. */
  thumbnail: string;
  /** Filas y columnas del tablero. */
  grid: number;
  /** Puntos de partida para calcular la puntuación. */
  basePoints: number;
  /** Nivel 1–5 que se envía al marcador del servidor (`level_reached`). */
  serverLevel: number;
}

export const CLASSIC_PUZZLE_LEVELS: ClassicPuzzleLevel[] = [
  {
    id: 1,
    name: 'Arcoíris de colores',
    image: '/assets/games/classic-puzzle/levels/nivel-02.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-02-thumb.jpg',
    grid: 3,
    basePoints: 400,
    serverLevel: 1,
  },
  {
    id: 2,
    name: 'Sol sonriente',
    image: '/assets/games/classic-puzzle/levels/nivel-01.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-01-thumb.jpg',
    grid: 3,
    basePoints: 450,
    serverLevel: 1,
  },
  {
    id: 3,
    name: 'Globo aerostático',
    image: '/assets/games/classic-puzzle/levels/nivel-03.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-03-thumb.jpg',
    grid: 3,
    basePoints: 500,
    serverLevel: 1,
  },
  {
    id: 4,
    name: 'Gatito curioso',
    image: '/assets/games/classic-puzzle/levels/nivel-04.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-04-thumb.jpg',
    grid: 4,
    basePoints: 700,
    serverLevel: 2,
  },
  {
    id: 5,
    name: 'Mariposa monarca',
    image: '/assets/games/classic-puzzle/levels/nivel-05.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-05-thumb.jpg',
    grid: 4,
    basePoints: 800,
    serverLevel: 2,
  },
  {
    id: 6,
    name: 'Perrito juguetón',
    image: '/assets/games/classic-puzzle/levels/nivel-06.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-06-thumb.jpg',
    grid: 4,
    basePoints: 900,
    serverLevel: 2,
  },
  {
    id: 7,
    name: 'Castillo hinchable',
    image: '/assets/games/classic-puzzle/levels/nivel-07.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-07-thumb.jpg',
    grid: 4,
    basePoints: 1000,
    serverLevel: 3,
  },
  {
    id: 8,
    name: 'Parque de toboganes',
    image: '/assets/games/classic-puzzle/levels/nivel-08.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-08-thumb.jpg',
    grid: 4,
    basePoints: 1150,
    serverLevel: 3,
  },
  {
    id: 9,
    name: 'Granja con animales',
    image: '/assets/games/classic-puzzle/levels/nivel-09.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-09-thumb.jpg',
    grid: 4,
    basePoints: 1300,
    serverLevel: 3,
  },
  {
    id: 10,
    name: 'Camino al zoo',
    image: '/assets/games/classic-puzzle/levels/nivel-10.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-10-thumb.jpg',
    grid: 5,
    basePoints: 1700,
    serverLevel: 4,
  },
  {
    id: 11,
    name: 'Parque de la ciudad',
    image: '/assets/games/classic-puzzle/levels/nivel-11.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-11-thumb.jpg',
    grid: 5,
    basePoints: 2000,
    serverLevel: 5,
  },
  {
    id: 12,
    name: 'Bosque del valle',
    image: '/assets/games/classic-puzzle/levels/nivel-12.jpg',
    thumbnail: '/assets/games/classic-puzzle/levels/nivel-12-thumb.jpg',
    grid: 5,
    basePoints: 2400,
    serverLevel: 5,
  },
];
