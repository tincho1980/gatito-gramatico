// Recepción de rondas y compras (arquitectura §6 y §7). El Worker recalcula todo con la
// misma lógica de `shared/`: lo que diga el cliente sobre XP, cajas o premios no cuenta.
import {
  CONFIG,
  PurchaseSchema,
  purchaseProblem,
  replay,
  RoundSchema,
  type ProfileState,
  type Purchase,
  type Rejected,
  type Round,
} from '@gatita/shared';
import type { Sql, TransactionSql } from 'postgres';
import {
  existingPurchases,
  existingRounds,
  insertPurchase,
  insertRound,
  purchasesOf,
  roundsOf,
  saveState,
  teacherUnlocksOf,
  type ProfileRow,
} from './db.ts';
import type { Bank } from './words.ts';

export interface Context {
  bank: Bank;
  now: Date;
}

const idOf = (raw: unknown): string =>
  typeof raw === 'object' && raw !== null && typeof (raw as { id?: unknown }).id === 'string'
    ? (raw as { id: string }).id
    : '';

const firstIssue = (error: {
  issues: readonly {
    code?: string;
    message: string;
    path: readonly PropertyKey[];
    keys?: string[];
  }[];
}) => {
  const issue = error.issues[0];
  if (!issue) return 'inválida';
  const where = issue.path.join('.') || 'ronda';
  if (issue.code === 'unrecognized_keys')
    return `${where}: campos de más (${issue.keys?.join(', ')})`;
  return `${where}: ${issue.message}`;
};

/** Revisa una ronda sin tocar la base. Devuelve la ronda o el motivo del rechazo. */
export function checkRound(
  raw: unknown,
  profile: Pick<ProfileRow, 'createdAt'>,
  { bank, now }: Context,
): Round | string {
  const parsed = RoundSchema.safeParse(raw);
  if (!parsed.success) return firstIssue(parsed.error);
  const round = parsed.data as Round;
  const finished = Date.parse(round.finishedAt);
  if (finished > now.getTime() + CONFIG.api.futureToleranceMin * 60_000) {
    return 'la ronda termina en el futuro';
  }
  if (finished < profile.createdAt.getTime() - CONFIG.api.futureToleranceMin * 60_000) {
    return 'la ronda es anterior al perfil';
  }
  // Con la versión actual del banco, cada palabra tiene que existir. Con una versión vieja,
  // las palabras que ya no están se ignoran al aplicar la ronda (arquitectura §8).
  if (round.wordsVersion === bank.version) {
    const missing = round.turns.find((t) => !bank.index.byId.has(t.wordId));
    if (missing) return `palabra inexistente: ${missing.wordId}`;
  }
  return round;
}

async function lockProfile(tx: TransactionSql, profileId: string) {
  // Serializa las subidas del mismo perfil: cada una recalcula sobre todo lo anterior.
  await tx`select id from private.profiles where id = ${profileId} for update`;
}

async function recompute(tx: TransactionSql, profileId: string, bank: Bank) {
  const state = replay(await roundsOf(tx, profileId), bank.index, {
    teacherUnlocks: await teacherUnlocksOf(tx, profileId),
  });
  await saveState(tx, profileId, state);
  return state;
}

export async function receiveRounds(
  sql: Sql,
  profile: ProfileRow,
  raws: readonly unknown[],
  ctx: Context,
): Promise<{ state: ProfileState; acceptedIds: string[]; rejected: Rejected[] }> {
  const rejected: Rejected[] = [];
  const valid: Round[] = [];
  for (const raw of raws) {
    const result = checkRound(raw, profile, ctx);
    if (typeof result === 'string') rejected.push({ id: idOf(raw), reason: result });
    else if (!valid.some((r) => r.id === result.id)) valid.push(result);
  }

  return sql.begin(async (tx) => {
    await lockProfile(tx, profile.id);
    const existing = await existingRounds(
      tx,
      valid.map((r) => r.id),
    );
    const acceptedIds: string[] = [];
    for (const round of valid) {
      const owner = existing.get(round.id);
      if (owner && owner !== profile.id) {
        rejected.push({ id: round.id, reason: 'el id ya es de otro perfil' });
        continue;
      }
      if (!owner) await insertRound(tx, profile.id, round);
      acceptedIds.push(round.id); // si ya estaba, se acepta igual: idempotente
    }
    const state = await recompute(tx, profile.id, ctx.bank);
    return { state, acceptedIds, rejected };
  });
}

export async function receivePurchases(
  sql: Sql,
  profile: ProfileRow,
  raws: readonly unknown[],
  ctx: Context,
): Promise<{ acceptedIds: string[]; rejected: Rejected[] }> {
  return sql.begin(async (tx) => {
    await lockProfile(tx, profile.id);
    const state = replay(await roundsOf(tx, profile.id), ctx.bank.index, {
      teacherUnlocks: await teacherUnlocksOf(tx, profile.id),
    });
    const owned = await purchasesOf(tx, profile.id);
    const existing = await existingPurchases(tx, raws.map(idOf).filter(Boolean));
    const acceptedIds: string[] = [];
    const rejected: Rejected[] = [];
    for (const raw of raws) {
      const parsed = PurchaseSchema.safeParse(raw);
      if (!parsed.success) {
        rejected.push({ id: idOf(raw), reason: firstIssue(parsed.error) });
        continue;
      }
      const p: Purchase = parsed.data;
      const owner = existing.get(p.id);
      if (owner) {
        if (owner === profile.id) acceptedIds.push(p.id);
        else rejected.push({ id: p.id, reason: 'el id ya es de otro perfil' });
        continue;
      }
      if (Date.parse(p.at) > ctx.now.getTime() + CONFIG.api.futureToleranceMin * 60_000) {
        rejected.push({ id: p.id, reason: 'la compra es del futuro' });
        continue;
      }
      const problem = purchaseProblem(state, owned, p.itemId);
      if (problem) {
        rejected.push({ id: p.id, reason: problem });
        continue;
      }
      await insertPurchase(tx, profile.id, p);
      owned.push(p);
      existing.set(p.id, profile.id);
      acceptedIds.push(p.id);
    }
    return { acceptedIds, rejected };
  });
}
