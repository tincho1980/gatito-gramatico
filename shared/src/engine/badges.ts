// §8.4 Insignias: una función de criterio por insignia del catálogo (data/badges.json).
import { CONFIG, type Config } from './config.ts';
import { addDays, localHour } from './dates.ts';
import type { ProfileState, Round, WordMastery } from './types.ts';

export interface BadgeContext {
  /** Estado después de aplicar la ronda. */
  state: ProfileState;
  /** Estado antes de aplicarla. */
  before: ProfileState;
  round: Round;
  /** Día local de la ronda (`YYYY-MM-DD`). */
  day: string;
  config: Config;
}

type Criterion = (ctx: BadgeContext) => boolean;

/** Remontada: una regla jugada en la ronda subió ≥ minRise respecto de hace `days` días. */
function comeback({ state, before, day, config }: BadgeContext): boolean {
  const { days, minRise } = config.badges.comeback;
  const limit = addDays(day, -days);
  return Object.entries(state.rules).some(([key, m]) => {
    if (before.rules[key]?.attempts === m.attempts) return false; // no se jugó en esta ronda
    const past = (state.ruleDaily[key] ?? []).filter((s) => s.day <= limit).at(-1);
    return past !== undefined && m.ema - past.ema >= minRise - 1e-9;
  });
}

/** Ya no me engañan: una palabra con ≥ 3 errores llega en esta ronda a 5 `full` seguidos. */
function notFooled({ state, before, config }: BadgeContext): boolean {
  const { minErrors, fulls } = config.badges.notFooled;
  const reached = (m: WordMastery | undefined) =>
    !!m && m.errors >= minErrors && m.fullStreak >= fulls;
  return Object.entries(state.words).some(([id, m]) => reached(m) && !reached(before.words[id]));
}

const criteria: Record<string, Criterion> = {
  'primera-ronda': ({ state }) => state.roundsPlayed >= 1,
  remontada: comeback,
  'ya-no-me-enganan': notFooled,
  trasnochadora: ({ round, config }) => {
    const h = localHour(round.finishedAt, round.tzOffsetMin);
    return h >= config.badges.nightOwl.fromHour && h < config.badges.nightOwl.toHour;
  },
};
for (const n of CONFIG.badges.streaks) {
  criteria[`racha-${n}`] = ({ state }) => state.streak.days >= n;
}
for (let w = 1; w <= 10; w++) {
  criteria[`mundo-${w}`] = ({ state }) => (state.worlds[w]?.stars ?? 0) >= 3;
}

export const BADGE_CRITERIA: Readonly<Record<string, Criterion>> = criteria;

/** Insignias nuevas que se ganan con esta ronda. */
export function newBadges(ctx: BadgeContext): string[] {
  return Object.entries(BADGE_CRITERIA)
    .filter(([id, test]) => !ctx.before.badges[id] && test(ctx))
    .map(([id]) => id);
}
