// Lógica compartida del banco de palabras: parseo de fuentes, armado de entradas y reglas de validación.
import { createHash } from 'node:crypto';
import { WORLDS as WORLD_LIST, type WordEntry } from '@gatita/shared';
import { analyze, distractor, stripTildes, tildeVariants, RULES, TYPES } from './acentuacion.ts';

// Nombres y temas de los mundos: la fuente es shared/src/data/worlds.ts.
export const WORLDS: Record<number, { name: string; topic: string }> = Object.fromEntries(
  WORLD_LIST.map(({ id, name, topic }) => [id, { name, topic }]),
);

// Versión del banco: hash del contenido de los world-XX.json, en orden.
export function bankVersion(worldJsons: Iterable<string>): string {
  const h = createHash('sha256');
  for (const json of worldJsons) h.update(json);
  return h.digest('hex').slice(0, 12);
}

/** Entrada de `data/lexicon.json` (la genera check-lexicon.py). */
export interface LexiconEntry {
  allowlisted?: boolean;
  valid: boolean;
  zipf: number | null;
  ambiguousWith?: string[];
  otherForms?: Record<string, number | null>;
}
export type Lexicon = Record<string, LexiconEntry>;

/** Una línea de `src/world-XX.txt` ya parseada. */
export interface SourceItem {
  word: string;
  sentence: string | null;
  tags: string[];
  related: string | null;
  flags: string[];
  world: number | null;
  tier: number | null;
  source: string;
}

export const INTERROGATIVAS = new Set([
  'qué',
  'que',
  'quién',
  'quien',
  'quiénes',
  'quienes',
  'cuál',
  'cual',
  'cuáles',
  'cuales',
  'cómo',
  'como',
  'dónde',
  'donde',
  'adónde',
  'adonde',
  'cuándo',
  'cuando',
  'cuánto',
  'cuanto',
  'cuánta',
  'cuanta',
  'cuántos',
  'cuantos',
  'cuántas',
  'cuantas',
  'porqué',
  'porque',
]);
const DIACRITIC_PAIRS = new Set([
  'tu',
  'tú',
  'el',
  'él',
  'mi',
  'mí',
  'si',
  'sí',
  'te',
  'té',
  'de',
  'dé',
  'se',
  'sé',
  'mas',
  'más',
  'aun',
  'aún',
]);
const W10_TAGS = ['plural', 'mente', 'compuesto', 'enclitico'];

// Qué tiene que cumplir cada mundo (los ítems con oración quedan exentos: son trampas de contexto).
// Devuelve true o el mensaje de error.
const WORLD_CHECKS: Record<number, (e: WordEntry) => true | string> = {
  1: (e) =>
    (['aguda', 'grave', 'esdrujula', 'sobreesdrujula'].includes(e.type) && e.rule !== 'hiato') ||
    'mundo 1: palabra de 2+ sílabas sin hiato con tilde',
  2: (e) => e.type === 'aguda' || 'mundo 2 solo agudas',
  3: (e) => e.type === 'grave' || 'mundo 3 solo graves',
  4: (e) =>
    ['esdrujula', 'sobreesdrujula'].includes(e.type) || 'mundo 4 solo esdrújulas/sobreesdrújulas',
  5: (e) =>
    (['aguda', 'grave', 'esdrujula'].includes(e.type) && e.rule !== 'hiato') ||
    'mundo 5: aguda, grave o esdrújula sin hiato',
  6: (e) =>
    ((e.features.includes('diptongo') || e.features.includes('triptongo')) && e.rule !== 'hiato') ||
    'mundo 6: necesita diptongo y no hiato con tilde',
  7: (e) => e.features.includes('hiato') || 'mundo 7: necesita hiato',
  8: (e) =>
    e.type === 'monosilaba' ||
    DIACRITIC_PAIRS.has(e.word) ||
    'mundo 8: monosílabos o pares diacríticos',
  9: (e) => (e.rule === 'interrogativa' && !!e.sentence) || 'mundo 9: interrogativos en oración',
  10: (e) =>
    e.tags.some((t) => W10_TAGS.includes(t)) || `mundo 10: tag ${W10_TAGS.join('/')} obligatorio`,
};

const shortHash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 6);

// flags y tags pueden ir en la cabeza o al final de la oración
function pullMeta(s: string): [text: string, meta: string[]] {
  const toks = s.split(/\s+/);
  const meta = toks.filter((t) => /^[#=!]/.test(t));
  const keep = toks.filter((t) => !/^[#=!]/.test(t));
  return [keep.join(' '), meta];
}

export function parseSource(text: string, file = ''): SourceItem[] {
  let world: number | null = null;
  let tier: number | null = null;
  const items: SourceItem[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    if (line.startsWith('@world')) {
      world = Number(line.split(/\s+/)[1]);
      return;
    }
    if (line.startsWith('@tier')) {
      tier = Number(line.split(/\s+/)[1]);
      return;
    }
    const [head = '', ...rest] = line.split('|');
    let sentence: string | null = rest.join('|').trim() || null;
    const [wordPart, metaA] = pullMeta(head.trim());
    let metaB: string[] = [];
    if (sentence) [sentence, metaB] = pullMeta(sentence);
    const meta = [...metaA, ...metaB];
    items.push({
      word: wordPart.trim(),
      sentence: sentence || null,
      tags: meta.filter((t) => t.startsWith('#')).map((t) => t.slice(1)),
      related: meta.find((t) => t.startsWith('='))?.slice(1) ?? null,
      flags: meta.filter((t) => t.startsWith('!')).map((t) => t.slice(1)),
      world,
      tier,
      source: `${file}:${i + 1}`,
    });
  });
  return items;
}

// La forma gemela más frecuente según el lexicón (primero las ambiguas, después cualquier otra).
function twin(lex: LexiconEntry | undefined): string | null {
  if (!lex) return null;
  if (lex.ambiguousWith?.length) return lex.ambiguousWith[0] ?? null;
  const others = Object.entries(lex.otherForms ?? {}).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return others[0]?.[0] ?? null;
}

// Arma la entrada final a partir del ítem fuente. `world` y `tier` se validan después
// (checkEntry y el esquema), por eso la entrada sale tipada como WordEntry.
export function buildEntry(
  item: SourceItem,
  lexicon: Lexicon = {},
): { entry: WordEntry; errors: string[] } {
  const errors: string[] = [];
  const a = analyze(item.word, { mente: item.flags.includes('mente') });
  let rule = a.rule;
  let errs = a.errors;
  if (item.flags.includes('interrogativa')) {
    rule = 'interrogativa';
    errs = []; // dónde/cuándo llevan tilde por ser interrogativos, no por la regla general
    if (!INTERROGATIVAS.has(a.word))
      errors.push(`"${a.word}" no es interrogativo/relativo conocido`);
  }
  if (item.flags.includes('diacritica')) {
    if (!DIACRITIC_PAIRS.has(a.word)) errors.push(`"${a.word}" no es miembro de un par diacrítico`);
    rule = 'diacritica';
  }
  errors.push(...errs);

  const lex = lexicon[a.word];
  const entry = {
    id: item.sentence ? `${a.word}-${shortHash(item.sentence)}` : a.word,
    word: a.word,
    syllables: a.syllables,
    stressIndex: a.stressIndex,
    type: a.type,
    hasTilde: a.hasTilde,
    rule,
    world: item.world,
    tier: item.tier,
    // En las trampas con oración, el distractor es la palabra gemela más usada (esta → está).
    distractor: (item.sentence && twin(lex)) || distractor(a.word, a),
    sentence: item.sentence,
    tags: item.tags,
    features: a.features,
    related: item.related,
    freq: lex?.zipf ?? null,
  } as WordEntry;
  return { entry, errors };
}

// Validación de una entrada ya armada (la usan el build y el test de CI).
export function checkEntry(e: WordEntry, lexicon: Lexicon | null = null): string[] {
  const errors: string[] = [];
  const req = [
    'id',
    'word',
    'syllables',
    'stressIndex',
    'type',
    'hasTilde',
    'rule',
    'world',
    'tier',
    'distractor',
    'tags',
  ] as const;
  for (const k of req) if (e[k] === undefined || e[k] === null) errors.push(`falta ${k}`);
  if (!TYPES.includes(e.type)) errors.push(`type inválido ${e.type}`);
  if (!RULES.includes(e.rule)) errors.push(`rule inválida ${e.rule}`);
  if (![1, 2, 3].includes(e.tier)) errors.push(`tier inválido ${e.tier}`);
  if (!WORLDS[e.world]) errors.push(`world inválido ${e.world}`);

  // re-derivar todo desde la palabra: nada se confía a mano
  const a = analyze(e.word, { mente: e.rule === 'mente' });
  if (a.syllables.join('-') !== e.syllables.join('-'))
    errors.push(`sílabas ${e.syllables.join('-')} ≠ ${a.syllables.join('-')}`);
  if (a.stressIndex !== e.stressIndex)
    errors.push(`stressIndex ${e.stressIndex} ≠ ${a.stressIndex}`);
  if (a.type !== e.type) errors.push(`type ${e.type} ≠ ${a.type}`);
  if (a.hasTilde !== e.hasTilde) errors.push(`hasTilde ${e.hasTilde} ≠ ${a.hasTilde}`);
  if (!['interrogativa', 'diacritica'].includes(e.rule)) {
    if (a.rule !== e.rule) errors.push(`rule ${e.rule} ≠ ${a.rule}`);
    errors.push(...a.errors);
  } else if (e.rule === 'interrogativa' && !INTERROGATIVAS.has(e.word))
    errors.push('no es interrogativo');
  else if (e.rule === 'diacritica' && !DIACRITIC_PAIRS.has(e.word)) errors.push('no es diacrítico');
  if (e.distractor === e.word || stripTildes(e.distractor) !== stripTildes(e.word))
    errors.push(`distractor raro: ${e.distractor}`);

  if (e.sentence) {
    const m = [...e.sentence.matchAll(/\[([^\]]+)\]/g)];
    if (m.length !== 1) errors.push('la oración necesita exactamente una [palabra]');
    else if (m[0]?.[1]?.toLowerCase() !== e.word)
      errors.push(`la oración marca "${m[0]?.[1]}" y la palabra es "${e.word}"`);
  } else {
    const check = WORLD_CHECKS[e.world]?.(e);
    if (check !== true && check !== undefined) errors.push(check);
  }
  if (e.world === 9 || e.world === 10) {
    const check = WORLD_CHECKS[e.world]?.(e);
    if (check !== true && check !== undefined) errors.push(check);
  }

  if (lexicon) {
    const lex = lexicon[e.word];
    if (!lex) errors.push('falta en data/lexicon.json (correr check-lexicon)');
    else {
      if (!lex.valid) errors.push('no está en el diccionario es_AR (¿mal escrita?)');
      const amb = (lex.ambiguousWith ?? []).filter((v) => v !== e.word);
      if (amb.length && !e.sentence)
        errors.push(
          `ambigua sin contexto: también existe ${amb.join(', ')} → agregar oración o sacarla`,
        );
    }
  }
  return errors;
}

export { tildeVariants };
