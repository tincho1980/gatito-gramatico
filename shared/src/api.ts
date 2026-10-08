// Contratos de la API del Worker (arquitectura §6). La app y el Worker validan con estos
// mismos esquemas. Las reglas que dependen del estado (dueño del perfil, jefe habilitado,
// saldo) se revisan en el Worker; acá solo la forma de los datos.
import { z } from 'zod/mini';
import { CONFIG } from './engine/config.ts';
import type { Purchase } from './engine/shop.ts';
import type { ProfileState, Round } from './engine/types.ts';
import { AVATARS } from './profile.ts';
import { WorldIdSchema } from './schemas.ts';

const { api } = CONFIG;
const uuid = () => z.uuid();
const isoDate = () => z.iso.datetime({ offset: true });

export const StepResultSchema = z.strictObject({
  step: z.enum(['tonica', 'tipo', 'tilde']),
  correct: z.boolean(),
});

export const TurnResultSchema = z.strictObject({
  wordId: z.string().check(z.minLength(1), z.maxLength(80)),
  steps: z.array(StepResultSchema).check(z.minLength(1), z.maxLength(3)),
  full: z.boolean(),
  hinted: z.boolean(),
  challenge: z.boolean(),
  ms: z.int().check(z.gte(api.minMs), z.lte(api.maxMs)),
});

export const RoundSchema = z
  .strictObject({
    id: uuid(),
    world: WorldIdSchema,
    stop: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    kind: z.enum(['practice', 'boss', 'lesson']),
    startedAt: isoDate(),
    finishedAt: isoDate(),
    tzOffsetMin: z.int().check(z.gte(-14 * 60), z.lte(14 * 60)),
    wordsVersion: z.string().check(z.minLength(1), z.maxLength(40)),
    turns: z.array(TurnResultSchema).check(z.maxLength(api.maxTurns)),
  })
  .check(
    z.refine((r) => Date.parse(r.startedAt) <= Date.parse(r.finishedAt), {
      error: 'la ronda termina antes de empezar',
    }),
    z.refine((r) => r.kind !== 'lesson' || r.turns.length <= api.maxLessonTurns, {
      error: 'la lección tiene demasiados turnos',
    }),
    z.refine((r) => (r.kind === 'boss') === (r.stop === 5), {
      error: 'el jefe es la parada 5',
    }),
    z.refine((r) => (r.kind === 'lesson') === (r.stop === 1), {
      error: 'la lección es la parada 1',
    }),
    // `full` tiene que coincidir con los pasos (§2.2): no se puede declarar un acierto.
    z.refine(
      (r) => r.turns.every((t) => t.full === (!t.hinted && t.steps.every((s) => s.correct))),
      {
        error: 'un turno dice full sin serlo',
      },
    ),
  );

export const PurchaseSchema = z.strictObject({
  id: uuid(),
  itemId: z.string().check(z.minLength(1), z.maxLength(60)),
  at: isoDate(),
});

export const AccountRequestSchema = z.strictObject({ role: z.enum(['family', 'teacher']) });

export const RoundsRequestSchema = z.strictObject({
  profileId: uuid(),
  rounds: z.array(z.unknown()).check(z.minLength(1), z.maxLength(api.maxRoundsPerRequest)),
});

export const PurchasesRequestSchema = z.strictObject({
  profileId: uuid(),
  purchases: z.array(z.unknown()).check(z.minLength(1), z.maxLength(api.maxPurchasesPerRequest)),
});

export const ProfileRequestSchema = z.strictObject({
  id: uuid(),
  alias: z.string(),
  avatar: z.enum(AVATARS),
  /** Alta del perfil invitado en el dispositivo: sus rondas no pueden ser anteriores. */
  createdAt: z.optional(isoDate()),
  /** Historial de un perfil invitado que se vincula (§6). */
  rounds: z.optional(z.array(z.unknown()).check(z.maxLength(2000))),
});

/** Una ronda o compra que el Worker no aceptó, con el motivo. No se reintenta. */
export interface Rejected {
  id: string;
  reason: string;
}

export interface RoundsResponse {
  state: ProfileState;
  acceptedIds: string[];
  rejected: Rejected[];
}

export interface PurchasesResponse {
  acceptedIds: string[];
  rejected: Rejected[];
}

/** Estado de un perfil para un dispositivo nuevo: el estado y los registros fuente. */
export interface ProfileStateResponse {
  state: ProfileState;
  rounds: Round[];
  purchases: Purchase[];
}
