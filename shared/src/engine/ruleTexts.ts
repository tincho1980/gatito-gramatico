// §2.3 Feedback: la línea con la regla, en voseo. Depende de la regla y de si la palabra lleva tilde.
import type { Rule, WordEntry } from '../schemas.ts';

type RuleText = (word: WordEntry) => string;

const TYPE_NAMES: Record<WordEntry['type'], string> = {
  monosilaba: 'monosílaba',
  aguda: 'aguda',
  grave: 'grave',
  esdrujula: 'esdrújula',
  sobreesdrujula: 'sobreesdrújula',
};

export const RULE_TEXTS: Record<Rule, RuleText> = {
  aguda_n_s_vocal: () => 'Es aguda y termina en n, s o vocal: lleva tilde.',
  aguda_otra: () => 'Es aguda y no termina en n, s ni vocal: no lleva tilde.',
  grave_n_s_vocal: () => 'Es grave y termina en n, s o vocal: no lleva tilde.',
  grave_otra: () => 'Es grave y no termina en n, s ni vocal: lleva tilde.',
  esdrujula: () => 'Es esdrújula: las esdrújulas llevan tilde siempre.',
  sobreesdrujula: () => 'Es sobreesdrújula: las sobreesdrújulas llevan tilde siempre.',
  hiato: () =>
    'La i o la u suenan fuerte al lado de a, e u o y se separan: lleva tilde para marcar el hiato.',
  monosilabo: () => 'Tiene una sola sílaba: los monosílabos no llevan tilde.',
  diacritica: (w) =>
    w.hasTilde
      ? 'Lleva tilde diacrítica: así se distingue de su gemela que se escribe igual.'
      : 'Va sin tilde: la tilde la lleva su gemela, que significa otra cosa.',
  interrogativa: (w) =>
    w.hasTilde ? 'Pregunta o exclama: lleva tilde.' : 'No pregunta ni exclama: va sin tilde.',
  mente: (w) =>
    w.hasTilde
      ? `Termina en -mente y conserva la tilde de ${w.related ?? 'la palabra de la que viene'}.`
      : `Termina en -mente: lleva tilde solo si ${w.related ?? 'la palabra de la que viene'} la tiene.`,
};

export function ruleText(word: WordEntry): string {
  return RULE_TEXTS[word.rule](word);
}

/** Nombre del tipo para mostrar ("esdrújula"). */
export const typeName = (type: WordEntry['type']): string => TYPE_NAMES[type];

/** §2.3 punto 3: "Error común: exámen", solo si hubo error. */
export function commonErrorText(word: WordEntry, full: boolean): string | null {
  if (full || !word.distractor) return null;
  return `Error común: ${word.distractor}`;
}
