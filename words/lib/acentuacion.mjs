// Motor de acentuación del español (ortografía RAE 2010).
// Separa en sílabas, ubica la sílaba tónica y explica por qué una palabra
// lleva o no tilde. Sin dependencias: lo usan el build y el validador.

const STRONG = new Set(['a', 'e', 'o', 'á', 'é', 'ó']);
const WEAK = new Set(['i', 'u', 'ü']);
const ACCENTED_WEAK = new Set(['í', 'ú']);
const ACCENTED = new Set(['á', 'é', 'í', 'ó', 'ú']);
const PLAIN_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const STRIP = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const ADD = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
// Grupos que no se separan (pla, bra, tri...). "tl" y "dl" se separan (at-le-ta).
const ONSETS = new Set(['pl', 'pr', 'bl', 'br', 'fl', 'fr', 'cl', 'cr', 'gl', 'gr', 'dr', 'tr', 'kl', 'kr']);

// Monosílabos que llevan tilde diacrítica (los únicos válidos).
export const DIACRITICOS = new Set(['tú', 'él', 'mí', 'sí', 'té', 'dé', 'sé', 'más', 'qué', 'quién', 'cuál', 'cuán']);

export const TYPES = ['monosilaba', 'aguda', 'grave', 'esdrujula', 'sobreesdrujula'];
export const RULES = [
  'monosilabo', 'diacritica', 'hiato',
  'aguda_n_s_vocal', 'aguda_otra', 'grave_n_s_vocal', 'grave_otra',
  'esdrujula', 'sobreesdrujula', 'interrogativa', 'mente',
];

export const isVowelChar = (c) => STRONG.has(c) || WEAK.has(c) || ACCENTED_WEAK.has(c);
export const stripTildes = (w) => w.replace(/[áéíóú]/g, (c) => STRIP[c]);
export const hasTildeMark = (w) => /[áéíóú]/.test(w);

// Parte la palabra en unidades: vocales y consonantes (ch, ll, rr, qu, gu+e/i cuentan como una).
function units(word) {
  const w = word.toLowerCase();
  const out = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const two = w.slice(i, i + 2);
    const next2 = w[i + 2];
    if (two === 'ch' || two === 'll' || two === 'rr') { out.push({ t: two, v: false }); i++; continue; }
    if ((two === 'qu' || two === 'gu') && next2 && 'eiéí'.includes(next2)) { out.push({ t: two, v: false }); i++; continue; }
    if (c === 'y') {
      // "y" es vocal solo al final detrás de vocal (rey, hoy, muy) o sola.
      const prevVowel = i > 0 && isVowelChar(w[i - 1]);
      const atEnd = i === w.length - 1;
      out.push({ t: c, v: (atEnd && prevVowel) || w.length === 1, weak: true });
      continue;
    }
    if (isVowelChar(c)) out.push({ t: c, v: true, strong: STRONG.has(c), accWeak: ACCENTED_WEAK.has(c) });
    else out.push({ t: c, v: false });
  }
  return out;
}

// ¿Dos vocales seguidas van en la misma sílaba?
function sameNucleus(a, b) {
  if (a.strong && b.strong) return false; // a-e, o-a: hiato
  if ((a.accWeak && b.strong) || (b.accWeak && a.strong)) return false; // í/ú tónica junto a fuerte: hiato
  return true; // diptongo (incluye débil+débil: ciu-dad, cuí-da-te)
}

export function syllabify(word) {
  const u = units(word);
  // 1) agrupar vocales en núcleos
  const nuclei = []; // [{start, end}] índices de unidades
  for (let i = 0; i < u.length; i++) {
    if (!u[i].v) continue;
    const last = nuclei[nuclei.length - 1];
    if (last && last.end === i - 1 && sameNucleus(u[i - 1], u[i]) && last.end - last.start < 2) last.end = i;
    else nuclei.push({ start: i, end: i });
  }
  if (nuclei.length === 0) return [word.toLowerCase()];
  // 2) repartir consonantes entre núcleos
  const cuts = []; // índice de unidad donde arranca cada sílaba (salvo la primera)
  for (let k = 0; k < nuclei.length - 1; k++) {
    const from = nuclei[k].end + 1;
    const to = nuclei[k + 1].start; // exclusivo
    const cons = u.slice(from, to).map((x) => x.t);
    const n = cons.length;
    let take; // cuántas consonantes van a la sílaba siguiente
    if (n === 0) take = 0;
    else if (n === 1) take = 1;
    else {
      const lastTwo = cons[n - 2] + cons[n - 1];
      take = ONSETS.has(lastTwo) ? 2 : 1;
      if (n === 2 && !ONSETS.has(lastTwo)) take = 1;
    }
    cuts.push(to - take);
  }
  const syl = [];
  let start = 0;
  for (const c of cuts) { syl.push(u.slice(start, c).map((x) => x.t).join('')); start = c; }
  syl.push(u.slice(start).map((x) => x.t).join(''));
  return syl;
}

// Termina en n, s (detrás de vocal) o vocal. La "y" final cuenta como consonante (reloj, virrey).
export function endsNSV(word) {
  const w = word.toLowerCase();
  const last = w[w.length - 1];
  const prev = w[w.length - 2];
  if (PLAIN_VOWELS.has(stripTildes(last))) return true;
  if (last === 'n') return true;
  if (last === 's') return prev !== undefined && isVowelChar(prev); // bíceps, robots: no
  return false;
}

export function stressIndex(word, syllables = syllabify(word)) {
  const i = syllables.findIndex((s) => hasTildeMark(s));
  if (i >= 0) return i;
  if (syllables.length === 1) return 0;
  return endsNSV(word) ? syllables.length - 2 : syllables.length - 1;
}

export function typeFor(nSyl, idx) {
  if (nSyl === 1) return 'monosilaba';
  return ['aguda', 'grave', 'esdrujula', 'sobreesdrujula', 'sobreesdrujula', 'sobreesdrujula'][nSyl - 1 - idx];
}

// Vocal tónica: í/ú con tilde al lado de una fuerte (salteando la h) → hiato que obliga tilde.
export function hasForcedHiatus(word) {
  const w = word.toLowerCase().replace(/h/g, '');
  for (let i = 0; i < w.length; i++) {
    if (!ACCENTED_WEAK.has(w[i])) continue;
    if (STRONG.has(w[i - 1]) || STRONG.has(w[i + 1])) return true;
  }
  return false;
}

export function features(syllables) {
  const f = new Set();
  syllables.forEach((s, i) => {
    const clean = s.replace(/([qg])u(?=[eiéí])/g, '$1'); // la u de que/gui no suena
    const vowels = [...clean].filter(isVowelChar).length + (/[aeiouáéíóú]y$/.test(clean) ? 1 : 0);
    if (vowels === 2) f.add('diptongo');
    if (vowels >= 3) f.add('triptongo');
    const next = syllables[i + 1];
    if (next && isVowelChar(s[s.length - 1]) && (isVowelChar(next[0]) || (next[0] === 'h' && isVowelChar(next[1] ?? '')))) f.add('hiato');
  });
  return [...f];
}

// Clasificación completa. opts.mente: adverbio en -mente (conserva la tilde del adjetivo).
export function analyze(word, opts = {}) {
  const w = word.toLowerCase();
  const syllables = syllabify(w);
  const hasTilde = hasTildeMark(w);
  const errors = [];
  let idx, type, rule;

  if (opts.mente) {
    if (!w.endsWith('mente')) errors.push('marcada como -mente pero no termina en -mente');
    const base = w.slice(0, -5);
    const b = analyze(base);
    idx = b.stressIndex;
    type = b.type;
    rule = 'mente';
    if (b.errors.length) errors.push(...b.errors.map((e) => `base "${base}": ${e}`));
  } else {
    idx = stressIndex(w, syllables);
    type = typeFor(syllables.length, idx);
    if (syllables.length === 1) {
      rule = hasTilde ? 'diacritica' : 'monosilabo';
      if (hasTilde && !DIACRITICOS.has(w)) errors.push('monosílabo con tilde que no es diacrítico');
    } else if (hasForcedHiatus(w)) {
      rule = 'hiato';
    } else if (type === 'aguda' || type === 'grave') {
      rule = `${type}_${endsNSV(w) ? 'n_s_vocal' : 'otra'}`;
    } else {
      rule = type;
    }
    if ([...w].filter((c) => ACCENTED.has(c)).length > 1) errors.push('más de una tilde');
    const expected = {
      aguda_n_s_vocal: true, aguda_otra: false, grave_n_s_vocal: false, grave_otra: true,
      esdrujula: true, sobreesdrujula: true, hiato: true, monosilabo: false, diacritica: true,
    }[rule];
    if (expected !== hasTilde) errors.push(`la regla ${rule} pide ${expected ? '' : 'NO '}llevar tilde`);
  }
  return { word: w, syllables, stressIndex: idx, type, hasTilde, rule, features: features(syllables), errors };
}

// Pone la tilde en la vocal tónica de una sílaba: la fuerte si hay; si son dos débiles, la segunda.
function accentSyllable(s) {
  const chars = [...s];
  const vi = chars.map((c, i) => (PLAIN_VOWELS.has(c) ? i : -1)).filter((i) => i >= 0);
  if (!vi.length) return s;
  const strong = vi.find((i) => STRONG.has(chars[i]));
  const target = strong ?? vi[vi.length - 1];
  chars[target] = ADD[chars[target]];
  return chars.join('');
}

// El error más probable: sacarle la tilde a la que lleva, o ponérsela a la que no lleva.
export function distractor(word, a = analyze(word)) {
  if (a.hasTilde) return stripTildes(a.word);
  return a.syllables.map((s, i) => (i === a.stressIndex ? accentSyllable(s) : s)).join('');
}

// Todas las formas que se escriben igual sin tilde (para detectar ambigüedad: papa/papá).
export function tildeVariants(word) {
  const base = stripTildes(word.toLowerCase());
  const out = new Set([base]);
  [...base].forEach((c, i) => { if (PLAIN_VOWELS.has(c)) out.add(base.slice(0, i) + ADD[c] + base.slice(i + 1)); });
  out.delete(word.toLowerCase());
  return [...out];
}
