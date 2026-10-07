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
