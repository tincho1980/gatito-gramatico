import { describe, expect, it } from 'vitest';
import { perfectPlayer, randomPlayer, simulate } from './testing.ts';

describe('simulación', () => {
  it('un chico perfecto llega del mundo 1 al 10 en un número finito de rondas', () => {
    const { bossBeatenAt } = simulate(perfectPlayer, { maxRounds: 1000 });
    expect(Object.keys(bossBeatenAt).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(bossBeatenAt[10]).toBeLessThan(200);
  });

  it('un chico que acierta el 50 % nunca habilita un jefe en 100 rondas', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { bossEverEnabled, state } = simulate(randomPlayer(0.5), { maxRounds: 100, seed });
      expect(bossEverEnabled).toBe(false);
      expect(Object.values(state.worlds).every((w) => w.stars === 0)).toBe(true);
    }
  });
});
