// Esquemas Zod: contratos del banco de palabras (y, más adelante, de la API).
import { z } from 'zod';
import { WORLD_IDS } from './data/worlds.ts';

export const WordTypeSchema = z.enum([
  'monosilaba',
  'aguda',
  'grave',
  'esdrujula',
  'sobreesdrujula',
]);

export const RuleSchema = z.enum([
  'monosilabo',
  'diacritica',
  'hiato',
  'aguda_n_s_vocal',
  'aguda_otra',
  'grave_n_s_vocal',
  'grave_otra',
  'esdrujula',
  'sobreesdrujula',
  'interrogativa',
  'mente',
]);

export const FeatureSchema = z.enum(['diptongo', 'triptongo', 'hiato']);

export const WorldIdSchema = z
  .number()
  .int()
  .refine((n) => WORLD_IDS.includes(n), 'mundo inexistente');

export const TierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const WordEntrySchema = z
  .strictObject({
    id: z.string().min(1),
    word: z.string().min(1),
    syllables: z.array(z.string().min(1)).min(1),
    stressIndex: z.number().int().nonnegative(),
    type: WordTypeSchema,
    hasTilde: z.boolean(),
    rule: RuleSchema,
    world: WorldIdSchema,
    tier: TierSchema,
    distractor: z.string().min(1),
    sentence: z.string().min(1).nullable(),
    tags: z.array(z.string().min(1)),
    features: z.array(FeatureSchema),
    related: z.string().min(1).nullable(),
    freq: z.number().nullable(),
  })
  .refine((e) => e.stressIndex < e.syllables.length, 'stressIndex fuera de las sílabas')
  .refine((e) => e.syllables.join('') === e.word, 'las sílabas no forman la palabra');

export const WorldFileSchema = z
  .strictObject({
    world: WorldIdSchema,
    name: z.string().min(1),
    topic: z.string().min(1),
    words: z.array(WordEntrySchema),
  })
  .refine((f) => f.words.every((e) => e.world === f.world), 'hay palabras de otro mundo');

export const IndexSchema = z.strictObject({
  /** Hash del contenido de los mundos: cada ronda guarda con qué versión se jugó. */
  version: z.string().min(1),
  worlds: z.array(
    z.strictObject({
      world: WorldIdSchema,
      name: z.string().min(1),
      topic: z.string().min(1),
      file: z.string().regex(/^world-\d{2}\.json$/),
      count: z.number().int().nonnegative(),
      byTier: z.tuple([
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
      ]),
    }),
  ),
});

export type WordType = z.infer<typeof WordTypeSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Tier = z.infer<typeof TierSchema>;
export type WordEntry = z.infer<typeof WordEntrySchema>;
export type WorldFile = z.infer<typeof WorldFileSchema>;
export type WordsIndex = z.infer<typeof IndexSchema>;
