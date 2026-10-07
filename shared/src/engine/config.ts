// Valores ajustables del juego (especificación §10). Se calibran después de probar con chicos.
// Ningún número de la lógica va suelto en el código: todo sale de acá.

export const CONFIG = {
  roundSize: 10,
  roundMix: { current: 5, review: 3, weakRule: 1, challenge: 1 },
  repeatPenalty: { lastRounds: 2, factor: 0.2 },
  /** Índice = caja. */
  leitnerIntervals: [0, 1, 2, 4, 8, 16],
  maxBox: 5,
  /** Horas mínimas desde la última vez vista, por caja. */
  minHoursForBoxes: { 4: 24, 5: 24 } as Record<number, number>,
  emaAlpha: 0.2,
  emaInitial: 0.5,
  /**
   * §6.2 Jefe: por regla, EMA ≥ minEma y, en los últimos `window` intentos, al menos
   * `minAccuracy` de `full`. Solo cuentan las reglas con al menos `minRuleShare` de las
   * palabras del mundo.
   */
  bossGate: { minEma: 0.85, window: 30, minAccuracy: 0.85, minRuleShare: 0.15 },
  /** `full` necesarios (sobre 10) para completar cada parada de práctica. */
  stopPass: { 2: 7, 3: 7, 4: 6 } as Record<number, number>,
  /** Mundos sin parada de desafío (§7.2). */
  worldsWithoutChallengeStop: [1] as readonly number[],
  /** Palabras del jefe por tier (§4.2). */
  bossTiers: [3, 4, 3],
  bossWin: 8,
  bossTwoStars: 9,
  threeStarsBoxShare: 0.8,
  threeStarsMinBox: 3,
  inRound: { errorsForHint: 3, fullsForChallenge: 5 },
  xp: { full: 10, partial: 4, streakBonus: 2, streakFrom: 3, challenge: 5, boss: 50 },
  croquetas: { box3: 1, box5: 2, boss: 10 },
  badges: {
    streaks: [3, 7, 30],
    comeback: { days: 7, minRise: 0.2 },
    notFooled: { minErrors: 3, fulls: 5 },
    nightOwl: { fromHour: 0, toHour: 5 },
  },
};

export type Config = typeof CONFIG;
