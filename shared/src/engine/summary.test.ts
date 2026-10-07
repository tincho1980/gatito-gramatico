import { describe, expect, it } from 'vitest';
import { ruleKey } from './mastery.ts';
import { RULE_NAMES } from './ruleTexts.ts';
import { RuleSchema } from '../schemas.ts';
import { applyRound, initialState } from './state.ts';
import { summarizeRound } from './summary.ts';
import { round, turn, WORDS } from './testing.ts';

const world1 = WORDS.byWorld.get(1) ?? [];
const grave = world1.filter((w) => w.rule === 'grave_n_s_vocal').slice(0, 3);
const aguda = world1.filter((w) => w.rule === 'aguda_otra').slice(0, 3);

describe('§4.4 resumen de la ronda', () => {
  it('§4.4 aciertos, XP, regla que mejoró, regla a repasar y cajas que subieron', () => {
    const before = initialState();
    const r = round({
      turns: [
        ...grave.map((w) => turn({ wordId: w.id, full: true })),
        ...aguda.map((w) => turn({ wordId: w.id, full: false })),
      ],
    });
    const after = applyRound(before, r, WORDS);
    const s = summarizeRound(before, after, r, WORDS);
    expect(s.fulls).toBe(3);
    expect(s.total).toBe(6);
    expect(s.xp).toBe(after.xp);
    expect(s.improved?.rule).toBe('grave_n_s_vocal');
    expect(s.toReview?.rule).toBe('aguda_otra');
    expect(s.boxesUp.sort()).toEqual(grave.map((w) => w.id).sort()); // las falladas no suben
    expect(s.newBadges).toEqual(['primera-ronda']);
    expect(s.unlocked).toEqual([]);
  });

  it('§4.4 sin subidas no hay regla que mejoró; sin bajadas no hay regla a repasar', () => {
    const before = initialState();
    const allGood = round({ turns: grave.map((w) => turn({ wordId: w.id, full: true })) });
    const s = summarizeRound(before, applyRound(before, allGood, WORDS), allGood, WORDS);
    expect(s.toReview).toBeNull();
    const allBad = round({ turns: grave.map((w) => turn({ wordId: w.id, full: false })) });
    const s2 = summarizeRound(before, applyRound(before, allBad, WORDS), allBad, WORDS);
    expect(s2.improved).toBeNull();
    expect(s2.toReview).toMatchObject({ world: 1, rule: 'grave_n_s_vocal' });
  });

  it('ignora turnos con pista y palabras fuera del banco', () => {
    const before = initialState();
    const r = round({
      turns: [turn({ wordId: grave[0]!.id, hinted: true, full: false }), turn({ wordId: 'nada' })],
    });
    const s = summarizeRound(before, applyRound(before, r, WORDS), r, WORDS);
    expect(s.improved).toBeNull();
    expect(s.toReview).toBeNull();
    expect(before.rules[ruleKey(1, 'grave_n_s_vocal')]).toBeUndefined();
  });

  it('hay nombre para cada regla', () => {
    expect(Object.keys(RULE_NAMES).sort()).toEqual([...RuleSchema.options].sort());
  });
});
