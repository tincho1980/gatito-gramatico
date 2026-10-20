// Los 10 mundos: nombre, tema y grafo de desbloqueo (especificación §7.1).
// `name` es el nombre de fantasía; `topic`, el detalle corto que se muestra debajo en el mapa.
// Única fuente: la usan el build del banco (`words/`), la app y el Worker.

export interface WorldInfo {
  id: number;
  name: string;
  topic: string;
  /** Jefes que hay que vencer para desbloquearlo. */
  requires: readonly number[];
  /** §7.3 El jefe del mundo: nombre con artículo y lo que dice al desafiarlo. */
  boss: { name: string; taunt: string };
}

export const WORLDS: readonly WorldInfo[] = [
  {
    id: 1,
    name: 'La Sílaba que Ronronea',
    topic: 'sílaba tónica',
    requires: [],
    boss: {
      name: 'El Ratón Monótono',
      taunt: 'Yo digo todas las sílabas igual. ¿A que no encontrás la fuerte?',
    },
  },
  {
    id: 2,
    name: 'El Tejado Puntiagudo',
    topic: 'agudas',
    requires: [1],
    boss: { name: 'La Paloma Picuda', taunt: '¡Desde mi tejado picoteo las tildes de las agudas!' },
  },
  {
    id: 3,
    name: 'Las Llanuras de la Siesta',
    topic: 'graves',
    requires: [1],
    boss: { name: 'El Sapo Siestero', taunt: 'Zzz… ¿Graves con tilde? Despertame si te animás.' },
  },
  {
    id: 4,
    name: 'El Árbol Trepador',
    topic: 'esdrújulas',
    requires: [1],
    boss: {
      name: 'La Ardilla Acróbata',
      taunt: '¡Subí las tildes de las esdrújulas a la rama más alta!',
    },
  },
  {
    id: 5,
    name: 'El Mercado de los Ovillos',
    topic: 'las tres mezcladas',
    requires: [2, 3, 4],
    boss: {
      name: 'El Pulpo Revoltijo',
      taunt: 'Con ocho brazos mezclo agudas, graves y esdrújulas. ¡Desenredalas!',
    },
  },
  {
    id: 6,
    name: 'El Río de los Abrazos',
    topic: 'diptongos',
    requires: [5],
    boss: {
      name: 'El Cangrejo Abrazón',
      taunt: 'Abrazo tan fuerte a las vocales que no vas a saber dónde va la tilde.',
    },
  },
  {
    id: 7,
    name: 'El Puente Roto',
    topic: 'hiatos',
    requires: [6],
    boss: {
      name: 'El Castor Cortapuentes',
      taunt: 'Corté el puente entre las vocales. ¿Sabés cuándo lleva tilde?',
    },
  },
  {
    id: 8,
    name: 'La Casa de los Gemelos',
    topic: 'tú / tu, él / el',
    requires: [5],
    boss: {
      name: 'El Loro Copión',
      taunt: '¡Tu, tú, el, él! Copio todo igualito. ¿Me distinguís cuál es cuál?',
    },
  },
  {
    id: 9,
    name: 'El Bosque de las Preguntas',
    topic: 'qué, cómo',
    requires: [8],
    boss: { name: 'El Búho Preguntón', taunt: '¿Qué? ¿Cómo? ¿Cuándo? Uh… ¿con tilde o sin tilde?' },
  },
  {
    id: 10,
    name: 'La Torre de la Gata Sabia',
    topic: 'casos especiales',
    requires: [7, 9],
    boss: {
      name: 'El Dragón Borratildes',
      taunt: 'Con mi goma borré las tildes más difíciles. ¡Es el último desafío!',
    },
  },
];

export const WORLD_IDS: readonly number[] = WORLDS.map((w) => w.id);

/** El nombre del jefe después de "a": "al Ratón Monótono", "a la Paloma Picuda". */
export function toBoss(name: string): string {
  return name.startsWith('El ')
    ? `al ${name.slice(3)}`
    : `a ${name[0]!.toLowerCase()}${name.slice(1)}`;
}

/** §7.3 El jefe de un mundo (genérico si el mundo no existe). */
export function bossOf(world: number): WorldInfo['boss'] {
  return WORLDS.find((w) => w.id === world)?.boss ?? { name: 'El Jefe', taunt: '' };
}
