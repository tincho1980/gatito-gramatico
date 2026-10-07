// §5 Cajas de repaso (Leitner).
import { CONFIG, type Config } from './config.ts';
import { hoursBetween } from './dates.ts';
import type { TurnResult, WordMastery } from './types.ts';

export const initialWordMastery = (): WordMastery => ({
  box: 0,
  dueRound: 0,
  lastRound: 0,
  lastSeenAt: '',
  errors: 0,
  fullStreak: 0,
});

/** §5.1 Caja nueva según el resultado del turno. */
export function nextBox(box: number, turn: TurnResult, config: Config = CONFIG): number {
  if (turn.hinted) return box;
  return turn.full ? Math.min(box + 1, config.maxBox) : 1;
}

/**
 * §5.1 y §5.2 Aplica un turno (de práctica o jefe) a la palabra.
 * `roundsPlayed` es el valor antes de terminar esta ronda; `at`, el fin de la ronda.
 */
export function applyTurnToWord(
  m: WordMastery,
  turn: TurnResult,
  roundsPlayed: number,
  at: string,
  config: Config = CONFIG,
): WordMastery {
  const box = nextBox(m.box, turn, config);
  const next: WordMastery = {
    ...m,
    box,
    dueRound: turn.hinted ? m.dueRound : roundsPlayed + (config.leitnerIntervals[box] ?? 0),
    lastRound: roundsPlayed + 1,
    lastSeenAt: at,
  };
  if (!turn.hinted) {
    next.errors = m.errors + (turn.full ? 0 : 1);
    next.fullStreak = turn.full ? m.fullStreak + 1 : 0;
  }
  if (box >= 3 && !m.firstBox3At) next.firstBox3At = at;
  if (box >= 5 && !m.firstBox5At) next.firstBox5At = at;
  return next;
}

/** §5.2 ¿Vuelve como repaso? Las palabras en caja 0 nunca se jugaron: no son repaso. */
export function isDue(
  m: WordMastery,
  roundsPlayed: number,
  now: string,
  config: Config = CONFIG,
): boolean {
  if (m.box < 1) return false;
  if (roundsPlayed < m.dueRound) return false;
  const minHours = config.minHoursForBoxes[m.box];
  return minHours === undefined || hoursBetween(m.lastSeenAt, now) >= minHours;
}
