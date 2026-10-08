// Sincronización de un perfil vinculado (arquitectura §7): sube las rondas y compras
// pendientes en orden, marca lo aceptado y lo rechazado, y toma el estado del servidor
// aplicando encima lo que se haya jugado mientras viajaba el pedido.
import {
  applyRound,
  CONFIG,
  sortRounds,
  type Purchase,
  type Round,
  type WordIndex,
} from '@gatita/shared';
import { db as defaultDb, type GatitaDB, type StoredPurchase, type StoredRound } from '../db/db.ts';
import type { Api } from './api.ts';

export interface SyncResult {
  sent: number;
  rejected: number;
}

// Solo los campos del contrato: lo local (perfil, estado de la subida) no viaja.
const toRound = (r: StoredRound): Round => ({
  id: r.id,
  world: r.world,
  stop: r.stop,
  kind: r.kind,
  startedAt: r.startedAt,
  finishedAt: r.finishedAt,
  tzOffsetMin: r.tzOffsetMin,
  wordsVersion: r.wordsVersion,
  turns: r.turns,
});
const toPurchase = (p: StoredPurchase): Purchase => ({ id: p.id, itemId: p.itemId, at: p.at });

const pendingRounds = async (db: GatitaDB, profileId: string) =>
  sortRounds(
    await db.rounds
      .where('profileId')
      .equals(profileId)
      .filter((r) => !r.synced && !r.rejected)
      .toArray(),
  ) as StoredRound[];

export async function pendingCount(profileId: string, db: GatitaDB = defaultDb): Promise<number> {
  const rounds = await db.rounds
    .where('profileId')
    .equals(profileId)
    .filter((r) => !r.synced && !r.rejected)
    .count();
  const purchases = await db.purchases
    .where('profileId')
    .equals(profileId)
    .filter((p) => !p.synced && !p.rejected)
    .count();
  return rounds + purchases;
}

export async function syncProfile(
  profileId: string,
  { api, words, db = defaultDb }: { api: Api; words: WordIndex; db?: GatitaDB },
): Promise<SyncResult> {
  const profile = await db.profiles.get(profileId);
  if (profile?.kind !== 'linked') return { sent: 0, rejected: 0 };
  const result: SyncResult = { sent: 0, rejected: 0 };

  for (;;) {
    const batch = (await pendingRounds(db, profileId)).slice(0, CONFIG.api.maxRoundsPerRequest);
    if (batch.length === 0) break;
    const res = await api.postRounds(profileId, batch.map(toRound));
    await db.transaction('rw', db.rounds, db.profileState, async () => {
      for (const id of res.acceptedIds) await db.rounds.update(id, { synced: true });
      for (const r of res.rejected) {
        console.warn(`Ronda ${r.id} rechazada por el servidor: ${r.reason}`);
        await db.rounds.update(r.id, { rejected: r.reason });
      }
      // El estado del servidor manda; lo pendiente se vuelve a aplicar encima.
      const rest = await pendingRounds(db, profileId);
      const state = rest.reduce((s, r) => applyRound(s, toRound(r), words), res.state);
      await db.profileState.put({ profileId, state, updatedAt: new Date().toISOString() });
    });
    result.sent += res.acceptedIds.length;
    result.rejected += res.rejected.length;
    // Lo que el servidor no contestó (ni aceptó ni rechazó) se reintenta en la próxima vuelta.
    if (res.acceptedIds.length + res.rejected.length === 0) break;
  }

  const purchases = (
    await db.purchases
      .where('profileId')
      .equals(profileId)
      .filter((p) => !p.synced && !p.rejected)
      .sortBy('at')
  ).slice(0, CONFIG.api.maxPurchasesPerRequest);
  if (purchases.length > 0) {
    const res = await api.postPurchases(profileId, purchases.map(toPurchase));
    await db.transaction('rw', db.purchases, async () => {
      for (const id of res.acceptedIds) await db.purchases.update(id, { synced: true });
      for (const r of res.rejected) {
        console.warn(`Compra ${r.id} rechazada por el servidor: ${r.reason}`);
        await db.purchases.update(r.id, { rejected: r.reason });
      }
    });
    result.sent += res.acceptedIds.length;
    result.rejected += res.rejected.length;
  }
  return result;
}
