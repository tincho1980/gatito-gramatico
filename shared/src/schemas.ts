// Esquemas Zod: contratos del banco de palabras (y, más adelante, de la API). Se usa
// `zod/mini` (API funcional, mismo motor) para que pese poco en el bundle de la app.
import { z } from 'zod/mini';
import { WORLD_IDS } from './data/worlds.ts';

const text = () => z.string().check(z.minLength(1));
const count = () => z.int().check(z.nonnegative());

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
  .int()
  .check(z.refine((n) => WORLD_IDS.includes(n), 'mundo inexistente'));

export const TierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const WordEntrySchema = z
  .strictObject({
    id: text(),
    word: text(),
    syllables: z.array(text()).check(z.minLength(1)),
    stressIndex: count(),
    type: WordTypeSchema,
    hasTilde: z.boolean(),
    rule: RuleSchema,
    world: WorldIdSchema,
    tier: TierSchema,
    distractor: text(),
    sentence: z.nullable(text()),
    tags: z.array(text()),
    features: z.array(FeatureSchema),
    related: z.nullable(text()),
    freq: z.nullable(z.number()),
  })
  .check(
    z.refine((e) => e.stressIndex < e.syllables.length, 'stressIndex fuera de las sílabas'),
    z.refine((e) => e.syllables.join('') === e.word, 'las sílabas no forman la palabra'),
  );

export const WorldFileSchema = z
  .strictObject({
    world: WorldIdSchema,
    name: text(),
    topic: text(),
    words: z.array(WordEntrySchema),
  })
  .check(z.refine((f) => f.words.every((e) => e.world === f.world), 'hay palabras de otro mundo'));

export const IndexSchema = z.strictObject({
  /** Hash del contenido de los mundos: cada ronda guarda con qué versión se jugó. */
  version: text(),
  worlds: z.array(
    z.strictObject({
      world: WorldIdSchema,
      name: text(),
      topic: text(),
      file: z.string().check(z.regex(/^world-\d{2}\.json$/)),
      count: count(),
      byTier: z.tuple([count(), count(), count()]),
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

export const CollectionItemSchema = z.strictObject({
  id: text(),
  kind: z.enum(['accesorio', 'fondo', 'gato']),
  name: text(),
  price: count(),
  /** Se gana al vencer al jefe de ese mundo (no se compra). */
  unlockedBy: z.optional(z.strictObject({ boss: WorldIdSchema })),
});

export const BadgeSchema = z.strictObject({
  id: text(),
  name: text(),
  description: text(),
  /** Se muestra como "?" hasta ganarla. */
  secret: z.optional(z.boolean()),
});

export type CollectionItem = z.infer<typeof CollectionItemSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
