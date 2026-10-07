import { describe, expect, it } from 'vitest';
import { indexWords, initialState, type WordEntry } from '@gatita/shared';
import world02 from '../../../public/words/world-02.json' with { type: 'json' };
import {
  advance,
  answerStep,
  createSession,
  position,
  toRound,
  tonicaAnswered,
} from './session.ts';

const words = indexWords(world02.words as WordEntry[]);
const start = () =>
  createSession({
    id: 'ronda-1',
    state: initialState(),
    words,
    world: 2,
    stop: 2,
    kind: 'practice',
    startedAt: '2026-03-02T15:00:00.000Z',
    nowMs: 0,
  });

/** Responde bien todos los pasos de la palabra actual. */
function answerAll(s: ReturnType<typeof start>, correct: boolean, nowMs = 5000) {
  let cur = s;
  while (cur.phase === 'step') {
    const w = cur.current!.word;
    const step = cur.steps[cur.stepIndex]!;
    const value =
      step === 'tonica'
        ? correct
          ? w.stressIndex
          : w.stressIndex === 0
            ? 1
            : 0
        : step === 'tipo'
          ? correct
            ? w.type
            : 'esdrujula'
          : correct
            ? w.hasTilde
            : !w.hasTilde;
    cur = answerStep(cur, value, nowMs);
  }
  return cur;
}

describe('ronda en curso', () => {
  it('arranca con la primera palabra y sus pasos', () => {
    const s = start();
    expect(s.phase).toBe('step');
    expect(s.current).not.toBeNull();
    expect(s.steps.length).toBeGreaterThan(0);
    expect(position(s)).toEqual({ done: 0, total: 10 });
  });

  it('es determinista con el mismo id de ronda', () => {
    expect(start().progress.planned.map((p) => p.word.id)).toEqual(
      start().progress.planned.map((p) => p.word.id),
    );
  });

  it('un paso por pantalla; después del último, feedback', () => {
    let s = start();
    const steps = s.steps.length;
    for (let i = 0; i < steps - 1; i++) {
      s = answerStep(s, s.current!.word.stressIndex, 1000);
      expect(s.phase).toBe('step');
    }
    s = answerAll(s, true);
    expect(s.phase).toBe('feedback');
    expect(s.lastTurn?.wordId).toBe(s.current!.word.id);
  });

  it('marca si la tónica estuvo bien (§2.1)', () => {
    let s = start();
    while (s.steps[0] !== 'tonica') s = advance(answerAll(s, true), 0);
    expect(tonicaAnswered(s)).toBeNull();
    s = answerStep(s, s.current!.word.stressIndex === 0 ? 1 : 0, 100);
    expect(tonicaAnswered(s)).toBe(false);
  });

  it('el tiempo del turno queda entre 300 ms y 10 min', () => {
    expect(answerAll(start(), true, 10).lastTurn?.ms).toBe(300);
    expect(answerAll(start(), true, 10_000_000).lastTurn?.ms).toBe(600_000);
  });

  it('después de 3 errores la siguiente viene con pista y sin paso de tónica (§4.3)', () => {
    let s = start();
    for (let i = 0; i < 3; i++) s = advance(answerAll(s, false), 0);
    expect(s.current?.hinted).toBe(true);
    expect(s.steps).not.toContain('tonica');
  });

  it('termina y arma el registro de la ronda', () => {
    let s = start();
    while (s.phase !== 'finished') s = advance(answerAll(s, true), 0);
    expect(position(s).done).toBeGreaterThanOrEqual(10);
    const round = toRound(s, {
      finishedAt: '2026-03-02T15:05:00.000Z',
      tzOffsetMin: -180,
      wordsVersion: 'v1',
    });
    expect(round).toMatchObject({
      id: 'ronda-1',
      world: 2,
      stop: 2,
      kind: 'practice',
      tzOffsetMin: -180,
    });
    expect(round.turns.every((t) => t.full)).toBe(true);
  });

  it('ignora respuestas fuera de la fase de pasos', () => {
    const s = answerAll(start(), true);
    expect(answerStep(s, true, 0)).toBe(s);
  });
});
