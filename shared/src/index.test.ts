import { describe, expect, it } from 'vitest';
import { clamp } from './index';

describe('clamp', () => {
  it('deja el valor si está en rango', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('lo lleva a los extremos si se pasa', () => {
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(42, 1, 10)).toBe(10);
  });
});
