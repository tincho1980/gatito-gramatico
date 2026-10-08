import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTeacherUnlocks,
  indexWords,
  replay,
  type Purchase,
  type PurchasesResponse,
  type Round,
  type RoundsResponse,
  type WordEntry,
} from '@gatita/shared';
import world02 from '../../public/words/world-02.json' with { type: 'json' };
import { GatitaDB } from '../db/db.ts';
import { profilesRepo, saveRound, stateRepo } from '../db/repos.ts';
import { ApiError, createApi, type Api } from './api.ts';
import { backoffMs, createRunner } from './runner.ts';
import { pendingCount, syncProfile } from './sync.ts';

const words = indexWords(world02.words as WordEntry[]);
const list = world02.words as WordEntry[];
let n = 0;
const dbs: GatitaDB[] = [];
const fresh = () => {
  const db = new GatitaDB(`sync-${++n}`);
  dbs.push(db);
  return db;
};
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const round = (i: number): Round => ({
  id: crypto.randomUUID(),
  world: 2,
  stop: 2,
  kind: 'practice',
  startedAt: `2026-03-0${2 + i}T14:00:00.000Z`,
  finishedAt: `2026-03-0${2 + i}T14:05:00.000Z`,
  tzOffsetMin: -180,
  wordsVersion: 'v1',
  turns: list.slice(i * 3, i * 3 + 3).map((w) => ({
    wordId: w.id,
    steps: [{ step: 'tilde' as const, correct: true }],
    full: true,
    hinted: false,
    challenge: false,
    ms: 2000,
  })),
});

/** Servidor de mentira: guarda las rondas y recalcula con la misma lógica. */
function fakeServer() {
  const rounds = new Map<string, Round>();
  const purchases: Purchase[] = [];
  let online = true;
  const unlocks: number[] = [];
  const api: Api = {
    postRounds: async (_profileId, sent) => {
      if (!online) throw new ApiError(0, true);
      const acceptedIds: string[] = [];
      const rejected: RoundsResponse['rejected'] = [];
      for (const r of sent as Round[]) {
        if (r.turns.some((t) => t.wordId === 'inventada')) {
          rejected.push({ id: r.id, reason: 'palabra inexistente: inventada' });
        } else {
          rounds.set(r.id, r);
          acceptedIds.push(r.id);
        }
      }
      return { state: replay([...rounds.values()], words), acceptedIds, rejected };
    },
    getState: async () => {
      if (!online) throw new ApiError(0, true);
      return { state: applyTeacherUnlocks(replay([...rounds.values()], words), unlocks) };
    },
    postPurchases: async (_profileId, sent): Promise<PurchasesResponse> => {
      if (!online) throw new ApiError(0, true);
      purchases.push(...(sent as Purchase[]));
      return { acceptedIds: (sent as Purchase[]).map((p) => p.id), rejected: [] };
    },
  };
  return {
    api,
    rounds,
    purchases,
    setOnline: (v: boolean) => {
      online = v;
    },
    unlock: (world: number) => unlocks.push(world),
  };
}

async function linkedProfile(db: GatitaDB) {
  const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
  await db.profiles.update(p.id, {
    kind: 'linked',
    link: { via: 'family', accountId: 'a1' },
  });
  return p.id;
}

describe('sincronización (arquitectura §7)', () => {
  it('3 rondas jugadas sin red se suben solas al volver y el estado coincide', async () => {
    const db = fresh();
    const id = await linkedProfile(db);
    const server = fakeServer();
    server.setOnline(false);
    for (let i = 0; i < 3; i++) await saveRound(id, round(i), words, { db });
    expect(await pendingCount(id, db)).toBe(3);

    await expect(syncProfile(id, { api: server.api, words, db })).rejects.toBeInstanceOf(ApiError);
    expect(await pendingCount(id, db)).toBe(3);

    server.setOnline(true);
    expect(await syncProfile(id, { api: server.api, words, db })).toEqual({
      sent: 3,
      rejected: 0,
    });
    expect(await pendingCount(id, db)).toBe(0);
    expect(await stateRepo.get(id, db)).toEqual(replay([...server.rounds.values()], words));
  });

  it('una ronda rechazada no se reintenta', async () => {
    const db = fresh();
    const id = await linkedProfile(db);
    const server = fakeServer();
    const bad = round(0);
    bad.turns[0]!.wordId = 'inventada';
    await saveRound(id, bad, words, { db });
    await saveRound(id, round(1), words, { db });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await syncProfile(id, { api: server.api, words, db })).toEqual({
      sent: 1,
      rejected: 1,
    });
    expect((await db.rounds.get(bad.id))?.rejected).toBe('palabra inexistente: inventada');
    expect(await pendingCount(id, db)).toBe(0);
    expect(await syncProfile(id, { api: server.api, words, db })).toEqual({
      sent: 0,
      rejected: 0,
    });
  });

  it('lo jugado mientras viajaba el pedido se aplica encima del estado del servidor', async () => {
    const db = fresh();
    const id = await linkedProfile(db);
    const server = fakeServer();
    await saveRound(id, round(0), words, { db });
    const late = round(1);
    let first = true;
    const api: Api = {
      ...server.api,
      postRounds: async (pid, sent) => {
        const res = await server.api.postRounds(pid, sent);
        if (first) {
          first = false;
          await saveRound(id, late, words, { db }); // se terminó otra ronda en el medio
          // Antes de subirla, el estado local ya la incluye (servidor + pendiente).
        }
        return res;
      },
    };
    await syncProfile(id, { api, words, db });
    expect(server.rounds.size).toBe(2);
    expect(await pendingCount(id, db)).toBe(0);
    expect(await stateRepo.get(id, db)).toEqual(replay([...server.rounds.values()], words));
  });

  it('también sube las compras, sin los campos locales', async () => {
    const db = fresh();
    const id = await linkedProfile(db);
    const server = fakeServer();
    await db.purchases.add({
      id: crypto.randomUUID(),
      profileId: id,
      itemId: 'mono-rosa',
      at: '2026-03-02T14:00:00.000Z',
      synced: false,
    });
    await syncProfile(id, { api: server.api, words, db });
    expect(server.purchases.map((p) => p.itemId)).toEqual(['mono-rosa']);
    expect(server.purchases[0]).not.toHaveProperty('synced');
    expect(await pendingCount(id, db)).toBe(0);
  });

  it('sin nada para subir, trae los cambios del servidor (un mundo abierto por el docente)', async () => {
    const db = fresh();
    const id = await linkedProfile(db);
    const server = fakeServer();
    await saveRound(id, round(0), words, { db });
    await syncProfile(id, { api: server.api, words, db });
    server.unlock(8);
    await syncProfile(id, { api: server.api, words, db });
    expect((await stateRepo.get(id, db)).worlds[8]?.unlocked).toBe(true);
  });

  it('un perfil invitado no se sincroniza', async () => {
    const db = fresh();
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    await saveRound(p.id, round(0), words, { db });
    const server = fakeServer();
    expect(await syncProfile(p.id, { api: server.api, words, db })).toEqual({
      sent: 0,
      rejected: 0,
    });
    expect(server.rounds.size).toBe(0);
  });
});

describe('cliente de la API', () => {
  it('sin token no llama; red caída, 429 y 5xx se reintentan; 4xx no', async () => {
    const fetchSpy = vi.fn();
    await expect(createApi(async () => null, fetchSpy).postRounds('p', [])).rejects.toMatchObject({
      status: 401,
      retry: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    const status = (s: number) =>
      createApi(
        async () => 't',
        async () => new Response('{}', { status: s }),
      ).postRounds('p', []);
    await expect(status(503)).rejects.toMatchObject({ retry: true });
    await expect(status(429)).rejects.toMatchObject({ retry: true });
    await expect(status(400)).rejects.toMatchObject({ retry: false });
    const offline = createApi(
      async () => 't',
      async () => {
        throw new TypeError('Failed to fetch');
      },
    );
    await expect(offline.postRounds('p', [])).rejects.toMatchObject({ status: 0, retry: true });
  });

  it('manda el token y el cuerpo esperado', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"acceptedIds":[]}', { status: 200 }));
    await createApi(async () => 'tok', fetchSpy).postPurchases('p1', [{ id: 'x' }]);
    expect(fetchSpy).toHaveBeenCalledWith('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify({ profileId: 'p1', purchases: [{ id: 'x' }] }),
    });
  });
});

describe('reintentos', () => {
  it('espera 2 s, 4 s, 8 s… hasta 5 minutos', () => {
    expect([0, 1, 2, 10].map(backoffMs)).toEqual([2000, 4000, 8000, 300_000]);
  });

  it('reintenta sin red y para cuando sale bien', async () => {
    const timers: { fn: () => void; ms: number }[] = [];
    let fails = 2;
    const statuses: string[] = [];
    const run = vi.fn(async () => {
      if (fails-- > 0) throw new ApiError(0, true);
    });
    const runner = createRunner({
      run,
      onStatus: (s) => statuses.push(s),
      setTimer: (fn, ms) => timers.push({ fn, ms }),
      clearTimer: () => {},
    });
    runner.trigger();
    await vi.waitFor(() => expect(timers).toHaveLength(1));
    timers[0]!.fn();
    await vi.waitFor(() => expect(timers).toHaveLength(2));
    timers[1]!.fn();
    await vi.waitFor(() => expect(statuses.at(-1)).toBe('synced'));
    expect(timers.map((t) => t.ms)).toEqual([2000, 4000]);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('sin token no reintenta solo', async () => {
    const timers: unknown[] = [];
    const statuses: string[] = [];
    const runner = createRunner({
      run: async () => {
        throw new ApiError(401, false);
      },
      onStatus: (s) => statuses.push(s),
      setTimer: (fn) => timers.push(fn),
    });
    runner.trigger();
    await vi.waitFor(() => expect(statuses.at(-1)).toBe('error'));
    expect(timers).toEqual([]);
  });
});
