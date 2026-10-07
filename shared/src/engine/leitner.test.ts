import { describe, expect, it } from 'vitest';
import { applyTurnToWord, initialWordMastery, isDue, nextBox } from './leitner.ts';
import { turn } from './testing.ts';

const AT = '2026-03-02T10:00:00.000Z';
const full = turn({ full: true });
const miss = turn({ full: false });
const hinted = turn({ full: false, hinted: true });

describe('§5.1 transiciones', () => {
  it('§5.1 full sube una caja, desde 0 pasa a 1, tope 5', () => {
    expect(nextBox(0, full)).toBe(1);
    expect(nextBox(3, full)).toBe(4);
    expect(nextBox(5, full)).toBe(5);
  });

  it('§5.1 no full vuelve a caja 1', () => {
    expect(nextBox(4, miss)).toBe(1);
    expect(nextBox(0, miss)).toBe(1);
  });

  it('§5.1 con pista no cambia la caja', () => {
    expect(nextBox(3, hinted)).toBe(3);
    const m = applyTurnToWord({ ...initialWordMastery(), box: 3, dueRound: 9 }, hinted, 5, AT);
    expect(m.box).toBe(3);
    expect(m.dueRound).toBe(9);
    expect(m.errors).toBe(0);
  });

  it('§5.1 guarda last_round y last_seen_at', () => {
    const m = applyTurnToWord(initialWordMastery(), full, 7, AT);
    expect(m.lastRound).toBe(8);
    expect(m.lastSeenAt).toBe(AT);
  });

  it('cuenta errores y full seguidos', () => {
    let m = initialWordMastery();
    m = applyTurnToWord(m, miss, 0, AT);
    m = applyTurnToWord(m, full, 1, AT);
    m = applyTurnToWord(m, full, 2, AT);
    expect(m.errors).toBe(1);
    expect(m.fullStreak).toBe(2);
    m = applyTurnToWord(m, miss, 3, AT);
    expect(m.fullStreak).toBe(0);
  });

  it('registra la primera vez en caja 3 y en caja 5', () => {
    let m = { ...initialWordMastery(), box: 2 };
    m = applyTurnToWord(m, full, 0, AT);
    expect(m.firstBox3At).toBe(AT);
    m = applyTurnToWord(m, full, 1, '2026-03-05T10:00:00.000Z');
    m = applyTurnToWord(m, full, 2, '2026-03-06T10:00:00.000Z');
    expect(m.firstBox3At).toBe(AT);
    expect(m.firstBox5At).toBe('2026-03-06T10:00:00.000Z');
  });
});

describe('§5.2 cuándo vuelve una palabra', () => {
  it('§5.2 due_round = rondas jugadas al responder + intervalo de la caja', () => {
    const intervals = [1, 2, 4, 8, 16];
    intervals.forEach((interval, i) => {
      const m = applyTurnToWord({ ...initialWordMastery(), box: i }, full, 10, AT);
      expect(m.box).toBe(i + 1);
      expect(m.dueRound).toBe(10 + interval);
    });
  });

  it('§5.2 caja 1 vuelve en la próxima ronda', () => {
    const m = applyTurnToWord(initialWordMastery(), miss, 10, AT);
    expect(isDue(m, 10, AT)).toBe(false);
    expect(isDue(m, 11, AT)).toBe(true);
  });

  it('§5.2 caja 4 exige 24 h desde last_seen_at', () => {
    const m = { ...initialWordMastery(), box: 4, dueRound: 5, lastSeenAt: AT };
    expect(isDue(m, 5, '2026-03-03T09:59:00.000Z')).toBe(false);
    expect(isDue(m, 5, '2026-03-03T10:00:00.000Z')).toBe(true);
    expect(isDue(m, 4, '2026-03-04T10:00:00.000Z')).toBe(false);
  });

  it('§5.2 caja 5 exige 24 h; caja 3 no', () => {
    expect(isDue({ ...initialWordMastery(), box: 5, dueRound: 1, lastSeenAt: AT }, 1, AT)).toBe(
      false,
    );
    expect(isDue({ ...initialWordMastery(), box: 3, dueRound: 1, lastSeenAt: AT }, 1, AT)).toBe(
      true,
    );
  });

  it('§5.2 una palabra nunca jugada (caja 0) no es repaso', () => {
    expect(isDue(initialWordMastery(), 100, AT)).toBe(false);
  });
});
