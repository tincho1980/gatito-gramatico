// Los 10 mundos: nombre, tema y grafo de desbloqueo (especificación §7.1).
// Única fuente: la usan el build del banco (`words/`), la app y el Worker.

export interface WorldInfo {
  id: number;
  name: string;
  topic: string;
  /** Jefes que hay que vencer para desbloquearlo. */
  requires: readonly number[];
}

export const WORLDS: readonly WorldInfo[] = [
  { id: 1, name: 'La Sílaba que Ronronea', topic: 'sílaba tónica', requires: [] },
  { id: 2, name: 'El Tejado Puntiagudo', topic: 'agudas', requires: [1] },
  { id: 3, name: 'Las Llanuras de la Siesta', topic: 'graves', requires: [1] },
  { id: 4, name: 'El Árbol Trepador', topic: 'esdrújulas y sobreesdrújulas', requires: [1] },
  { id: 5, name: 'El Mercado de los Ovillos', topic: 'las tres mezcladas', requires: [2, 3, 4] },
  { id: 6, name: 'El Río de los Abrazos', topic: 'diptongos', requires: [5] },
  { id: 7, name: 'El Puente Roto', topic: 'hiatos', requires: [6] },
  { id: 8, name: 'La Casa de los Gemelos', topic: 'monosílabos y diacrítica', requires: [5] },
  { id: 9, name: 'El Bosque de las Preguntas', topic: 'qué, cómo, dónde', requires: [8] },
  { id: 10, name: 'La Torre de la Gata Sabia', topic: 'casos especiales', requires: [7, 9] },
];

export const WORLD_IDS: readonly number[] = WORLDS.map((w) => w.id);
