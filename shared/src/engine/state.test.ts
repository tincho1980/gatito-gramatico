import { describe, expect, it } from 'vitest';
import { BADGES } from '../data/catalogs.ts';
import { BADGE_CRITERIA } from './badges.ts';
import { initialWordMastery } from './leitner.ts';
import { gateRules, ruleKey } from './mastery.ts';
import { applyRound, indexWords, initialState, replay } from './state.ts';
import { perfectPlayer, round, simulate, turn, word, WORDS } from './testing.ts';
import type { ProfileState, RuleMastery, TurnResult } from './types.ts';

const world = (id: number) => WORDS.byWorld.get(id) ?? [];
const fulls = (ids: string[], n: number): TurnResult[] =>
  ids.map((wordId, i) => turn({ wordId, full: i < n }));
const ids1 = world(1)
  .slice(0, 10)
  .map((w) => w.id);
const mastered = (): RuleMastery => ({ ema: 0.95, attempts: 60, recent: Array(30).fill(1) });

/** Mundo 2 listo para el jefe. */
function bossReady(): ProfileState {
  const s = initialState();
  s.worlds[1] = { unlocked: true, stopsDone: [1, 2, 3, 5], bossBest: 8, stars: 1 };
  s.worlds[2] = { unlocked: true, stopsDone: [1, 2, 3, 4], bossBest: null, stars: 0 };
  s.worlds[3] = { unlocked: true, stopsDone: [], bossBest: null, stars: 0 };
  s.worlds[4] = { unlocked: true, stopsDone: [], bossBest: null, stars: 0 };
  for (const rule of gateRules(world(2))) s.rules[ruleKey(2, rule)] = mastered();
  return s;
}
const bossRound = (n: number) =>
  round({
    id: 'boss',
    world: 2,
    stop: 5,
    kind: 'boss',
    turns: fulls(
      world(2)
        .slice(0, 10)
        .map((w) => w.id),
      n,
    ),
  });

describe('aplicar una ronda', () => {
  it('§4.2 la lección completa la parada 1 y no cambia nada más', () => {
    const s = applyRound(
      initialState(),
      round({ kind: 'lesson', stop: 1, turns: fulls(ids1.slice(0, 3), 3) }),
      WORDS,
    );
    expect(s.worlds[1]?.stopsDone).toEqual([1]);
    expect(s.roundsPlayed).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.words).toEqual({});
  });

  it('§5.2 rounds_played cuenta rondas terminadas, no lecciones', () => {
    let s = applyRound(initialState(), round({ kind: 'lesson', stop: 1 }), WORDS);
    s = applyRound(s, round({ turns: fulls(ids1, 3) }), WORDS);
    expect(s.roundsPlayed).toBe(1);
  });

  it('§5 y §6.1 actualiza cajas y EMA por mundo y regla', () => {
    const w = world(1)[0]!;
    const s = applyRound(
      initialState(),
      round({ turns: [turn({ wordId: w.id, full: true })] }),
      WORDS,
    );
    expect(s.words[w.id]).toMatchObject({ box: 1, dueRound: 1, lastRound: 1 });
    expect(s.rules[ruleKey(1, w.rule)]).toMatchObject({ attempts: 1 });
  });

  it('§6.1 un turno con pista no cuenta para la EMA', () => {
    const w = world(1)[0]!;
    const s = applyRound(
      initialState(),
      round({ turns: [turn({ wordId: w.id, full: false, hinted: true })] }),
      WORDS,
    );
    expect(s.rules[ruleKey(1, w.rule)]).toBeUndefined();
  });

  it('§7.2 parada de práctica: se completa con ≥ 7 de 10 full', () => {
    const lesson = applyRound(initialState(), round({ kind: 'lesson', stop: 1 }), WORDS);
    expect(
      applyRound(lesson, round({ turns: fulls(ids1, 6) }), WORDS).worlds[1]?.stopsDone,
    ).toEqual([1]);
    expect(
      applyRound(lesson, round({ turns: fulls(ids1, 7) }), WORDS).worlds[1]?.stopsDone,
    ).toEqual([1, 2]);
  });

  it('§7.2 el desafío se completa con ≥ 6 de 10', () => {
    const s = initialState();
    s.worlds[2] = { unlocked: true, stopsDone: [1, 2, 3], bossBest: null, stars: 0 };
    const ids2 = world(2)
      .slice(0, 10)
      .map((w) => w.id);
    const after = applyRound(s, round({ world: 2, stop: 4, turns: fulls(ids2, 6) }), WORDS);
    expect(after.worlds[2]?.stopsDone).toEqual([1, 2, 3, 4]);
  });

  it('§7.2 las paradas son secuenciales: no se saltea una', () => {
    const s = applyRound(initialState(), round({ stop: 3, turns: fulls(ids1, 10) }), WORDS);
    expect(s.worlds[1]?.stopsDone).toEqual([]);
  });

  it('§7.3 jefe vencido con ≥ 8 de 10: +50 XP, +10 croquetas, gato amigo y desbloqueos', () => {
    const before = bossReady();
    const s = applyRound(before, bossRound(8), WORDS);
    expect(s.worlds[2]).toMatchObject({ bossBest: 8, stars: 1 });
    expect(s.worlds[2]?.stopsDone).toContain(5);
    expect(s.owned).toEqual(['gato-tejado']);
    expect(s.croquetas).toBe(10);
    const turnsOnly = applyRound(before, { ...bossRound(8), kind: 'practice', stop: 4 }, WORDS);
    expect(s.xp - turnsOnly.xp).toBe(50);
  });

  it('§7.3 perder contra el jefe no hace perder nada', () => {
    const before = bossReady();
    const s = applyRound(before, bossRound(7), WORDS);
    expect(s.worlds[2]).toMatchObject({ bossBest: null, stars: 0, unlocked: true });
    expect(s.worlds[2]?.stopsDone).toEqual([1, 2, 3, 4]);
    expect(s.croquetas).toBe(0);
  });

  it('§7.3 un jefe no habilitado no da desbloqueos aunque se gane', () => {
    const before = bossReady();
    before.worlds[2]!.stopsDone = [1, 2];
    const s = applyRound(before, bossRound(10), WORDS);
    expect(s.worlds[2]?.bossBest).toBeNull();
    expect(s.owned).toEqual([]);
  });

  it('§7.1 vencer los jefes de 2, 3 y 4 abre el 5', () => {
    const s = bossReady();
    s.worlds[3]!.bossBest = 9;
    s.worlds[4]!.bossBest = 9;
    expect(applyRound(s, bossRound(8), WORDS).worlds[5]?.unlocked).toBe(true);
  });

  it('§7.1 el docente abre un mundo para el aula', () => {
    const s = applyRound(initialState(), round({ turns: fulls(ids1, 1) }), WORDS, {
      teacherUnlocks: [6],
    });
    expect(s.worlds[6]?.unlocked).toBe(true);
  });

  it('§7.4 las estrellas solo suben', () => {
    let s = applyRound(bossReady(), bossRound(10), WORDS);
    expect(s.worlds[2]?.stars).toBe(2);
    s = applyRound(s, bossRound(8), WORDS);
    expect(s.worlds[2]).toMatchObject({ stars: 2, bossBest: 10 });
  });

  it('§7.4 tres estrellas cuando el 80 % del mundo está en caja 3 o más', () => {
    const s = bossReady();
    for (const w of world(2)) s.words[w.id] = { ...initialWordMastery(), box: 4, dueRound: 99 };
    expect(applyRound(s, bossRound(9), WORDS).worlds[2]?.stars).toBe(3);
  });

  it('§8.2 croquetas por llegar a caja 3 y 5 por primera vez', () => {
    const w = world(1)[0]!;
    const s = initialState();
    s.words[w.id] = { ...initialWordMastery(), box: 2 };
    const after = applyRound(s, round({ turns: [turn({ wordId: w.id })] }), WORDS);
    expect(after.croquetas).toBe(1);
  });

  it('las palabras que ya no están en el banco se ignoran', () => {
    const s = applyRound(initialState(), round({ turns: [turn({ wordId: 'no-existe' })] }), WORDS);
    expect(s.words).toEqual({});
    expect(s.roundsPlayed).toBe(1);
  });

  it('§4.1 guarda las palabras de las últimas 2 rondas', () => {
    let s = initialState();
    for (const id of ['r1', 'r2', 'r3'])
      s = applyRound(s, round({ id, turns: [turn({ wordId: id })] }), WORDS);
    expect(s.recentRounds).toEqual([['r2'], ['r3']]);
  });

  it('no modifica el estado recibido', () => {
    const s = initialState();
    const copy = JSON.stringify(s);
    applyRound(s, round({ turns: fulls(ids1, 10) }), WORDS);
    expect(JSON.stringify(s)).toBe(copy);
  });

  it('un mundo sin progreso previo se inicializa', () => {
    const s = initialState();
    delete s.worlds[3];
    expect(
      applyRound(s, round({ world: 3, kind: 'lesson', stop: 1 }), WORDS).worlds[3],
    ).toMatchObject({ unlocked: false });
  });
});

describe('replay', () => {
  const { rounds } = simulate(perfectPlayer, { maxRounds: 40 });

  it('replay de las mismas rondas da siempre el mismo estado', () => {
    expect(replay(rounds, WORDS)).toEqual(replay(rounds, WORDS));
  });

  it('el orden de entrada no importa: se aplican por finishedAt', () => {
    const shuffled = [...rounds].reverse();
    expect(replay(shuffled, WORDS)).toEqual(replay(rounds, WORDS));
  });

  it('empates de finishedAt se ordenan por id', () => {
    const a = round({ id: 'a', turns: [turn({ wordId: ids1[0]!, full: false })] });
    const b = round({ id: 'b', turns: [turn({ wordId: ids1[0]!, full: true })] });
    expect(replay([b, a], WORDS)).toEqual(replay([a, b], WORDS));
  });

  it('indexa el banco por id y por mundo', () => {
    const idx = indexWords([word({ id: 'x', world: 3 }), word({ id: 'y', world: 3 })]);
    expect(idx.byId.get('y')?.id).toBe('y');
    expect(idx.byWorld.get(3)).toHaveLength(2);
  });
});

describe('§8.4 insignias', () => {
  it('§8.4 cada insignia del catálogo tiene su criterio y viceversa', () => {
    expect(Object.keys(BADGE_CRITERIA).sort()).toEqual(BADGES.map((b) => b.id).sort());
  });

  it('§8.4 primera ronda', () => {
    const s = applyRound(initialState(), round({ turns: fulls(ids1, 1) }), WORDS);
    expect(s.badges['primera-ronda']).toBe('2026-03-02T14:05:00.000Z');
  });

  it('§8.4 una insignia se gana una sola vez', () => {
    let s = applyRound(initialState(), round({ turns: fulls(ids1, 1) }), WORDS);
    s = applyRound(
      s,
      round({ id: 'r2', finishedAt: '2026-03-03T14:00:00.000Z', turns: fulls(ids1, 1) }),
      WORDS,
    );
    expect(s.badges['primera-ronda']).toBe('2026-03-02T14:05:00.000Z');
  });

  it('§8.4 racha de 3', () => {
    let s = initialState();
    for (const d of ['02', '03', '04']) {
      s = applyRound(
        s,
        round({ id: d, finishedAt: `2026-03-${d}T15:00:00.000Z`, turns: fulls(ids1, 1) }),
        WORDS,
      );
    }
    expect(s.badges['racha-3']).toBeDefined();
    expect(s.badges['racha-7']).toBeUndefined();
  });

  it('§8.4 gata trasnochadora: ronda terminada entre las 0 y las 5', () => {
    // 05:30 UTC = 02:30 en Buenos Aires
    const night = applyRound(
      initialState(),
      round({ finishedAt: '2026-03-02T05:30:00.000Z', turns: fulls(ids1, 1) }),
      WORDS,
    );
    expect(night.badges.trasnochadora).toBeDefined();
    const day = applyRound(
      initialState(),
      round({ finishedAt: '2026-03-02T09:00:00.000Z', turns: fulls(ids1, 1) }),
      WORDS,
    );
    expect(day.badges.trasnochadora).toBeUndefined();
  });

  it('§8.4 ya no me engañan: falló ≥ 3 veces y después tuvo 5 full seguidos', () => {
    const w = ids1[0]!;
    let s = initialState();
    let n = 0;
    const play = (full: boolean) => {
      n++;
      s = applyRound(
        s,
        round({
          id: `r${n}`,
          finishedAt: `2026-03-02T1${n % 10}:00:00.000Z`,
          turns: [turn({ wordId: w, full })],
        }),
        WORDS,
      );
    };
    [false, false, false, true, true, true, true].forEach(play);
    expect(s.badges['ya-no-me-enganan']).toBeUndefined();
    play(true);
    expect(s.badges['ya-no-me-enganan']).toBeDefined();
  });

  it('§8.4 remontada: una regla sube ≥ 0,20 de EMA en los últimos 7 días', () => {
    const w = world(1)[0]!;
    let s = initialState();
    const at = (day: string, h: number) => `2026-03-${day}T${h}:00:00.000Z`;
    // día 2: baja la EMA
    for (let i = 0; i < 3; i++) {
      s = applyRound(
        s,
        round({
          id: `a${i}`,
          finishedAt: at('02', 12 + i),
          turns: [turn({ wordId: w.id, full: false })],
        }),
        WORDS,
      );
    }
    const low = s.rules[ruleKey(1, w.rule)]!.ema;
    // día 9 (7 días después): sube
    for (let i = 0; i < 3; i++) {
      s = applyRound(
        s,
        round({
          id: `b${i}`,
          finishedAt: at('09', 12 + i),
          turns: [turn({ wordId: w.id, full: true })],
        }),
        WORDS,
      );
    }
    expect(s.rules[ruleKey(1, w.rule)]!.ema - low).toBeGreaterThan(0.2);
    expect(s.badges.remontada).toBeDefined();
  });

  it('§8.4 remontada: sin valor de hace 7 días no cuenta', () => {
    const w = world(1)[0]!;
    let s = initialState();
    for (let i = 0; i < 5; i++) {
      s = applyRound(
        s,
        round({
          id: `c${i}`,
          finishedAt: `2026-03-02T1${i}:00:00.000Z`,
          turns: [turn({ wordId: w.id, full: true })],
        }),
        WORDS,
      );
    }
    expect(s.badges.remontada).toBeUndefined();
  });

  it('§8.4 tres estrellas en un mundo da su insignia', () => {
    const s = bossReady();
    for (const w of world(2)) s.words[w.id] = { ...initialWordMastery(), box: 4, dueRound: 99 };
    expect(applyRound(s, bossRound(10), WORDS).badges['mundo-2']).toBeDefined();
  });
});
