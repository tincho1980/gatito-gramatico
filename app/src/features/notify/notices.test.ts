import { describe, expect, it } from 'vitest';
import { initialState, type RoundSummary } from '@gatita/shared';
import { roundNotices } from './notices.ts';

const summary = (over: Partial<RoundSummary> = {}): RoundSummary => ({
  fulls: 10,
  total: 10,
  xp: 0,
  croquetas: 0,
  improved: null,
  toReview: null,
  boxesUp: [],
  newBadges: [],
  newItems: [],
  unlocked: [],
  ...over,
});

describe('avisos al ganar algo', () => {
  it('nivel nuevo, insignias y amigos', () => {
    const before = { ...initialState(), xp: 90 };
    const after = { ...initialState(), xp: 150 };
    const notices = roundNotices(
      summary({ newBadges: ['primera-ronda'], newItems: ['gato-tejado', 'corona-gata-sabia'] }),
      before,
      after,
    );
    expect(notices.map((n) => n.text)).toEqual([
      '¡Subiste al nivel 2!',
      'Nueva insignia: Primera ronda',
      'Nuevo amigo: Gato de tejado',
      'Ganaste: Corona de la Gata Sabia',
    ]);
  });

  it('sin nada nuevo no hay avisos', () => {
    expect(roundNotices(summary(), initialState(), initialState())).toEqual([]);
  });
});
