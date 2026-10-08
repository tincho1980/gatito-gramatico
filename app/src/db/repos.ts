// Repositorios sobre Dexie. Reciben la base para poder testearlos con una en memoria.
import {
  applyRound,
  initialState,
  normalizeAlias,
  purchaseProblem,
  replay,
  sortRounds,
  type Avatar,
  type ProfileState,
  type Purchase,
  type PurchaseProblem,
  type Round,
  type WordIndex,
} from '@gatita/shared';
import { db as defaultDb, type GatitaDB, type Look, type Profile } from './db.ts';

export const profilesRepo = {
  async create(
    { alias, avatar }: { alias: string; avatar: Avatar },
    { db = defaultDb, now = new Date().toISOString() } = {},
  ): Promise<Profile> {
    const profile: Profile = {
      id: crypto.randomUUID(),
      alias: normalizeAlias(alias),
      avatar,
      kind: 'guest',
      createdAt: now,
      sound: true,
    };
    await db.transaction('rw', db.profiles, db.meta, db.profileState, async () => {
      await db.profiles.add(profile);
      await db.profileState.put({ profileId: profile.id, state: initialState(), updatedAt: now });
      await db.meta.put({ key: 'activeProfileId', value: profile.id });
    });
    return profile;
  },

  async active(db: GatitaDB = defaultDb): Promise<Profile | undefined> {
    const meta = await db.meta.get('activeProfileId');
    return meta ? db.profiles.get(meta.value) : undefined;
  },

  async setSound(id: string, sound: boolean, db: GatitaDB = defaultDb): Promise<void> {
    await db.profiles.update(id, { sound });
  },

  async setLook(id: string, look: Look, db: GatitaDB = defaultDb): Promise<void> {
    await db.profiles.update(id, { look });
  },
};

export const purchasesRepo = {
  async byProfile(profileId: string, db: GatitaDB = defaultDb): Promise<Purchase[]> {
    return (await db.purchases.where('profileId').equals(profileId).sortBy('at')).map(
      ({ id, itemId, at }) => ({ id, itemId, at }),
    );
  },

  /** Compra un ítem si alcanza el saldo (§8.3). Devuelve el problema si no se pudo. */
  async buy(
    profileId: string,
    itemId: string,
    { db = defaultDb, now = new Date().toISOString() } = {},
  ): Promise<PurchaseProblem | null> {
    return db.transaction('rw', db.purchases, db.profileState, async () => {
      const state = await stateRepo.get(profileId, db);
      const problem = purchaseProblem(state, await purchasesRepo.byProfile(profileId, db), itemId);
      if (problem) return problem;
      await db.purchases.add({
        id: crypto.randomUUID(),
        profileId,
        itemId,
        at: now,
        synced: false,
      });
      return null;
    });
  },
};

export const roundsRepo = {
  async byProfile(profileId: string, db: GatitaDB = defaultDb): Promise<Round[]> {
    return sortRounds(await db.rounds.where('profileId').equals(profileId).toArray());
  },
};

export const stateRepo = {
  async get(profileId: string, db: GatitaDB = defaultDb): Promise<ProfileState> {
    return (await db.profileState.get(profileId))?.state ?? initialState();
  },

  /** Rehace el estado desde las rondas guardadas (por ejemplo, si cambia la lógica). */
  async rebuild(
    profileId: string,
    words: WordIndex,
    db: GatitaDB = defaultDb,
  ): Promise<ProfileState> {
    const state = replay(await roundsRepo.byProfile(profileId, db), words);
    await db.profileState.put({ profileId, state, updatedAt: new Date().toISOString() });
    return state;
  },
};

/**
 * Guarda una ronda terminada y actualiza el estado en la misma transacción.
 * Devuelve el estado antes y después, para la pantalla de resultados.
 */
export async function saveRound(
  profileId: string,
  round: Round,
  words: WordIndex,
  {
    db = defaultDb,
    teacherUnlocks = [],
  }: { db?: GatitaDB; teacherUnlocks?: readonly number[] } = {},
): Promise<{ before: ProfileState; after: ProfileState }> {
  return db.transaction('rw', db.rounds, db.profileState, async () => {
    const before = await stateRepo.get(profileId, db);
    const after = applyRound(before, round, words, { teacherUnlocks });
    await db.rounds.add({ ...round, profileId, synced: false });
    await db.profileState.put({ profileId, state: after, updatedAt: round.finishedAt });
    return { before, after };
  });
}
