import { describe, expect, it } from 'vitest';
import { PurchaseSchema, RoundSchema } from './api.ts';

const turn = (over = {}) => ({
  wordId: 'casa',
  steps: [{ step: 'tilde', correct: true }],
  full: true,
  hinted: false,
  challenge: false,
  ms: 2000,
  ...over,
});
const round = (over = {}) => ({
  id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  world: 2,
  stop: 2,
  kind: 'practice',
  startedAt: '2026-03-02T14:00:00.000Z',
  finishedAt: '2026-03-02T14:05:00.000Z',
  tzOffsetMin: -180,
  wordsVersion: 'abc',
  turns: [turn()],
  ...over,
});

describe('contrato de rondas (arquitectura §6)', () => {
  it('acepta una ronda bien formada', () => {
    expect(RoundSchema.safeParse(round()).success).toBe(true);
  });

  it.each([
    ['tiempo de turno menor a 300 ms', round({ turns: [turn({ ms: 100 })] })],
    ['tiempo de turno de más de 10 minutos', round({ turns: [turn({ ms: 700_000 })] })],
    ['más de 11 turnos', round({ turns: Array(12).fill(turn()) })],
    [
      'lección con más de 3 turnos',
      round({ kind: 'lesson', stop: 1, turns: Array(4).fill(turn()) }),
    ],
    ['jefe que no es la parada 5', round({ kind: 'boss', stop: 4 })],
    ['termina antes de empezar', round({ finishedAt: '2026-03-02T13:00:00.000Z' })],
    [
      'full con un paso mal',
      round({ turns: [turn({ steps: [{ step: 'tilde', correct: false }] })] }),
    ],
    ['full con pista', round({ turns: [turn({ hinted: true })] })],
    ['mundo inexistente', round({ world: 11 })],
    ['id que no es uuid', round({ id: 'r1' })],
    ['campos de más', round({ xp: 9999 })],
  ])('rechaza: %s', (_, r) => {
    expect(RoundSchema.safeParse(r).success).toBe(false);
  });
});

describe('contrato de compras', () => {
  it('id uuid, ítem y fecha', () => {
    const p = {
      id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
      itemId: 'mono-rosa',
      at: '2026-03-02T14:00:00Z',
    };
    expect(PurchaseSchema.safeParse(p).success).toBe(true);
    expect(PurchaseSchema.safeParse({ ...p, price: 0 }).success).toBe(false);
  });
});
