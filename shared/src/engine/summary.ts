// §4.4 Resumen de fin de ronda: se calcula comparando el estado antes y después.
import type { Rule } from '../schemas.ts';
import { CONFIG, type Config } from './config.ts';
import { ruleKey } from './mastery.ts';
import type { ProfileState, Round, WordIndex } from './types.ts';

export interface RuleChange {
  world: number;
  rule: Rule;
  before: number;
  after: number;
}

export interface RoundSummary {
  fulls: number;
  total: number;
  xp: number;
  croquetas: number;
  /** La regla que más mejoró en la ronda (si alguna subió). */
  improved: RuleChange | null;
  /** La regla que conviene repasar: la de menor variación (si alguna no subió). */
  toReview: RuleChange | null;
  /** Palabras que subieron de caja por un turno `full`. */
  boxesUp: string[];
  /** Insignias e ítems de la colección nuevos. */
  newBadges: string[];
  newItems: string[];
  /** Mundos que se abrieron con esta ronda. */
  unlocked: number[];
}

export function summarizeRound(
  before: ProfileState,
  after: ProfileState,
  round: Round,
  words: WordIndex,
  config: Config = CONFIG,
): RoundSummary {
  const changes = new Map<string, RuleChange>();
  for (const t of round.turns) {
    const w = words.byId.get(t.wordId);
    if (!w || t.hinted) continue;
    const key = ruleKey(w.world, w.rule);
    if (changes.has(key)) continue;
    changes.set(key, {
      world: w.world,
      rule: w.rule,
      before: before.rules[key]?.ema ?? config.emaInitial,
      after: after.rules[key]?.ema ?? config.emaInitial,
    });
  }
  const sorted = [...changes.values()].sort((a, b) => b.after - b.before - (a.after - a.before));
  const best = sorted[0];
  const worst = sorted.at(-1);
  const delta = (c: RuleChange) => c.after - c.before;

  return {
    fulls: round.turns.filter((t) => t.full).length,
    total: round.turns.length,
    xp: after.xp - before.xp,
    croquetas: after.croquetas - before.croquetas,
    improved: best && delta(best) > 0 ? best : null,
    toReview: worst && delta(worst) <= 0 ? worst : null,
    // Solo las que subieron por acertar: una palabra nueva fallada pasa a caja 1, pero no "sube".
    boxesUp: [...new Set(round.turns.filter((t) => t.full).map((t) => t.wordId))].filter(
      (id) => (after.words[id]?.box ?? 0) > (before.words[id]?.box ?? 0),
    ),
    newBadges: Object.keys(after.badges).filter((id) => !before.badges[id]),
    newItems: after.owned.filter((id) => !before.owned.includes(id)),
    unlocked: Object.entries(after.worlds)
      .filter(([id, p]) => p.unlocked && !before.worlds[Number(id)]?.unlocked)
      .map(([id]) => Number(id)),
  };
}
