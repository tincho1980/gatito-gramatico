import { describe, expect, it } from 'vitest';
import { createRng, seedFrom, shuffle, weightedIndex, weightedSample } from './rng.ts';

describe('rng con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(createRng(43)()).not.toBe(xs[0]);
  });

  it('semilla estable desde un texto', () => {
    expect(seedFrom('ronda-1')).toBe(seedFrom('ronda-1'));
    expect(seedFrom('ronda-1')).not.toBe(seedFrom('ronda-2'));
  });

  it('el sorteo ponderado respeta los pesos', () => {
    const rng = createRng(1);
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i++) counts[weightedIndex([1, 0, 3], rng)]!++;
    expect(counts[1]).toBe(0);
    expect(counts[2]! / counts[0]!).toBeGreaterThan(2.5);
    expect(counts[2]! / counts[0]!).toBeLessThan(3.5);
    expect(weightedIndex([0, 0], rng)).toBe(-1);
    expect(weightedIndex([2], () => 0.9999999999)).toBe(0);
  });

  it('muestra sin reposición', () => {
    const rng = createRng(7);
    const out = weightedSample([1, 2, 3, 4, 5], 3, () => 1, rng);
    expect(new Set(out).size).toBe(3);
    expect(weightedSample([1, 2], 5, () => 1, rng)).toHaveLength(2);
    expect(weightedSample([1, 2], 2, () => 0, rng)).toEqual([]);
  });

  it('mezcla sin perder elementos', () => {
    const out = shuffle([1, 2, 3, 4, 5, 6], createRng(3));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
