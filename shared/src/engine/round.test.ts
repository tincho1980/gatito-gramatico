import { describe, expect, it } from 'vitest';
import { initialWordMastery } from './leitner.ts';
import { ruleKey } from './mastery.ts';
import { createRng } from './rng.ts';
import {
  buildBossRound,
  buildRound,
  canHint,
  nextWord,
  recordTurn,
  startRound,
  type PlannedWord,
  type RoundProgress,
} from './round.ts';
import { initialState } from './state.ts';
import { turn, WORDS } from './testing.ts';
import type { ProfileState, Stop } from './types.ts';

const NOW = '2026-03-10T15:00:00.000Z';
const world = (id: number) => WORDS.byWorld.get(id) ?? [];
const bySlot = (plan: PlannedWord[]) =>
  plan.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.slot]: (acc[p.slot] ?? 0) + 1 }),
    {},
  );

/** Mundo 1 vencido, 2–4 abiertos, repasos vencidos y una regla floja en el mundo 1. */
function advancedState(): ProfileState {
  const s = initialState();
  s.roundsPlayed = 20;
  s.worlds[1] = { unlocked: true, stopsDone: [1, 2, 3, 5], bossBest: 9, stars: 2 };
  for (const id of [2, 3, 4])
    s.worlds[id] = { unlocked: true, stopsDone: [1], bossBest: null, stars: 0 };
  for (const w of world(1).slice(0, 6)) {
    s.words[w.id] = { ...initialWordMastery(), box: 2, dueRound: 18, lastSeenAt: NOW };
  }
  s.rules[ruleKey(1, 'grave_n_s_vocal')] = { ema: 0.9, attempts: 50, recent: [] };
  s.rules[ruleKey(1, 'aguda_otra')] = { ema: 0.4, attempts: 10, recent: [] };
  return s;
}

const build = (state: ProfileState, w: number, stop: Stop, seed = 1) =>
  buildRound({ state, words: WORDS, world: w, stop, rng: createRng(seed), now: NOW });

describe('§4.1 composición de la ronda', () => {
  it('§4.1 cupos 5 nuevas, 3 repasos, 1 regla floja, 1 desafío', () => {
    const plan = build(advancedState(), 2, 2);
    expect(plan).toHaveLength(10);
    expect(bySlot(plan)).toEqual({ current: 5, review: 3, weakRule: 1, challenge: 1 });
  });

  it('§4.1 cada cupo sale de donde corresponde', () => {
    const plan = build(advancedState(), 2, 2);
    for (const p of plan) {
      if (p.slot === 'current') expect([p.word.world, p.word.tier]).toEqual([2, 1]);
      if (p.slot === 'review') expect(p.word.world).toBe(1);
      if (p.slot === 'weakRule') expect([p.word.world, p.word.rule]).toEqual([1, 'aguda_otra']);
      if (p.slot === 'challenge') expect([p.word.world, p.word.tier]).toEqual([2, 2]);
    }
  });

  it('§4.1 nunca la misma palabra dos veces', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const plan = build(advancedState(), 2, 2, seed);
      expect(new Set(plan.map((p) => p.word.id)).size).toBe(plan.length);
    }
  });

  it('§4.1 el desafío nunca va primero', () => {
    for (let seed = 1; seed <= 60; seed++) {
      expect(build(advancedState(), 2, 2, seed)[0]?.slot).not.toBe('challenge');
    }
  });

  it('§4.1 el armado es determinista con la misma semilla', () => {
    const ids = (seed: number) => build(advancedState(), 2, 2, seed).map((p) => p.word.id);
    expect(ids(5)).toEqual(ids(5));
    expect(ids(5)).not.toEqual(ids(6));
  });

  it('§4.1 nuevas: primero las de caja 1–2, después caja 0 por freq', () => {
    const s = initialState();
    const tier1 = world(1).filter((w) => w.tier === 1);
    const inProgress = tier1.slice(-2); // las de menor freq
    for (const w of inProgress) s.words[w.id] = { ...initialWordMastery(), box: 1, dueRound: 99 };
    const current = build(s, 1, 2)
      .filter((p) => p.slot === 'current')
      .map((p) => p.word.id);
    expect(current).toEqual(expect.arrayContaining(inProgress.map((w) => w.id)));
    const fresh = tier1
      .filter((w) => !inProgress.includes(w))
      .slice(0, 3)
      .map((w) => w.id);
    expect(current).toEqual(expect.arrayContaining(fresh));
  });

  it('§4.1 las de caja 3 o más no entran en el cupo de nuevas', () => {
    const s = initialState();
    const top = world(1).filter((w) => w.tier === 1)[0]!;
    s.words[top.id] = { ...initialWordMastery(), box: 3, dueRound: 99 };
    expect(build(s, 1, 2).map((p) => p.word.id)).not.toContain(top.id);
  });

  it('§4.1 repasos: prioridad por caja más baja y después due_round más viejo', () => {
    const s = advancedState();
    const [a, b, c, d] = world(1).slice(0, 4);
    for (const w of world(1).slice(0, 6)) delete s.words[w.id];
    s.words[a!.id] = { ...initialWordMastery(), box: 2, dueRound: 1, lastSeenAt: NOW };
    s.words[b!.id] = { ...initialWordMastery(), box: 1, dueRound: 15, lastSeenAt: NOW };
    s.words[c!.id] = { ...initialWordMastery(), box: 1, dueRound: 10, lastSeenAt: NOW };
    s.words[d!.id] = { ...initialWordMastery(), box: 3, dueRound: 1, lastSeenAt: NOW };
    const reviews = build(s, 2, 2)
      .filter((p) => p.slot === 'review')
      .map((p) => p.word.id)
      .sort();
    expect(reviews).toEqual([a!.id, b!.id, c!.id].sort());
  });

  it('§4.1 regla floja: solo de mundos completados', () => {
    const s = initialState();
    s.rules[ruleKey(1, 'aguda_otra')] = { ema: 0.1, attempts: 5, recent: [] };
    expect(bySlot(build(s, 1, 2)).weakRule).toBeUndefined();
  });

  it('§4.1 desafío: tier siguiente; desde tier 3, el mundo siguiente desbloqueado', () => {
    const s = advancedState();
    const challenge = (stop: Stop, w = 2) =>
      build(s, w, stop).find((p) => p.slot === 'challenge')?.word;
    expect(challenge(3)).toMatchObject({ world: 2, tier: 3 });
    expect(challenge(4)).toMatchObject({ world: 3 });
    expect(challenge(4, 4)).toMatchObject({ world: 4, tier: 3 }); // no hay mundo abierto después del 4
  });

  it('§4.1 si un cupo no se llena se completa con nuevas o en curso', () => {
    const plan = build(initialState(), 1, 2);
    expect(plan).toHaveLength(10);
    expect(bySlot(plan)).toEqual({ current: 5, challenge: 1, fill: 4 });
    expect(plan.filter((p) => p.slot === 'fill').every((p) => p.word.tier === 1)).toBe(true);
  });

  it('§4.1 si tampoco alcanza, cualquier palabra del mundo actual', () => {
    const s = initialState();
    for (const w of world(1))
      if (w.tier === 1) s.words[w.id] = { ...initialWordMastery(), box: 3, dueRound: 99 };
    const plan = build(s, 1, 2);
    expect(plan).toHaveLength(10);
    expect(plan.every((p) => p.word.world === 1)).toBe(true);
  });

  it('§4.1 penalización: una palabra de las últimas 2 rondas sale mucho menos', () => {
    const s = advancedState();
    const due = world(1).slice(0, 6);
    for (const w of due)
      s.words[w.id] = { ...initialWordMastery(), box: 1, dueRound: 18, lastSeenAt: NOW };
    const penalized = due[0]!.id;
    s.recentRounds = [[penalized]];
    let withPenalty = 0;
    let other = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const ids = build(s, 2, 2, seed)
        .filter((p) => p.slot === 'review')
        .map((p) => p.word.id);
      if (ids.includes(penalized)) withPenalty++;
      if (ids.includes(due[1]!.id)) other++;
    }
    expect(withPenalty).toBeLessThan(other / 2);
  });

  it('§4.1 peso: las palabras con más errores salen más', () => {
    const s = advancedState();
    const due = world(1).slice(0, 6);
    for (const w of due)
      s.words[w.id] = { ...initialWordMastery(), box: 1, dueRound: 18, lastSeenAt: NOW };
    s.words[due[0]!.id]!.errors = 6;
    let hard = 0;
    let other = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const ids = build(s, 2, 2, seed)
        .filter((p) => p.slot === 'review')
        .map((p) => p.word.id);
      if (ids.includes(due[0]!.id)) hard++;
      if (ids.includes(due[1]!.id)) other++;
    }
    expect(hard).toBeGreaterThan(other);
  });
});

describe('§4.2 ronda del jefe', () => {
  it('§4.2 10 palabras del mundo: 3 de tier 1, 4 de tier 2 y 3 de tier 3', () => {
    const plan = buildBossRound({
      state: initialState(),
      words: WORDS,
      world: 2,
      rng: createRng(1),
      now: NOW,
    });
    expect(plan).toHaveLength(10);
    expect(plan.every((p) => p.word.world === 2 && p.slot === 'boss')).toBe(true);
    const tiers = [1, 2, 3].map((t) => plan.filter((p) => p.word.tier === t).length);
    expect(tiers).toEqual([3, 4, 3]);
  });

  it('§4.2 si un tier no alcanza, se completa con el resto del mundo', () => {
    const plan = buildBossRound({
      state: initialState(),
      words: { byId: WORDS.byId, byWorld: new Map([[2, world(2).filter((w) => w.tier !== 3)]]) },
      world: 2,
      rng: createRng(1),
      now: NOW,
    });
    expect(plan).toHaveLength(10);
  });
});

describe('§4.3 ajuste dentro de la ronda', () => {
  const ctx = { state: initialState(), words: WORDS, rng: createRng(1) };
  const start = (stop: Stop, kind: RoundProgress['kind'] = 'practice', w = 2) =>
    startRound(kind, w, stop, build(advancedState(), w, stop));
  const play = (p: RoundProgress, full: boolean) => {
    const { progress, next } = nextWord(p, ctx);
    return recordTurn(progress, turn({ wordId: next!.word.id, full }));
  };

  it('§4.3 tres turnos seguidos no full: la siguiente es del tier inferior y con pista', () => {
    let p = start(3);
    for (let i = 0; i < 3; i++) p = play(p, false);
    const { progress, next } = nextWord(p, ctx);
    expect(next).toMatchObject({ slot: 'lower', hinted: true });
    expect([next!.word.world, next!.word.tier]).toEqual([2, 1]);
    expect(progress.missStreak).toBe(0);
  });

  it('§4.3 sin tier inferior: la palabra planeada se muestra con pista', () => {
    let p = start(2);
    for (let i = 0; i < 3; i++) p = play(p, false);
    const planned = p.planned[3]!;
    const { next } = nextWord(p, ctx);
    expect(next).toMatchObject({ word: planned.word, hinted: canHint(planned.word) });
  });

  it('§4.3 cinco full seguidos: se agrega un desafío al final, una sola vez', () => {
    let p = start(2);
    for (let i = 0; i < 5; i++) p = play(p, true);
    let step = nextWord(p, ctx);
    expect(step.progress.planned).toHaveLength(11);
    expect(step.progress.planned.at(-1)?.slot).toBe('challenge');
    p = step.progress;
    for (let i = 0; i < 5; i++) p = play(p, true);
    step = nextWord(p, ctx);
    expect(step.progress.planned).toHaveLength(11);
  });

  it('§4.3 la ronda termina cuando no quedan palabras', () => {
    let p = start(2);
    for (let i = 0; i < 10; i++) p = play(p, i % 2 === 0);
    expect(nextWord(p, ctx).next).toBeNull();
  });

  it('§4.3 no aplica al jefe', () => {
    const plan = buildBossRound({
      state: initialState(),
      words: WORDS,
      world: 2,
      rng: createRng(1),
      now: NOW,
    });
    let p = startRound('boss', 2, 5, plan);
    for (let i = 0; i < 5; i++) p = play(p, true);
    expect(nextWord(p, ctx).progress.planned).toHaveLength(10);
    for (let i = 0; i < 3; i++) p = play(p, false);
    expect(nextWord(p, ctx).next?.hinted).toBe(false);
  });
});

describe('§4.3 cuándo hay pista', () => {
  it('§4.3 en el mundo 1 no hay pista: la tónica es la única pregunta', () => {
    const ctx1 = { state: initialState(), words: WORDS, rng: createRng(1) };
    let p = startRound('practice', 1, 3, build(advancedState(), 1, 3));
    for (let i = 0; i < 3; i++) {
      const { progress, next } = nextWord(p, ctx1);
      p = recordTurn(progress, turn({ wordId: next!.word.id, full: false }));
    }
    const { next } = nextWord(p, ctx1);
    expect(next).toMatchObject({ slot: 'lower', hinted: false });
  });

  it('§4.3 sin pista en oraciones ni monosílabos sueltos', () => {
    const sentence = WORDS.byWorld.get(9)![0]!;
    const mono = WORDS.byWorld.get(8)!.find((w) => w.type === 'monosilaba' && !w.sentence)!;
    const loose = WORDS.byWorld.get(2)!.find((w) => !w.sentence)!;
    expect([canHint(sentence), canHint(mono), canHint(loose)]).toEqual([false, false, true]);
  });
});
