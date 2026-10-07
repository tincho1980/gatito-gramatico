import { WordChallenge, WordType } from '../types';

// Banco mínimo y provisorio para el juego viejo, hasta que la app use el banco de `words/`
// y el motor de `shared/` (etapas 1–3). Cada palabra está verificada con `words/lib/acentuacion.ts`.

const WORD_COUNT = 20;

type BankEntry = readonly [correctWord: string, type: WordType, difficulty: number];

const { Aguda, Grave, Esdrujula } = WordType;

export const WORD_BANK: readonly BankEntry[] = [
  ['mamá', Aguda, 1],
  ['café', Aguda, 1],
  ['sofá', Aguda, 1],
  ['reloj', Aguda, 2],
  ['pared', Aguda, 2],
  ['feliz', Aguda, 2],
  ['ratón', Aguda, 2],
  ['canción', Aguda, 3],
  ['camión', Aguda, 3],
  ['jardín', Aguda, 4],
  ['compás', Aguda, 5],
  ['tiburón', Aguda, 5],
  ['huracán', Aguda, 6],
  ['colibrí', Aguda, 6],
  ['bisturí', Aguda, 8],
  ['terraplén', Aguda, 8],
  ['alhelí', Aguda, 9],

  ['casa', Grave, 1],
  ['mesa', Grave, 1],
  ['lápiz', Grave, 2],
  ['joven', Grave, 3],
  ['fácil', Grave, 3],
  ['árbol', Grave, 3],
  ['examen', Grave, 4],
  ['difícil', Grave, 4],
  ['útil', Grave, 4],
  ['cárcel', Grave, 5],
  ['azúcar', Grave, 5],
  ['césped', Grave, 6],
  ['álbum', Grave, 7],
  ['bíceps', Grave, 8],
  ['idiosincrasia', Grave, 8],
  ['esternocleidomastoideo', Grave, 9],
  ['electroencefalografista', Grave, 10],

  ['sábado', Esdrujula, 2],
  ['lámpara', Esdrujula, 2],
  ['música', Esdrujula, 3],
  ['pájaro', Esdrujula, 3],
  ['médico', Esdrujula, 4],
  ['brújula', Esdrujula, 4],
  ['teléfono', Esdrujula, 5],
  ['murciélago', Esdrujula, 5],
  ['gramática', Esdrujula, 6],
  ['agrícola', Esdrujula, 6],
  ['farmacéutico', Esdrujula, 7],
  ['paralelepípedo', Esdrujula, 9],
  ['otorrinolaringólogo', Esdrujula, 10],
];

const STRIP: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const stripTildes = (w: string) => w.replace(/[áéíóú]/g, (c) => STRIP[c] ?? c);
const endsInNSOrVowel = (w: string) => /[nsaeiou]$/.test(stripTildes(w));

export const explain = (type: WordType, word: string): string => {
  const nsv = endsInNSOrVowel(word);
  switch (type) {
    case WordType.Aguda:
      return nsv
        ? 'Es aguda y termina en n, s o vocal: lleva tilde.'
        : 'Es aguda y no termina en n, s ni vocal: no lleva tilde.';
    case WordType.Grave:
      return nsv
        ? 'Es grave y termina en n, s o vocal: no lleva tilde.'
        : 'Es grave y no termina en n, s ni vocal: lleva tilde.';
    default:
      return 'Las esdrújulas llevan tilde siempre.';
  }
};

const toChallenge = ([correctWord, type, difficulty]: BankEntry): WordChallenge => ({
  displayWord: stripTildes(correctWord),
  correctWord,
  type,
  hasTilde: /[áéíóú]/.test(correctWord),
  difficulty,
  explanation: explain(type, correctWord),
});

const shuffleArray = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

export interface FetchWordsOptions {
  excludeWords?: string[];
}

// Arma la ronda: primero palabras cerca del nivel pedido, después el resto del banco.
export const getWords = (
  targetDifficulty: number = 3,
  { excludeWords = [] }: FetchWordsOptions = {},
  count: number = WORD_COUNT,
): WordChallenge[] => {
  const exclude = new Set(excludeWords.map((w) => w.toLowerCase()));
  const all = WORD_BANK.map(toChallenge);
  const fresh = all.filter((w) => !exclude.has(w.displayWord));
  const pool = fresh.length >= count ? fresh : all;

  const byDistance = shuffleArray(pool).sort(
    (a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty),
  );
  return shuffleArray(byDistance.slice(0, count));
};

export const fetchWords = async (
  targetDifficulty?: number,
  options?: FetchWordsOptions,
): Promise<WordChallenge[]> => getWords(targetDifficulty, options);
