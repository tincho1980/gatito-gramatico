import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import {
  gateRules,
  initialRuleMastery,
  isBossEnabled,
  ruleKey,
  rulesReadyForBoss,
  updateEma,
  windowAccuracy,
} from './mastery.ts';
import { initialState } from './state.ts';
import { word, WORDS } from './testing.ts';
import type { ProfileState, RuleMastery } from './types.ts';

const mastered = (): RuleMastery => ({ ema: 0.9, attempts: 40, recent: Array(30).fill(1) });

describe('§6.1 EMA por regla', () => {
  it('§6.1 empieza en 0,5 y 0 intentos', () => {
    expect(initialRuleMastery()).toEqual({ ema: 0.5, attempts: 0, recent: [] });
  });

  it('§6.1 ema = 0,8 × ema + 0,2 × full', () => {
    const up = updateEma(initialRuleMastery(), true);
    expect(up.ema).toBeCloseTo(0.6);
    expect(up.attempts).toBe(1);
    expect(updateEma(up, false).ema).toBeCloseTo(0.48);
  });

  it('§6.2 guarda los últimos 30 intentos', () => {
    let m = initialRuleMastery();
    for (let i = 0; i < 40; i++) m = updateEma(m, i % 2 === 0);
    expect(m.recent).toHaveLength(30);
    expect(windowAccuracy(m)).toBeCloseTo(0.5);
    expect(windowAccuracy(initialRuleMastery())).toBe(0);
    expect(windowAccuracy(undefined)).toBe(0);
  });
});

describe('§6.2 jefe habilitado', () => {
  const world2 = WORDS.byWorld.get(2) ?? [];

  const ready = (): ProfileState => {
    const s = initialState();
    s.worlds[2] = { unlocked: true, stopsDone: [1, 2, 3, 4], bossBest: null, stars: 0 };
    for (const rule of gateRules(world2)) s.rules[ruleKey(2, rule)] = mastered();
    return s;
  };

  it('§6.2 solo cuentan las reglas con al menos 15 % de las palabras del mundo', () => {
    const words = [
      ...Array.from({ length: 9 }, (_, i) => word({ id: `g${i}`, rule: 'grave_n_s_vocal' })),
      word({ id: 'a', rule: 'aguda_otra' }),
    ];
    expect(gateRules(words)).toEqual(['grave_n_s_vocal']);
    expect(gateRules(WORDS.byWorld.get(7) ?? []).sort()).toEqual(['grave_n_s_vocal', 'hiato']);
  });

  it('§6.2 con paradas completas y reglas dominadas se habilita', () => {
    expect(isBossEnabled(ready(), 2, world2)).toBe(true);
  });

  it('§6.2 falta una parada: no se habilita', () => {
    const s = ready();
    s.worlds[2]!.stopsDone = [1, 2, 3];
    expect(isBossEnabled(s, 2, world2)).toBe(false);
  });

  it('§6.2 el mundo 1 no necesita la parada 4', () => {
    const s = initialState();
    s.worlds[1]!.stopsDone = [1, 2, 3];
    const world1 = WORDS.byWorld.get(1) ?? [];
    for (const rule of gateRules(world1)) s.rules[ruleKey(1, rule)] = mastered();
    expect(isBossEnabled(s, 1, world1)).toBe(true);
  });

  it('§6.2 una regla con EMA < 0,85 bloquea', () => {
    const s = ready();
    const key = ruleKey(2, gateRules(world2)[0]!);
    s.rules[key] = { ...mastered(), ema: 0.84 };
    expect(rulesReadyForBoss(s, 2, world2)).toBe(false);
  });

  it('§6.2 menos de 85 % de full en los últimos 30 intentos bloquea', () => {
    const s = ready();
    const key = ruleKey(2, gateRules(world2)[0]!);
    s.rules[key] = { ...mastered(), recent: [...Array(25).fill(1), ...Array(5).fill(0)] };
    expect(rulesReadyForBoss(s, 2, world2)).toBe(false);
    s.rules[key] = { ...mastered(), recent: [...Array(26).fill(1), ...Array(4).fill(0)] };
    expect(rulesReadyForBoss(s, 2, world2)).toBe(true);
  });

  it('§6.2 con menos de 30 intentos no se habilita', () => {
    const s = ready();
    const key = ruleKey(2, gateRules(world2)[0]!);
    s.rules[key] = { ema: 0.95, attempts: 29, recent: Array(29).fill(1) };
    expect(rulesReadyForBoss(s, 2, world2)).toBe(false);
  });

  it('§6.2 cuentan solo los intentos con palabras de ese mundo', () => {
    const s = ready();
    const rule = gateRules(world2)[0]!;
    delete s.rules[ruleKey(2, rule)];
    s.rules[ruleKey(5, rule)] = mastered();
    expect(rulesReadyForBoss(s, 2, world2)).toBe(false);
  });

  it('§6.2 un mundo bloqueado no tiene jefe', () => {
    const s = ready();
    s.worlds[2]!.unlocked = false;
    expect(isBossEnabled(s, 2, world2)).toBe(false);
    expect(isBossEnabled(initialState(), 11, [])).toBe(false);
  });

  it('usa los valores de config', () => {
    expect(CONFIG.bossGate).toMatchObject({ minEma: 0.85, window: 30, minAccuracy: 0.85 });
  });
});
