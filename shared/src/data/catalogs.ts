// Catálogos de la colección (§8.3) y de insignias (§8.4), validados al cargarse.
import { z } from 'zod/mini';
import { BadgeSchema, CollectionItemSchema } from '../schemas.ts';
import badgesJson from './badges.json' with { type: 'json' };
import collectionJson from './collection.json' with { type: 'json' };

export const COLLECTION = z.array(CollectionItemSchema).parse(collectionJson);
export const BADGES = z.array(BadgeSchema).parse(badgesJson);
