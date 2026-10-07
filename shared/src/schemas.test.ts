import { describe, expect, it } from 'vitest';
import { IndexSchema, WordEntrySchema, WorldFileSchema, type WordEntry } from './schemas.ts';

const examen: WordEntry = {
  id: 'examen',
  word: 'examen',
  syllables: ['e', 'xa', 'men'],
  stressIndex: 1,
  type: 'grave',
  hasTilde: false,
  rule: 'grave_n_s_vocal',
  world: 3,
  tier: 2,
  distractor: 'exámen',
  sentence: null,
  tags: [],
  features: [],
  related: null,
  freq: 4.08,
};

describe('WordEntrySchema', () => {
  it('acepta una entrada válida', () => {
    expect(WordEntrySchema.parse(examen)).toEqual(examen);
  });

  it('rechaza un type o una regla que no existen', () => {
    expect(WordEntrySchema.safeParse({ ...examen, type: 'llana' }).success).toBe(false);
    expect(WordEntrySchema.safeParse({ ...examen, rule: 'grave' }).success).toBe(false);
  });

  it('rechaza mundo, tier o tónica fuera de rango', () => {
    expect(WordEntrySchema.safeParse({ ...examen, world: 11 }).success).toBe(false);
    expect(WordEntrySchema.safeParse({ ...examen, tier: 4 }).success).toBe(false);
    expect(WordEntrySchema.safeParse({ ...examen, stressIndex: 3 }).success).toBe(false);
  });

  it('rechaza sílabas que no forman la palabra', () => {
    expect(WordEntrySchema.safeParse({ ...examen, syllables: ['e', 'xa', 'mén'] }).success).toBe(
      false,
    );
  });

  it('rechaza campos de más', () => {
    expect(WordEntrySchema.safeParse({ ...examen, extra: 1 }).success).toBe(false);
  });
});

describe('WorldFileSchema', () => {
  it('rechaza palabras de otro mundo', () => {
    const file = { world: 2, name: 'El Tejado Puntiagudo', topic: 'agudas', words: [examen] };
    expect(WorldFileSchema.safeParse(file).success).toBe(false);
    expect(WorldFileSchema.safeParse({ ...file, world: 3 }).success).toBe(true);
  });
});

describe('IndexSchema', () => {
  it('exige versión de texto y tres tiers', () => {
    const world = {
      world: 1,
      name: 'La Sílaba que Ronronea',
      topic: 'sílaba tónica',
      file: 'world-01.json',
      count: 80,
      byTier: [28, 25, 27],
    };
    expect(IndexSchema.safeParse({ version: 'abc123', worlds: [world] }).success).toBe(true);
    expect(IndexSchema.safeParse({ version: 1, worlds: [world] }).success).toBe(false);
    expect(
      IndexSchema.safeParse({ version: 'abc123', worlds: [{ ...world, byTier: [1, 2] }] }).success,
    ).toBe(false);
  });
});
