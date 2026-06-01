import { GoogleGenAI, Type } from "@google/genai";
import { WordChallenge, WordType } from "../types";

const WORD_COUNT = 20;

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export interface FetchWordsOptions {
  excludeWords?: string[];
}

const parseWordType = (val: string): WordType => {
  switch (val.toLowerCase()) {
    case 'aguda': return WordType.Aguda;
    case 'grave': return WordType.Grave;
    case 'esdrújula': return WordType.Esdrujula;
    case 'sobreesdrújula': return WordType.Sobreesdrujula;
    default: return WordType.Aguda;
  }
};

const getDifficultyRange = (targetDifficulty: number) => ({
  minDiff: Math.max(1, Math.floor(targetDifficulty - 1)),
  maxDiff: Math.min(10, Math.ceil(targetDifficulty + 1)),
});

const buildPrompt = (
  minDiff: number,
  maxDiff: number,
  excludeWords: string[],
  sessionId: string
) => {
  const excludeLine =
    excludeWords.length > 0
      ? excludeWords.slice(0, 30).join(', ')
      : 'ninguna';

  return `
Genera exactamente ${WORD_COUNT} palabras DISTINTAS en español para un juego de acentuación ortográfica.

CONTENIDO:
- Al menos 6 agudas, 6 graves y 6 esdrújulas.
- Mezcla palabras con tilde y sin tilde.
- Dificultad de cada palabra: entero entre ${minDiff} y ${maxDiff} (1 = muy fácil, 10 = muy difícil).
- Distribuye dificultades de forma variada dentro del rango.
- Usa vocabulario diverso (acciones, objetos, lugares, profesiones, naturaleza, etc.).

IMPORTANTE — VARIEDAD:
- NO uses palabras cliché de ejercicios escolares (mamá, papá, árbol, casa, mesa, sol, perro, gato, etc.).
- NO repitas palabras dentro de la lista.
- NO uses ninguna de estas palabras ya jugadas recientemente: ${excludeLine}.
- NO sigas el orden típico fácil→difícil; mezcla el listado.

FORMATO JSON (por ítem):
- displayWord: palabra sin tildes (ej: cancion)
- correctWord: ortografía correcta (ej: canción)
- type: "Aguda", "Grave" o "Esdrújula"
- hasTilde: boolean
- difficulty: entero ${minDiff}-${maxDiff}
- explanation: regla breve en español

Referencia de sesión: ${sessionId}. Prioriza palabras poco obvias y originales.
`;
};

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      displayWord: { type: Type.STRING },
      correctWord: { type: Type.STRING },
      type: { type: Type.STRING },
      hasTilde: { type: Type.BOOLEAN },
      difficulty: { type: Type.INTEGER },
      explanation: { type: Type.STRING },
    },
    required: ["displayWord", "correctWord", "type", "hasTilde", "difficulty", "explanation"],
  },
};

interface RawWordItem {
  displayWord: string;
  correctWord: string;
  type: string;
  hasTilde: boolean;
  difficulty: number;
  explanation: string;
}

const isValidItem = (item: unknown): item is RawWordItem => {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  return (
    typeof o.displayWord === 'string' &&
    typeof o.correctWord === 'string' &&
    typeof o.type === 'string' &&
    typeof o.hasTilde === 'boolean' &&
    typeof o.difficulty === 'number' &&
    typeof o.explanation === 'string'
  );
};

export const validateAndNormalizeWords = (
  raw: unknown[],
  minDiff: number,
  maxDiff: number
): WordChallenge[] => {
  const valid: WordChallenge[] = [];

  for (const item of raw) {
    if (!isValidItem(item)) continue;

    valid.push({
      displayWord: item.displayWord,
      correctWord: item.correctWord,
      type: parseWordType(item.type),
      hasTilde: item.hasTilde,
      difficulty: Math.max(minDiff, Math.min(maxDiff, Math.round(item.difficulty))),
      explanation: item.explanation,
    });
  }

  return valid;
};

const fetchFromGemini = async (
  ai: GoogleGenAI,
  minDiff: number,
  maxDiff: number,
  excludeWords: string[],
  sessionId: string
): Promise<WordChallenge[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(minDiff, maxDiff, excludeWords, sessionId),
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 1.1,
    },
  });

  const jsonText = response.text;
  if (!jsonText) throw new Error("No text returned from AI");

  const data = JSON.parse(jsonText);
  if (!Array.isArray(data)) throw new Error("Expected array from AI");

  const normalized = validateAndNormalizeWords(data, minDiff, maxDiff);
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()));
  const filtered = normalized.filter(
    (w) => !excludeSet.has(w.displayWord.toLowerCase())
  );

  return shuffleArray(filtered);
};

const FALLBACK_POOL: WordChallenge[] = [
  { displayWord: "casa", correctWord: "casa", type: WordType.Grave, hasTilde: false, difficulty: 1, explanation: "Grave terminada en vocal." },
  { displayWord: "mesa", correctWord: "mesa", type: WordType.Grave, hasTilde: false, difficulty: 1, explanation: "Grave terminada en vocal." },
  { displayWord: "sol", correctWord: "sol", type: WordType.Aguda, hasTilde: false, difficulty: 1, explanation: "Aguda terminada en consonante." },
  { displayWord: "mama", correctWord: "mamá", type: WordType.Grave, hasTilde: true, difficulty: 1, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "pared", correctWord: "pared", type: WordType.Aguda, hasTilde: false, difficulty: 2, explanation: "Aguda terminada en d." },
  { displayWord: "lapiz", correctWord: "lápiz", type: WordType.Aguda, hasTilde: true, difficulty: 2, explanation: "Aguda terminada en z." },
  { displayWord: "cancion", correctWord: "canción", type: WordType.Aguda, hasTilde: true, difficulty: 3, explanation: "Aguda terminada en n." },
  { displayWord: "facil", correctWord: "fácil", type: WordType.Grave, hasTilde: true, difficulty: 3, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "arbol", correctWord: "árbol", type: WordType.Grave, hasTilde: true, difficulty: 4, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "examen", correctWord: "examen", type: WordType.Aguda, hasTilde: false, difficulty: 4, explanation: "Aguda terminada en n." },
  { displayWord: "medico", correctWord: "médico", type: WordType.Esdrujula, hasTilde: true, difficulty: 5, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "musica", correctWord: "música", type: WordType.Esdrujula, hasTilde: true, difficulty: 5, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "telefono", correctWord: "teléfono", type: WordType.Esdrujula, hasTilde: true, difficulty: 6, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "gramatica", correctWord: "gramática", type: WordType.Grave, hasTilde: true, difficulty: 6, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "agricola", correctWord: "agrícola", type: WordType.Grave, hasTilde: true, difficulty: 7, explanation: "Grave que no termina en n, s o vocal." },
  { displayWord: "farmaceutico", correctWord: "farmacéutico", type: WordType.Esdrujula, hasTilde: true, difficulty: 7, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "idiosincrasia", correctWord: "idiosincrasia", type: WordType.Esdrujula, hasTilde: false, difficulty: 8, explanation: "Esdrújula sin tilde gráfica." },
  { displayWord: "paralelepipedo", correctWord: "paralelepípedo", type: WordType.Esdrujula, hasTilde: true, difficulty: 8, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "esternocleidomastoideo", correctWord: "esternocleidomastoideo", type: WordType.Esdrujula, hasTilde: false, difficulty: 9, explanation: "Esdrújula sin tilde gráfica." },
  { displayWord: "otorrinolaringologo", correctWord: "otorrinolaringólogo", type: WordType.Esdrujula, hasTilde: true, difficulty: 10, explanation: "Esdrújula, siempre lleva tilde." },
  { displayWord: "electroencefalografista", correctWord: "electroencefalografista", type: WordType.Esdrujula, hasTilde: false, difficulty: 10, explanation: "Esdrújula sin tilde gráfica." },
  { displayWord: "reloj", correctWord: "reloj", type: WordType.Aguda, hasTilde: false, difficulty: 2, explanation: "Aguda terminada en consonante." },
  { displayWord: "camion", correctWord: "camión", type: WordType.Aguda, hasTilde: true, difficulty: 3, explanation: "Aguda terminada en n." },
  { displayWord: "jardin", correctWord: "jardín", type: WordType.Aguda, hasTilde: true, difficulty: 4, explanation: "Aguda terminada en n." },
  { displayWord: "pajaro", correctWord: "pájaro", type: WordType.Esdrujula, hasTilde: true, difficulty: 5, explanation: "Esdrújula, siempre lleva tilde." },
];

export const getFallbackWords = (
  targetDifficulty: number = 3,
  count: number = WORD_COUNT,
  excludeWords: string[] = []
): WordChallenge[] => {
  const { minDiff, maxDiff } = getDifficultyRange(targetDifficulty);
  const excludeSet = new Set(excludeWords.map((w) => w.toLowerCase()));

  const inRange = FALLBACK_POOL.filter(
    (w) =>
      w.difficulty >= minDiff &&
      w.difficulty <= maxDiff &&
      !excludeSet.has(w.displayWord.toLowerCase())
  );
  const pool =
    inRange.length >= count
      ? inRange
      : FALLBACK_POOL.filter((w) => !excludeSet.has(w.displayWord.toLowerCase()));

  const shuffled = shuffleArray(pool);
  const result: WordChallenge[] = [];
  const used = new Set<string>();

  for (const source of shuffled) {
    if (result.length >= count) break;
    if (used.has(source.displayWord)) continue;
    used.add(source.displayWord);
    result.push({
      ...source,
      difficulty: Math.max(minDiff, Math.min(maxDiff, source.difficulty)),
    });
  }

  let i = 0;
  while (result.length < count && shuffled.length > 0) {
    const source = shuffled[i % shuffled.length];
    if (!used.has(source.displayWord)) {
      used.add(source.displayWord);
      result.push({
        ...source,
        difficulty: Math.max(minDiff, Math.min(maxDiff, source.difficulty)),
      });
    }
    i++;
    if (i > shuffled.length * 3) break;
  }

  return shuffleArray(result);
};

const padToCount = (
  words: WordChallenge[],
  targetDifficulty: number,
  excludeWords: string[] = []
): WordChallenge[] => {
  if (words.length >= WORD_COUNT) return shuffleArray(words.slice(0, WORD_COUNT));

  const existing = new Set(words.map((w) => w.displayWord.toLowerCase()));
  const allExcluded = [
    ...excludeWords,
    ...words.map((w) => w.displayWord),
  ];
  const fallback = getFallbackWords(
    targetDifficulty,
    WORD_COUNT - words.length,
    allExcluded
  );
  const extras = fallback.filter((w) => !existing.has(w.displayWord.toLowerCase()));

  return shuffleArray([...words, ...extras].slice(0, WORD_COUNT));
};

export const fetchWords = async (
  targetDifficulty: number = 3,
  options: FetchWordsOptions = {}
): Promise<WordChallenge[]> => {
  const { minDiff, maxDiff } = getDifficultyRange(targetDifficulty);
  const excludeWords = options.excludeWords ?? [];
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("API Key missing");
    return getFallbackWords(targetDifficulty, WORD_COUNT, excludeWords);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    let words = await fetchFromGemini(
      ai,
      minDiff,
      maxDiff,
      excludeWords,
      sessionId
    );

    if (words.length < WORD_COUNT) {
      try {
        const retryWords = await fetchFromGemini(
          ai,
          minDiff,
          maxDiff,
          [...excludeWords, ...words.map((w) => w.displayWord)],
          `${sessionId}-retry`
        );
        const seen = new Set(words.map((w) => w.displayWord.toLowerCase()));
        for (const w of retryWords) {
          if (!seen.has(w.displayWord.toLowerCase())) {
            words.push(w);
            seen.add(w.displayWord.toLowerCase());
          }
        }
      } catch {
        // use partial result padded with fallback
      }
    }

    return padToCount(words, targetDifficulty, excludeWords);
  } catch (error) {
    console.error("Error fetching words from Gemini:", error);
    return getFallbackWords(targetDifficulty, WORD_COUNT, excludeWords);
  }
};
