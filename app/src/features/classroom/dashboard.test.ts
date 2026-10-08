import { describe, expect, it } from 'vitest';
import type { DashboardStudent } from '@gatita/shared';
import {
  commonWorld,
  lastActivityText,
  levelOf,
  ruleSummaries,
  ruleToReview,
} from './dashboard.ts';

const student = (
  alias: string,
  world: number,
  rules: DashboardStudent['rules'],
): DashboardStudent => ({
  id: alias,
  alias,
  avatar: 'gris',
  world,
  lastActivity: null,
  roundsPlayed: 3,
  rules,
  stars: {},
});

describe('tablero docente', () => {
  it('nivel por EMA: domina desde 85 %, en camino desde 60 %', () => {
    expect([undefined, 0.3, 0.6, 0.84, 0.85, 1].map((e) => levelOf(e))).toEqual([
      'none',
      'low',
      'ok',
      'ok',
      'good',
      'good',
    ]);
  });

  it('el mundo que juega la mayoría', () => {
    expect(commonWorld([student('a', 3, {}), student('b', 2, {}), student('c', 3, {})])).toBe(3);
    expect(commonWorld([student('a', 4, {}), student('b', 2, {})])).toBe(2);
    expect(commonWorld([])).toBe(1);
  });

  it('promedio por regla y la regla para repasar con el curso', () => {
    const students = [
      student('a', 2, {
        '2:aguda_n_s_vocal': { ema: 0.9, attempts: 20 },
        '2:aguda_otra': { ema: 0.4, attempts: 8 },
      }),
      student('b', 2, {
        '2:aguda_n_s_vocal': { ema: 0.7, attempts: 20 },
        '2:aguda_otra': { ema: 0.6, attempts: 8 },
      }),
      student('c', 1, {}),
    ];
    const s = ruleSummaries(students, 2, ['aguda_n_s_vocal', 'aguda_otra', 'grave_otra']);
    expect(s[0]).toMatchObject({ played: 2 });
    expect(s[0]!.average).toBeCloseTo(0.8);
    expect(s[1]!.average).toBeCloseTo(0.5);
    expect(s[2]).toEqual({ rule: 'grave_otra', average: undefined, played: 0 });
    expect(ruleToReview(s)?.rule).toBe('aguda_otra');
    expect(ruleToReview([{ rule: 'aguda_otra', average: 0.9, played: 3 }])).toBeNull();
  });

  it('última actividad en palabras', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    expect(lastActivityText(null, now)).toBe('Nunca');
    expect(lastActivityText('2026-04-10T08:00:00Z', now)).toBe('Hoy');
    expect(lastActivityText('2026-04-09T08:00:00Z', now)).toBe('Ayer');
    expect(lastActivityText('2026-04-05T08:00:00Z', now)).toBe('Hace 5 días');
  });
});
