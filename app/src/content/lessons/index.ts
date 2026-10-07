// Lecciones de los mundos (parada 1, especificación §4.2): la regla, 3 ejemplos del tier 1 y
// 3 turnos de práctica guiada que no cambian cajas ni EMA. El texto de cada ejemplo sale de
// la misma tabla de reglas del feedback (`ruleText`).

export interface Lesson {
  world: number;
  title: string;
  /** La regla, en párrafos cortos y en voseo. */
  rule: string[];
  /** Ids de palabras del banco (tier 1 del mundo). */
  examples: [string, string, string];
  practice: [string, string, string];
}

export const LESSONS: Record<number, Lesson> = {
  1: {
    world: 1,
    title: 'La sílaba que ronronea',
    rule: [
      'Todas las palabras tienen una sílaba que suena más fuerte que las otras: la sílaba tónica.',
      'Decí la palabra despacio, como si llamaras a alguien desde lejos. La sílaba que se estira y ronronea es la tónica.',
    ],
    examples: ['casa', 'comer', 'papel'],
    practice: ['mano', 'dormir', 'luna'],
  },
  2: {
    world: 2,
    title: 'Las agudas',
    rule: [
      'Si la sílaba fuerte es la última, la palabra es aguda: ca-FÉ, can-CIÓN.',
      'Las agudas llevan tilde cuando terminan en n, s o vocal. Si terminan en otra letra, no.',
    ],
    examples: ['café', 'canción', 'reloj'],
    practice: ['corazón', 'feliz', 'avión'],
  },
  3: {
    world: 3,
    title: 'Las graves',
    rule: [
      'Si la sílaba fuerte es la anteúltima, la palabra es grave (también se dice llana): LI-bro, ÁR-bol.',
      'Las graves llevan tilde cuando NO terminan en n, s ni vocal. Es justo al revés que las agudas.',
    ],
    examples: ['libro', 'árbol', 'joven'],
    practice: ['fácil', 'dulce', 'ángel'],
  },
  4: {
    world: 4,
    title: 'Las esdrújulas',
    rule: [
      'Si la sílaba fuerte es la que está antes de la anteúltima, la palabra es esdrújula: MÚ-si-ca.',
      'Las esdrújulas llevan tilde siempre, sin excepciones. Y si la fuerte está todavía más atrás, es sobreesdrújula: también lleva siempre.',
    ],
    examples: ['música', 'pájaro', 'número'],
    practice: ['rápido', 'médico', 'sábado'],
  },
  5: {
    world: 5,
    title: 'Las tres mezcladas',
    rule: [
      'Acá se mezclan agudas, graves y esdrújulas. El truco es ir en orden.',
      'Primero buscá la sílaba fuerte. Después decidí el tipo. Recién al final pensá si lleva tilde.',
    ],
    examples: ['jardín', 'planeta', 'dragón'],
    practice: ['estrella', 'castillo', 'princesa'],
  },
  6: {
    world: 6,
    title: 'Vocales abrazadas',
    rule: [
      'Cuando dos vocales van juntas en la misma sílaba forman un diptongo: PUER-ta, ciu-DAD.',
      'El diptongo cuenta como una sola sílaba, y las reglas de siempre se aplican igual.',
    ],
    examples: ['puerta', 'ciudad', 'también'],
    practice: ['nuevo', 'adiós', 'escuela'],
  },
  7: {
    world: 7,
    title: 'El abrazo se rompe',
    rule: [
      'A veces dos vocales juntas se separan en sílabas distintas: es un hiato. DÍ-a, pa-ÍS.',
      'Si la que suena fuerte es la i o la u, lleva tilde siempre, aunque la regla de siempre diga otra cosa.',
    ],
    examples: ['día', 'país', 'idea'],
    practice: ['tío', 'frío', 'museo'],
  },
  8: {
    world: 8,
    title: 'Palabras gemelas',
    rule: [
      'Las palabras de una sílaba casi nunca llevan tilde. Pero algunas tienen una gemela que se escribe igual y significa otra cosa.',
      'La tilde las distingue: tú (la persona) y tu (de quién es), él y el, mí y mi, sí y si. Leé la oración para saber cuál es.',
    ],
    examples: ['tú-b94524', 'tu-1984bf', 'él-b33436'],
    practice: ['el-a9ea4f', 'mí-f8d3e8', 'mi-66b2db'],
  },
  9: {
    world: 9,
    title: 'Las preguntonas',
    rule: [
      'Qué, cómo, cuándo, dónde y quién llevan tilde cuando preguntan o exclaman: ¿Qué querés? ¡Qué lindo!',
      'Si no preguntan ni exclaman, van sin tilde: Quiero que vengas.',
    ],
    examples: ['qué-8f191f', 'que-37329a', 'cómo-1c5a74'],
    practice: ['qué-cc58c2', 'como-6855ca', 'cómo-ee9b5d'],
  },
  10: {
    world: 10,
    title: 'Casos especiales',
    rule: [
      'Al pasar al plural, una palabra puede cambiar de tipo: jo-ven es grave, pero JÓ-ve-nes es esdrújula y lleva tilde.',
      'Las palabras que terminan en -mente conservan la tilde de la palabra de la que vienen: fácil → fácilmente.',
    ],
    examples: ['jóvenes', 'canciones', 'fácilmente'],
    practice: ['imágenes', 'aviones', 'rápidamente'],
  },
};
