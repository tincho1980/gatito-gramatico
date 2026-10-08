// §3 Puntos (XP) de una ronda.
import { CONFIG, type Config } from './config.ts';
import type { TurnResult } from './types.ts';

/** XP de un turno suelto, sin la racha. */
export function turnXp(turn: TurnResult, config: Config = CONFIG): number {
  const { xp } = config;
  let points = 0;
  if (turn.full) points = xp.full;
  else if (turn.steps.some((s) => s.correct)) points = xp.partial;
  if (turn.full && turn.challenge) points += xp.challenge;
  return points;
}

/** XP de la ronda: turnos + racha dentro de la ronda + jefe vencido. */
export function roundXp(
  turns: readonly TurnResult[],
  { bossWon = false }: { bossWon?: boolean } = {},
  config: Config = CONFIG,
): number {
  const { xp } = config;
  let total = 0;
  let streak = 0;
  for (const turn of turns) {
    total += turnXp(turn, config);
    streak = turn.full ? streak + 1 : 0;
    if (streak >= xp.streakFrom) total += xp.streakBonus;
  }
  return total + (bossWon ? xp.boss : 0);
}

export interface Level {
  level: number;
  /** XP juntado dentro del nivel actual. */
  into: number;
  /** XP que hace falta para pasar al siguiente. */
  needed: number;
}

/** §3 Nivel según el XP total: del nivel n al n + 1 hacen falta `step * n` XP. */
export function levelFor(xp: number, config: Config = CONFIG): Level {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= config.level.step * level) {
    rest -= config.level.step * level;
    level += 1;
  }
  return { level, into: rest, needed: config.level.step * level };
}
