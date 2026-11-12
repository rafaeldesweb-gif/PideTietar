export interface PuzzleInfo {
  id: string;
  level: number; // 1 to 5
  levelIndex: number; // 0, 1, 2 (3 per level)
  title: string;
  townOrZone: string;
  description: string;
  image: string; // real local downloaded image path
  thumbnail: string;
  difficultyTone: string;
  rows: number;
  cols: number;
  totalPieces: number;
  parTime: number; // in seconds
  basePoints: number;
}

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  grid: { rows: number; cols: number; total: number };
  difficultyLabel: 'Muy Fácil' | 'Fácil' | 'Medio' | 'Desafiante' | 'Maestro';
  minStarsToUnlock: number;
  visualDetailDescription: string;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: 'Nivel 1: Siluetas Claras',
    subtitle: 'Grandes bloques de color y arquitectura nítida (Muy Fácil)',
    grid: { rows: 2, cols: 3, total: 6 },
    difficultyLabel: 'Muy Fácil',
    minStarsToUnlock: 0,
    visualDetailDescription: 'Bajo detalle visual y formas muy reconocibles para comenzar.',
  },
  {
    level: 2,
    name: 'Nivel 2: Pueblos y Castros',
    subtitle: 'Tejados tradicionales, piedras y murallas (Fácil)',
    grid: { rows: 3, cols: 4, total: 12 },
    difficultyLabel: 'Fácil',
    minStarsToUnlock: 3,
    visualDetailDescription: 'Detalle moderado con contrastes de arquitectura y monte.',
  },
  {
    level: 3,
    name: 'Nivel 3: Texturas y Cuevas',
    subtitle: 'Estalactitas doradas, sombras de sierra y nieblas (Medio)',
    grid: { rows: 4, cols: 4, total: 16 },
    difficultyLabel: 'Medio',
    minStarsToUnlock: 8,
    visualDetailDescription: 'Texturas ricas en piedra, reflejos de luz y sombras naturales.',
  },
  {
    level: 4,
    name: 'Nivel 4: Calzadas y Bosques',
    subtitle: 'Losas romanas, castañares densos y terrazas (Desafiante)',
    grid: { rows: 4, cols: 6, total: 24 },
    difficultyLabel: 'Desafiante',
    minStarsToUnlock: 15,
    visualDetailDescription: 'Alta densidad de hojas, ramas y piedras de calzada milenaria.',
  },
  {
    level: 5,
    name: 'Nivel 5: Cumbres de Gredos',
    subtitle: 'Agujas de granito, circo glaciar y cabra montés (Maestro)',
    grid: { rows: 6, cols: 6, total: 36 },
    difficultyLabel: 'Maestro',
    minStarsToUnlock: 24,
    visualDetailDescription: 'Máxima complejidad de detalle con pedreras, crestas y fauna salvaje.',
  },
];

// The 15 iconic Valle del Tiétar photographs, strictly matched to difficulty
export const PUZZLES: PuzzleInfo[] = [
  // ==========================================
  // NIVEL 1: 6 piezas (2x3) - Siluetas claras, bajo detalle
  // ==========================================
  {
    id: 'l1_p1',
    level: 1,
    levelIndex: 0,
    title: 'Castillo de la Triste Condesa',
    townOrZone: 'Arenas de San Pedro',
    description: 'Imponente fortaleza del siglo XIV con grandes lienzos de muralla y almenas claras de fácil lectura.',
    image: '/assets/games/rompecabezas/tietar/l1_p1_castillo_arenas.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l1_p1_castillo_arenas.jpg',
    difficultyTone: 'Formas arquitectónicas grandes y cielo despejado',
    rows: 2,
    cols: 3,
    totalPieces: 6,
    parTime: 90,
    basePoints: 600,
  },
  {
    id: 'l1_p2',
    level: 1,
    levelIndex: 1,
    title: 'Toros de Guisando',
    townOrZone: 'El Tiemblo',
    description: 'Conjunto escultórico vetón de cuatro toros tallados en granito sobre un claro de robledal.',
    image: '/assets/games/rompecabezas/tietar/l1_p2_toros_guisando.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l1_p2_toros_guisando.jpg',
    difficultyTone: 'Esculturas nítidas con fondo de hierba uniforme',
    rows: 2,
    cols: 3,
    totalPieces: 6,
    parTime: 90,
    basePoints: 650,
  },
  {
    id: 'l1_p3',
    level: 1,
    levelIndex: 2,
    title: 'Río Tiétar a su Paso por Arenas',
    townOrZone: 'Arenas de San Pedro',
    description: 'Aguas cristalinas reflejando las riberas verdes y el cielo azul del valle.',
    image: '/assets/games/rompecabezas/tietar/l1_p3_rio_tietar_arenas.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l1_p3_rio_tietar_arenas.jpg',
    difficultyTone: 'Aguas limpias y líneas de horizonte bien definidas',
    rows: 2,
    cols: 3,
    totalPieces: 6,
    parTime: 90,
    basePoints: 700,
  },

  // ==========================================
  // NIVEL 2: 12 piezas (3x4) - Detalle moderado, pueblos y castro
  // ==========================================
  {
    id: 'l2_p1',
    level: 2,
    levelIndex: 0,
    title: 'Candeleda y la Sierra de Gredos',
    townOrZone: 'Candeleda',
    description: 'Panorámica de tejados de arcilla roja, iglesia y laderas verdes del sur de Gredos.',
    image: '/assets/games/rompecabezas/tietar/l2_p1_candeleda_pueblo.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l2_p1_candeleda_pueblo.jpg',
    difficultyTone: 'Contraste entre casas de pueblo y montaña',
    rows: 3,
    cols: 4,
    totalPieces: 12,
    parTime: 120,
    basePoints: 1200,
  },
  {
    id: 'l2_p2',
    level: 2,
    levelIndex: 1,
    title: 'Castro Celta de El Raso',
    townOrZone: 'El Raso (Candeleda)',
    description: 'Poblado de la Edad del Hierro con restos de casas circulares y muralla defensiva.',
    image: '/assets/games/rompecabezas/tietar/l2_p2_castro_el_raso.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l2_p2_castro_el_raso.jpg',
    difficultyTone: 'Muros de piedra redondeados y vegetación baja',
    rows: 3,
    cols: 4,
    totalPieces: 12,
    parTime: 130,
    basePoints: 1300,
  },
  {
    id: 'l2_p3',
    level: 2,
    levelIndex: 2,
    title: 'Castillo de los Duques de Alburquerque',
    townOrZone: 'Mombeltrán',
    description: 'Fortaleza del siglo XV con cuatro esbeltos torreones cilíndricos y almenas coronadas.',
    image: '/assets/games/rompecabezas/tietar/l2_p3_castillo_mombeltran.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l2_p3_castillo_mombeltran.jpg',
    difficultyTone: 'Mampostería de granito y formas cilíndricas',
    rows: 3,
    cols: 4,
    totalPieces: 12,
    parTime: 140,
    basePoints: 1400,
  },

  // ==========================================
  // NIVEL 3: 16 piezas (4x4) - Texturas ricas de cuevas, nieblas y sierra
  // ==========================================
  {
    id: 'l3_p1',
    level: 3,
    levelIndex: 0,
    title: 'Catedral de las Cuevas del Águila',
    townOrZone: 'Ramacastañas',
    description: 'Espectacular bóveda subterránea con millones de años de estalactitas y estalagmitas calizas.',
    image: '/assets/games/rompecabezas/tietar/l3_p1_cuevas_aguila.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l3_p1_cuevas_aguila.jpg',
    difficultyTone: 'Formaciones geológicas minerales con luces doradas',
    rows: 4,
    cols: 4,
    totalPieces: 16,
    parTime: 160,
    basePoints: 1800,
  },
  {
    id: 'l3_p2',
    level: 3,
    levelIndex: 1,
    title: 'Guisando al Pie de los Riscos',
    townOrZone: 'Guisando',
    description: 'Pintoresco pueblo serrano blanco encajado en una garganta bajo los cortados de Gredos.',
    image: '/assets/games/rompecabezas/tietar/l3_p2_guisando_sierra.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l3_p2_guisando_sierra.jpg',
    difficultyTone: 'Paredes blancas, tejados pardos y bosque tupido',
    rows: 4,
    cols: 4,
    totalPieces: 16,
    parTime: 170,
    basePoints: 1900,
  },
  {
    id: 'l3_p3',
    level: 3,
    levelIndex: 2,
    title: 'Nieblas Matinales en el Tiétar',
    townOrZone: 'Valle del Tiétar Central',
    description: 'El manto de nubes bajas deslizándose entre olivares, cerezos y la umbría de la sierra.',
    image: '/assets/games/rompecabezas/tietar/l3_p3_valle_tietar_nieblas.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l3_p3_valle_tietar_nieblas.jpg',
    difficultyTone: 'Transición sutil de nieblas, árboles y luz difusa',
    rows: 4,
    cols: 4,
    totalPieces: 16,
    parTime: 180,
    basePoints: 2000,
  },

  // ==========================================
  // NIVEL 4: 24 piezas (4x6) - Gran densidad de detalle, bosques y calzadas
  // ==========================================
  {
    id: 'l4_p1',
    level: 4,
    levelIndex: 0,
    title: 'Calzada Romana del Puerto del Pico',
    townOrZone: 'Cuevas del Valle y Villarejo',
    description: 'Milenario trazado romano en zigzag de losas de piedra que asciende hacia la meseta.',
    image: '/assets/games/rompecabezas/tietar/l4_p1_puerto_pico_calzada.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l4_p1_puerto_pico_calzada.jpg',
    difficultyTone: 'Cientos de losas empedradas entre piornos y laderas',
    rows: 4,
    cols: 6,
    totalPieces: 24,
    parTime: 220,
    basePoints: 2600,
  },
  {
    id: 'l4_p2',
    level: 4,
    levelIndex: 1,
    title: 'Castañar Centenario de El Tiemblo',
    townOrZone: 'El Tiemblo',
    description: 'Bosque mágico de castaños de troncos nudosos y suelo tapizado por hojarasca dorada.',
    image: '/assets/games/rompecabezas/tietar/l4_p2_castanar_tiemblo.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l4_p2_castanar_tiemblo.jpg',
    difficultyTone: 'Textura compleja de ramas, cortezas y hojas ocres',
    rows: 4,
    cols: 6,
    totalPieces: 24,
    parTime: 240,
    basePoints: 2800,
  },
  {
    id: 'l4_p3',
    level: 4,
    levelIndex: 2,
    title: 'Barranco de las Cinco Villas',
    townOrZone: 'Mombeltrán y Cuevas',
    description: 'Panorámica de bancales de piedra, huertas mediterráneas y colinas que abrazan el valle.',
    image: '/assets/games/rompecabezas/tietar/l4_p3_barranco_cinco_villas.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l4_p3_barranco_cinco_villas.jpg',
    difficultyTone: 'Patrones repetitivos de terrazas agrícolas y arboledas',
    rows: 4,
    cols: 6,
    totalPieces: 24,
    parTime: 250,
    basePoints: 3000,
  },

  // ==========================================
  // NIVEL 5: 36 piezas (6x6) - Máxima dificultad, rocas graníticas, cumbres y fauna
  // ==========================================
  {
    id: 'l5_p1',
    level: 5,
    levelIndex: 0,
    title: 'Los Galayos de Gredos',
    townOrZone: 'Sierra de Gredos',
    description: 'Vertiginosas agujas graníticas de escalada clásica alzándose como lanzas hacia el cielo.',
    image: '/assets/games/rompecabezas/tietar/l5_p1_galayos_gredos.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l5_p1_galayos_gredos.jpg',
    difficultyTone: 'Afiladas agujas de roca, sombras escarpadas y cielo',
    rows: 6,
    cols: 6,
    totalPieces: 36,
    parTime: 320,
    basePoints: 4000,
  },
  {
    id: 'l5_p2',
    level: 5,
    levelIndex: 1,
    title: 'Circo de Gredos y Laguna Grande',
    townOrZone: 'Corazón de Gredos',
    description: 'Anfiteatro glaciar con la Laguna Grande reflejando los canchales de granito y el pico Almanzor.',
    image: '/assets/games/rompecabezas/tietar/l5_p2_circo_gredos.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l5_p2_circo_gredos.jpg',
    difficultyTone: 'Pedreras infinitas, nieve en grietas y reflejos en agua',
    rows: 6,
    cols: 6,
    totalPieces: 36,
    parTime: 340,
    basePoints: 4500,
  },
  {
    id: 'l5_p3',
    level: 5,
    levelIndex: 2,
    title: 'Cabra Montés en las Cumbres del Tiétar',
    townOrZone: 'Rocas de Gredos',
    description: 'Macho montés de Gredos (Capra pyrenaica victoriae) vigilando el horizonte desde las alturas.',
    image: '/assets/games/rompecabezas/tietar/l5_p3_cabra_montes.jpg',
    thumbnail: '/assets/games/rompecabezas/tietar/l5_p3_cabra_montes.jpg',
    difficultyTone: 'Pelaje silvestre, cuernos anillados y texturas de granito',
    rows: 6,
    cols: 6,
    totalPieces: 36,
    parTime: 360,
    basePoints: 5000,
  },
];
