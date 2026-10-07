import { describe, expect, it } from 'vitest';
import { roundXp, turnXp } from './scoring.ts';
import { turn } from './testing.ts';

const full = turn({ full: true });
const partial = turn({
  full: false,
  steps: [
    { step: 'tonica', correct: true },
    { step: 'tilde', correct: false },
  ],
});
const zero = turn({ full: false, steps: [{ step: 'tilde', correct: false }] });

describe('§3 puntos', () => {
  it('§3 turno full: 10', () => expect(turnXp(full)).toBe(10));
  it('§3 turno con algún paso correcto, no full: 4', () => expect(turnXp(partial)).toBe(4));
  it('§3 turno sin pasos correctos: 0', () => expect(turnXp(zero)).toBe(0));
  it('§3 desafío resuelto full: +5', () => {
    expect(turnXp(turn({ full: true, challenge: true }))).toBe(15);
    expect(turnXp(turn({ full: false, challenge: true }))).toBe(0);
  });

  it('§3 racha: +2 por cada full desde el 3.º seguido', () => {
    expect(roundXp([full, full])).toBe(20);
    expect(roundXp([full, full, full])).toBe(32);
    expect(roundXp([full, full, full, full])).toBe(44);
    expect(roundXp([full, full, zero, full, full, full])).toBe(52);
  });

  it('§3 jefe vencido: +50', () => {
    expect(roundXp([], { bossWon: true })).toBe(50);
    expect(roundXp([])).toBe(0);
  });
});
