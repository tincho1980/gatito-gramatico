import { describe, expect, it } from 'vitest';
import { RuleSchema } from '../schemas.ts';
import { commonErrorText, RULE_TEXTS, ruleText, typeName } from './ruleTexts.ts';
import { BANK, word } from './testing.ts';

describe('§2.3 feedback', () => {
  it('§2.3 texto de la regla grave_n_s_vocal', () => {
    expect(ruleText(word({ rule: 'grave_n_s_vocal' }))).toBe(
      'Es grave y termina en n, s o vocal: no lleva tilde.',
    );
  });

  it('§2.3 hay texto para todas las reglas y para cada palabra del banco', () => {
    expect(Object.keys(RULE_TEXTS).sort()).toEqual([...RuleSchema.options].sort());
    for (const w of BANK) expect(ruleText(w).length).toBeGreaterThan(10);
  });

  it('§2.3 diacrítica, interrogativa y -mente dependen de si lleva tilde', () => {
    for (const rule of ['diacritica', 'interrogativa', 'mente'] as const) {
      expect(ruleText(word({ rule, hasTilde: true }))).not.toBe(
        ruleText(word({ rule, hasTilde: false })),
      );
    }
    expect(ruleText(word({ rule: 'mente', hasTilde: true, related: 'fácil' }))).toContain('fácil');
  });

  it('§2.3 error común solo si hubo error', () => {
    const examen = word({ word: 'examen', distractor: 'exámen' });
    expect(commonErrorText(examen, false)).toBe('Error común: exámen');
    expect(commonErrorText(examen, true)).toBeNull();
  });

  it('nombres de los tipos', () => {
    expect(typeName('esdrujula')).toBe('esdrújula');
  });
});
