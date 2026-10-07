// §8.1 Racha con siesta de gato y §8.2 croquetas.
import { COLLECTION } from '../data/catalogs.ts';
import { CONFIG, type Config } from './config.ts';
import { addDays, daysBetween, weekOf } from './dates.ts';
import type { Streak, WordMastery } from './types.ts';

export const initialStreak = (): Streak => ({ days: 0, lastDay: null, napWeek: null });

/**
 * §8.1 Actualiza la racha al terminar una ronda el día `day` (hora del dispositivo).
 * Si faltó exactamente un día y la siesta de la semana de ese día está libre, se usa y la
 * racha sigue. Si no, vuelve a empezar.
 */
export function updateStreak(streak: Streak, day: string): Streak {
  if (!streak.lastDay) return { ...streak, days: 1, lastDay: day };
  const gap = daysBetween(streak.lastDay, day);
  if (gap <= 0) return streak;
  if (gap === 1) return { ...streak, days: streak.days + 1, lastDay: day };
  const missed = addDays(streak.lastDay, 1);
  if (gap === 2 && streak.napWeek !== weekOf(missed)) {
    return { days: streak.days + 1, lastDay: day, napWeek: weekOf(missed) };
  }
  return { ...streak, days: 1, lastDay: day };
}

/** Racha a mostrar hoy: se corta si ya no se puede salvar jugando hoy. */
export function currentStreak(streak: Streak, today: string): number {
  if (!streak.lastDay) return 0;
  const gap = daysBetween(streak.lastDay, today);
  if (gap <= 1) return streak.days;
  if (gap === 2 && streak.napWeek !== weekOf(addDays(streak.lastDay, 1))) return streak.days;
  return 0;
}

/** §8.2 Croquetas por llegar por primera vez a caja 3 o 5. */
export function croquetasForWord(
  before: WordMastery | undefined,
  after: WordMastery,
  config: Config = CONFIG,
): number {
  let n = 0;
  if (after.firstBox3At && !before?.firstBox3At) n += config.croquetas.box3;
  if (after.firstBox5At && !before?.firstBox5At) n += config.croquetas.box5;
  return n;
}

/** §7.3 y §8.3 Ítems de la colección que se ganan al vencer al jefe del mundo. */
export const bossRewards = (world: number): string[] =>
  COLLECTION.filter((item) => item.unlockedBy?.boss === world).map((item) => item.id);
