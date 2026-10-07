import { describe, expect, it } from 'vitest';
import { evaluateTurn, stepsFor, typeOptions, withoutTildes } from './turn.ts';
import { correctAnswers, word } from './testing.ts';

const examen = word({
  id: 'examen',
  word: 'examen',
  syllables: ['e', 'xa', 'men'],
  stressIndex: 1,
  world: 3,
});

describe('§2.1 pasos según la palabra', () => {
  it('§2.1 mundo 1: solo tónica', () => {
    expect(stepsFor(word({ world: 1 }))).toEqual(['tonica']);
  });

  it('§2.1 palabra suelta de los mundos 2 a 7 y 10: tónica, tipo y tilde', () => {
    for (const world of [2, 3, 4, 5, 6, 7, 10]) {
      expect(stepsFor(word({ world }))).toEqual(['tonica', 'tipo', 'tilde']);
    }
  });

  it('§2.1 palabra con oración: solo tilde', () => {
    expect(stepsFor(word({ world: 9, sentence: '¿[Qué] querés?' }))).toEqual(['tilde']);
    expect(stepsFor(word({ world: 2, sentence: 'Mi [papá] cocina.' }))).toEqual(['tilde']);
  });

  it('§2.1 monosílabo suelto: se omiten tónica y tipo', () => {
    expect(stepsFor(word({ world: 8, type: 'monosilaba', syllables: ['sol'] }))).toEqual(['tilde']);
  });

  it('§2.1 sobreesdrújula aparece desde el mundo 4', () => {
    expect(typeOptions(word({ world: 2 }), 2)).toEqual(['aguda', 'grave', 'esdrujula']);
    expect(typeOptions(word({ world: 2 }), 5)).toContain('sobreesdrujula');
    expect(typeOptions(word({ world: 4 }), 2)).toContain('sobreesdrujula');
  });
});

describe('§2.2 resultado del turno', () => {
  it('§2.2 full si todos los pasos son correctos', () => {
    const t = evaluateTurn(examen, correctAnswers(examen), { ms: 5000 });
    expect(t).toEqual({
      wordId: 'examen',
      steps: [
        { step: 'tonica', correct: true },
        { step: 'tipo', correct: true },
        { step: 'tilde', correct: true },
      ],
      full: true,
      hinted: false,
      challenge: false,
      ms: 5000,
    });
  });

  it('§2.1 un paso fallado no corta el turno: se evalúan todos', () => {
    const t = evaluateTurn(examen, { tonica: 2, tipo: 'grave', tilde: false }, { ms: 1 });
    expect(t.steps.map((s) => s.correct)).toEqual([false, true, true]);
    expect(t.full).toBe(false);
  });

  it('§2.2 un paso sin respuesta cuenta como incorrecto', () => {
    const t = evaluateTurn(examen, { tonica: 1, tipo: 'grave' }, { ms: 1 });
    expect(t.steps.at(-1)).toEqual({ step: 'tilde', correct: false });
  });

  it('§2.2 con pista la tónica no cuenta y el turno no es full', () => {
    const t = evaluateTurn(examen, correctAnswers(examen), { hinted: true, ms: 1 });
    expect(t.steps.map((s) => s.step)).toEqual(['tipo', 'tilde']);
    expect(t.steps.every((s) => s.correct)).toBe(true);
    expect(t.full).toBe(false);
    expect(t.hinted).toBe(true);
  });

  it('marca el desafío', () => {
    expect(evaluateTurn(examen, correctAnswers(examen), { challenge: true, ms: 1 }).challenge).toBe(
      true,
    );
  });
});

describe('palabra sin tildes', () => {
  it('saca las tildes pero deja ñ y ü', () => {
    expect(withoutTildes('camión')).toBe('camion');
    expect(withoutTildes('pingüino')).toBe('pingüino');
    expect(withoutTildes('añá')).toBe('aña');
  });
});
