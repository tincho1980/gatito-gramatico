// §4 Armado de la ronda, ronda del jefe y ajuste dentro de la ronda.
import type { WordEntry } from '../schemas.ts';
import { CONFIG, type Config } from './config.ts';
import { isDue } from './leitner.ts';
import { ruleKey } from './mastery.ts';
import { shuffle, weightedSample, type Rng } from './rng.ts';
import type { ProfileState, Stop, TurnResult, WordIndex } from './types.ts';
import { stepsFor } from './turn.ts';
import { tierOfStop, unlockedWorlds } from './worlds.ts';

export type Slot = 'current' | 'review' | 'weakRule' | 'challenge' | 'fill' | 'boss' | 'lower';

export interface PlannedWord {
  word: WordEntry;
  slot: Slot;
  /** Se muestra con la tónica resaltada (§4.3). */
  hinted: boolean;
}

export interface RoundContext {
  state: ProfileState;
  words: WordIndex;
  world: number;
  stop: Stop;
  rng: Rng;
  /** Instante en que se arma la ronda (ISO): para la regla de 24 h. */
  now: string;
  config?: Config;
}

/** §4.1 Peso en el sorteo: (1 + errores previos) × penalización por repetición. */
function weightFor(state: ProfileState, config: Config) {
  const recent = new Set(state.recentRounds.slice(-config.repeatPenalty.lastRounds).flat());
  return (w: WordEntry) =>
    (1 + (state.words[w.id]?.errors ?? 0)) * (recent.has(w.id) ? config.repeatPenalty.factor : 1);
}

/**
 * Sorteo por prioridad: se recorren los grupos en orden de prioridad y dentro de cada grupo
 * (empate de prioridad) se sortea ponderado.
 */
function pickPrioritized(
  candidates: readonly WordEntry[],
  count: number,
  priority: (w: WordEntry) => number[],
  weight: (w: WordEntry) => number,
  rng: Rng,
): WordEntry[] {
  const groups = new Map<string, { key: number[]; words: WordEntry[] }>();
  for (const w of candidates) {
    const key = priority(w);
    const id = key.join('|');
    const g = groups.get(id) ?? { key, words: [] };
    g.words.push(w);
    groups.set(id, g);
  }
  const ordered = [...groups.values()].sort((a, b) => compareKeys(a.key, b.key));
  const out: WordEntry[] = [];
  for (const g of ordered) {
    if (out.length >= count) break;
    out.push(...weightedSample(g.words, count - out.length, weight, rng));
  }
  return out;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

const boxOf = (state: ProfileState, w: WordEntry) => state.words[w.id]?.box ?? 0;

/** Candidatas "nuevas o en curso": caja 0–2 del tier; primero caja 1–2, después caja 0 por freq. */
function currentPriority(state: ProfileState) {
  return (w: WordEntry) => (boxOf(state, w) >= 1 ? [0, 0] : [1, -(w.freq ?? 0)]);
}

/** §4.1 Arma una ronda de práctica (paradas 2 a 4). */
export function buildRound(ctx: RoundContext): PlannedWord[] {
  const config = ctx.config ?? CONFIG;
  const { state, words, world, stop, rng, now } = ctx;
  const mix = config.roundMix;
  const weight = weightFor(state, config);
  const worldWords = words.byWorld.get(world) ?? [];
  const tier = tierOfStop(stop);
  const used = new Set<string>();
  const planned: PlannedWord[] = [];
  const take = (list: WordEntry[], slot: Slot) => {
    for (const word of list) {
      used.add(word.id);
      planned.push({ word, slot, hinted: false });
    }
  };
  const free = (w: WordEntry) => !used.has(w.id);

  // Nuevas o en curso
  const currentCandidates = () =>
    worldWords.filter((w) => w.tier === tier && boxOf(state, w) <= 2 && free(w));
  take(
    pickPrioritized(currentCandidates(), mix.current, currentPriority(state), weight, rng),
    'current',
  );

  // Repasos vencidos de cualquier mundo desbloqueado
  const open = new Set(unlockedWorlds(state.worlds));
  const reviews = [...open]
    .flatMap((id) => words.byWorld.get(id) ?? [])
    .filter(
      (w) =>
        free(w) && state.words[w.id] && isDue(state.words[w.id]!, state.roundsPlayed, now, config),
    );
  take(
    pickPrioritized(
      reviews,
      mix.review,
      (w) => [boxOf(state, w), state.words[w.id]?.dueRound ?? 0],
      weight,
      rng,
    ),
    'review',
  );

  // Regla floja de los mundos completados
  take(weakRuleWords(ctx, config, free, weight).slice(0, mix.weakRule), 'weakRule');

  // Desafío
  take(challengeWords(ctx, config, free, weight, mix.challenge), 'challenge');

  // Relleno: primero el cupo de nuevas o en curso, después cualquier palabra del mundo
  const missing = () => config.roundSize - planned.length;
  if (missing() > 0) {
    take(
      pickPrioritized(currentCandidates(), missing(), currentPriority(state), weight, rng),
      'fill',
    );
  }
  if (missing() > 0) {
    take(weightedSample(worldWords.filter(free), missing(), weight, rng), 'fill');
  }

  return orderRound(planned, rng);
}

/** §4.1 Una palabra de la regla con menor EMA entre los mundos completados (jefe vencido). */
function weakRuleWords(
  { state, words, rng }: Pick<RoundContext, 'state' | 'words' | 'rng'>,
  config: Config,
  free: (w: WordEntry) => boolean,
  weight: (w: WordEntry) => number,
): WordEntry[] {
  let weakest: { world: number; rule: WordEntry['rule']; ema: number } | null = null;
  const completed = Object.entries(state.worlds)
    .filter(([, p]) => p.bossBest !== null)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
  for (const world of completed) {
    const rules = [...new Set((words.byWorld.get(world) ?? []).map((w) => w.rule))];
    for (const rule of rules) {
      const m = state.rules[ruleKey(world, rule)];
      if (!m || m.attempts === 0) continue;
      if (!weakest || m.ema < weakest.ema) weakest = { world, rule, ema: m.ema };
    }
  }
  if (!weakest) return [];
  const { world, rule } = weakest;
  const pool = (words.byWorld.get(world) ?? []).filter((w) => w.rule === rule && free(w));
  return weightedSample(pool, config.roundMix.weakRule, weight, rng);
}

/**
 * §4.1 Desafío: tier siguiente del mismo mundo; desde tier 3, el mundo siguiente desbloqueado;
 * si no hay, tier 3 del mundo actual. Se prefieren palabras todavía no dominadas (caja < 3).
 */
function challengeWords(
  {
    state,
    words,
    world,
    stop,
    rng,
  }: Pick<RoundContext, 'state' | 'words' | 'world' | 'stop' | 'rng'>,
  config: Config,
  free: (w: WordEntry) => boolean,
  weight: (w: WordEntry) => number,
  count: number,
): WordEntry[] {
  const tier = tierOfStop(stop);
  const worldWords = words.byWorld.get(world) ?? [];
  const sources: (readonly WordEntry[])[] = [];
  if (tier < 3) sources.push(worldWords.filter((w) => w.tier === tier + 1));
  else {
    const next = unlockedWorlds(state.worlds)
      .filter((id) => id > world)
      .sort((a, b) => a - b)[0];
    if (next !== undefined) sources.push(words.byWorld.get(next) ?? []);
  }
  sources.push(worldWords.filter((w) => w.tier === 3));
  for (const source of sources) {
    const pool = source.filter(free);
    if (pool.length === 0) continue;
    return pickPrioritized(
      pool,
      count,
      (w) => [boxOf(state, w) < config.threeStarsMinBox ? 0 : 1],
      weight,
      rng,
    );
  }
  return [];
}

/** §4.1 Orden final mezclado; el desafío nunca va primero. */
function orderRound(planned: PlannedWord[], rng: Rng): PlannedWord[] {
  const out = shuffle(planned, rng);
  if (out.length > 1 && out[0]?.slot === 'challenge') {
    const j = 1 + Math.floor(rng() * (out.length - 1));
    [out[0], out[j]] = [out[j] as PlannedWord, out[0] as PlannedWord];
  }
  return out;
}

/** §4.2 Ronda del jefe: 3 de tier 1, 4 de tier 2 y 3 de tier 3 del mundo, sin repasos. */
export function buildBossRound(ctx: Omit<RoundContext, 'stop'>): PlannedWord[] {
  const config = ctx.config ?? CONFIG;
  const { state, words, world, rng } = ctx;
  const weight = weightFor(state, config);
  const worldWords = words.byWorld.get(world) ?? [];
  const picked: WordEntry[] = [];
  config.bossTiers.forEach((n, i) => {
    const pool = worldWords.filter((w) => w.tier === i + 1);
    picked.push(...weightedSample(pool, n, weight, rng));
  });
  // Si un tier no alcanza, se completa con el resto del mundo.
  const total = config.bossTiers.reduce((a, b) => a + b, 0);
  const ids = new Set(picked.map((w) => w.id));
  picked.push(
    ...weightedSample(
      worldWords.filter((w) => !ids.has(w.id)),
      total - picked.length,
      weight,
      rng,
    ),
  );
  return shuffle(picked, rng).map((word) => ({ word, slot: 'boss', hinted: false }));
}

/**
 * §4.3 La pista (tónica resaltada) solo tiene sentido si la palabra tiene el paso de tónica y
 * algún otro: en el mundo 1 la pista daría la respuesta, y en oraciones o monosílabos no ayuda.
 */
export const canHint = (word: WordEntry): boolean => {
  const steps = stepsFor(word);
  return steps.includes('tonica') && steps.length > 1;
};

/** Estado de la ronda en curso, para el ajuste §4.3. */
export interface RoundProgress {
  kind: 'practice' | 'boss';
  world: number;
  stop: Stop;
  planned: PlannedWord[];
  turns: TurnResult[];
  /** Turnos seguidos no `full` desde el último ajuste. */
  missStreak: number;
  /** Turnos `full` seguidos. */
  fullStreak: number;
  extraAdded: boolean;
}

export const startRound = (
  kind: RoundProgress['kind'],
  world: number,
  stop: Stop,
  planned: PlannedWord[],
): RoundProgress => ({
  kind,
  world,
  stop,
  planned,
  turns: [],
  missStreak: 0,
  fullStreak: 0,
  extraAdded: false,
});

/** Registra un turno terminado. */
export function recordTurn(progress: RoundProgress, turn: TurnResult): RoundProgress {
  return {
    ...progress,
    turns: [...progress.turns, turn],
    missStreak: turn.full ? 0 : progress.missStreak + 1,
    fullStreak: turn.full ? progress.fullStreak + 1 : 0,
  };
}

export interface NextWordContext {
  state: ProfileState;
  words: WordIndex;
  rng: Rng;
  config?: Config;
}

/**
 * §4.3 Próxima palabra, con el ajuste dentro de la ronda. Devuelve `next: null` al terminar.
 * - 3 turnos seguidos no `full`: la próxima se cambia por una del tier inferior del mismo mundo,
 *   con pista. Si no hay tier inferior (práctica de tier 1), se muestra la planeada con pista.
 * - 5 `full` seguidos: se agrega un desafío al final, una vez por ronda.
 * - No aplica al jefe.
 */
export function nextWord(
  progress: RoundProgress,
  ctx: NextWordContext,
): { progress: RoundProgress; next: PlannedWord | null } {
  const config = ctx.config ?? CONFIG;
  const { inRound } = config;
  let p = progress;
  const i = p.turns.length;

  if (p.kind === 'practice') {
    if (p.fullStreak >= inRound.fullsForChallenge && !p.extraAdded) {
      const used = new Set(p.planned.map((x) => x.word.id));
      const weight = weightFor(ctx.state, config);
      const [extra] = challengeWords(
        { ...ctx, world: p.world, stop: p.stop },
        config,
        (w) => !used.has(w.id),
        weight,
        1,
      );
      if (extra)
        p = { ...p, planned: [...p.planned, { word: extra, slot: 'challenge', hinted: false }] };
      p = { ...p, extraAdded: true };
    }

    const planned = p.planned[i];
    if (planned && p.missStreak >= inRound.errorsForHint) {
      const tier = tierOfStop(p.stop);
      const used = new Set(p.planned.map((x) => x.word.id));
      const lower = (ctx.words.byWorld.get(p.world) ?? []).filter(
        (w) => w.tier === tier - 1 && !used.has(w.id),
      );
      const [easier] = weightedSample(lower, 1, weightFor(ctx.state, config), ctx.rng);
      const replacement: PlannedWord = easier
        ? { word: easier, slot: 'lower', hinted: canHint(easier) }
        : { ...planned, hinted: canHint(planned.word) };
      const planned2 = [...p.planned];
      planned2[i] = replacement;
      p = { ...p, planned: planned2, missStreak: 0 };
    }
  }

  return { progress: p, next: p.planned[i] ?? null };
}
