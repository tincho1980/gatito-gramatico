import { describe, expect, it } from 'vitest';
import { gateRules, ruleKey } from './mastery.ts';
import { bossGateStatus, playAction, stopAction, worldStatus } from './play.ts';
import { initialState } from './state.ts';
import { WORDS } from './testing.ts';
import type { ProfileState, RuleMastery } from './types.ts';

const mastered = (): RuleMastery => ({ ema: 0.95, attempts: 60, recent: Array(30).fill(1) });
const words2 = WORDS.byWorld.get(2) ?? [];

function withWorld2(stopsDone: number[], bossReady = false): ProfileState {
  const s = initialState();
  s.worlds[1] = { unlocked: true, stopsDone: [1, 2, 3, 5], bossBest: 8, stars: 1 };
  s.worlds[2] = { unlocked: true, stopsDone: stopsDone as never, bossBest: null, stars: 0 };
  s.lastWorld = 2;
  if (bossReady) for (const r of gateRules(words2)) s.rules[ruleKey(2, r)] = mastered();
  return s;
}

describe('estado de los mundos en el mapa', () => {
  it('bloqueado, disponible, en curso y completo', () => {
    const s = withWorld2([1]);
    expect(worldStatus(s, 1)).toBe('complete');
    expect(worldStatus(s, 2)).toBe('inProgress');
    s.worlds[3] = { unlocked: true, stopsDone: [], bossBest: null, stars: 0 };
    expect(worldStatus(s, 3)).toBe('available');
    expect(worldStatus(s, 5)).toBe('locked');
    expect(worldStatus(s, 99)).toBe('locked');
  });
});

describe('§7.2 botón Jugar', () => {
  it('§7.2 perfil nuevo: la lección del mundo 1', () => {
    expect(playAction(initialState(), WORDS)).toEqual({ kind: 'lesson', world: 1, stop: 1 });
  });

  it('§7.2 la parada más avanzada no completada del último mundo jugado', () => {
    expect(playAction(withWorld2([1, 2]), WORDS)).toEqual({ kind: 'practice', world: 2, stop: 3 });
  });

  it('§7.2 paradas completas sin jefe habilitado: repite la última práctica', () => {
    expect(playAction(withWorld2([1, 2, 3, 4]), WORDS)).toEqual({
      kind: 'practice',
      world: 2,
      stop: 4,
    });
  });

  it('§7.2 con el jefe habilitado: el jefe', () => {
    expect(playAction(withWorld2([1, 2, 3, 4], true), WORDS)).toEqual({
      kind: 'boss',
      world: 2,
      stop: 5,
    });
  });

  it('§7.2 último mundo completo: se elige el próximo en el mapa', () => {
    const s = withWorld2([1]);
    s.lastWorld = 1;
    expect(playAction(s, WORDS)).toEqual({ kind: 'map' });
  });

  it('§7.2 si el último mundo está bloqueado, vuelve al 1', () => {
    const s = initialState();
    s.lastWorld = 7;
    expect(playAction(s, WORDS)).toEqual({ kind: 'lesson', world: 1, stop: 1 });
  });

  it('acción para una parada elegida en el mundo', () => {
    const s = withWorld2([1, 2]);
    expect(stopAction(s, 2, 2, WORDS)).toEqual({ kind: 'practice', world: 2, stop: 2 });
    expect(stopAction(s, 2, 1, WORDS)).toEqual({ kind: 'lesson', world: 2, stop: 1 });
  });
});

describe('§6.2 lo que falta para el jefe', () => {
  it('detalla cada regla que cuenta', () => {
    const status = bossGateStatus(withWorld2([1, 2, 3, 4]), 2, words2);
    expect(status.map((r) => r.rule).sort()).toEqual(gateRules(words2).sort());
    expect(status.every((r) => !r.ready && r.ema === 0.5 && r.attempts === 0)).toBe(true);
    const ready = bossGateStatus(withWorld2([1, 2, 3, 4], true), 2, words2);
    expect(ready.every((r) => r.ready && r.accuracy === 1)).toBe(true);
  });
});
