import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { indexWords, initialState, wallet, type Round, type WordEntry } from '@gatita/shared';
import world02 from '../../public/words/world-02.json' with { type: 'json' };
import { GatitaDB } from './db.ts';
import { profilesRepo, purchasesRepo, roundsRepo, saveRound, stateRepo } from './repos.ts';

const words = indexWords(world02.words as WordEntry[]);
const [w1, w2] = world02.words as WordEntry[];
let n = 0;
const fresh = () => new GatitaDB(`test-${++n}`);
const dbs: GatitaDB[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const round = (id: string, finishedAt: string, full: boolean): Round => ({
  id,
  world: 2,
  stop: 2,
  kind: 'practice',
  startedAt: finishedAt,
  finishedAt,
  tzOffsetMin: -180,
  wordsVersion: 'v1',
  turns: [w1!, w2!].map((w) => ({
    wordId: w.id,
    steps: [{ step: 'tilde', correct: full }],
    full,
    hinted: false,
    challenge: false,
    ms: 2000,
  })),
});

describe('repositorios locales', () => {
  it('crea un perfil invitado, lo deja activo y con estado inicial', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: '  Michi  ', avatar: 'naranja' }, { db });
    expect(p).toMatchObject({ alias: 'Michi', avatar: 'naranja', kind: 'guest', sound: true });
    expect((await profilesRepo.active(db))?.id).toBe(p.id);
    expect((await stateRepo.get(p.id, db)).roundsPlayed).toBe(0);
  });

  it('el perfil no guarda email ni nombre real', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    expect(Object.keys(p).sort()).toEqual(['alias', 'avatar', 'createdAt', 'id', 'kind', 'sound']);
  });

  it('guarda la ronda y el estado en la misma operación', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    const { before, after } = await saveRound(
      p.id,
      round('r1', '2026-03-02T15:00:00.000Z', false),
      words,
      {
        db,
      },
    );
    expect(before.roundsPlayed).toBe(0);
    expect(after.roundsPlayed).toBe(1);
    expect((await stateRepo.get(p.id, db)).words[w1!.id]?.box).toBe(1);
    const stored = await db.rounds.get('r1');
    expect(stored).toMatchObject({ profileId: p.id, synced: false });
  });

  it('abre los mundos indicados (desbloqueo del aula)', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    const { after } = await saveRound(p.id, round('r1', '2026-03-02T15:00:00.000Z', true), words, {
      db,
      teacherUnlocks: [2],
    });
    expect(after.worlds[2]?.unlocked).toBe(true);
  });

  it('reconstruye el estado desde las rondas con replay', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    await saveRound(p.id, round('r2', '2026-03-03T15:00:00.000Z', true), words, { db });
    await saveRound(p.id, round('r1', '2026-03-02T15:00:00.000Z', false), words, { db });
    expect((await roundsRepo.byProfile(p.id, db)).map((r) => r.id)).toEqual(['r1', 'r2']);
    const rebuilt = await stateRepo.rebuild(p.id, words, db);
    expect(rebuilt.roundsPlayed).toBe(2);
    expect(rebuilt.words[w1!.id]?.box).toBe(2); // falló y después acertó
  });

  it('cambia el interruptor de sonido', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    await profilesRepo.setSound(p.id, false, db);
    expect((await db.profiles.get(p.id))?.sound).toBe(false);
  });

  it('§8.3 compra con el saldo y guarda el accesorio puesto', async () => {
    const db = fresh();
    dbs.push(db);
    const p = await profilesRepo.create({ alias: 'Michi', avatar: 'gris' }, { db });
    expect(await purchasesRepo.buy(p.id, 'mono-rosa', { db })).toBe('balance');

    await db.profileState.put({
      profileId: p.id,
      state: { ...initialState(), croquetas: 25 },
      updatedAt: '2026-03-02T14:00:00.000Z',
    });
    expect(await purchasesRepo.buy(p.id, 'mono-rosa', { db })).toBeNull();
    expect(await purchasesRepo.buy(p.id, 'mono-rosa', { db })).toBe('owned');
    expect(await purchasesRepo.buy(p.id, 'flor', { db })).toBe('balance');
    const purchases = await purchasesRepo.byProfile(p.id, db);
    expect(wallet(await stateRepo.get(p.id, db), purchases)).toMatchObject({
      balance: 5,
      owned: ['mono-rosa'],
    });

    await profilesRepo.setLook(p.id, { accesorio: 'mono-rosa' }, db);
    expect((await db.profiles.get(p.id))?.look).toEqual({ accesorio: 'mono-rosa' });
  });

  it('saca un perfil del dispositivo con todo lo suyo y deja activo otro', async () => {
    const db = fresh();
    dbs.push(db);
    const a = await profilesRepo.create(
      { alias: 'Uno', avatar: 'gris' },
      { db, now: '2026-03-01T00:00:00Z' },
    );
    const b = await profilesRepo.create(
      { alias: 'Dos', avatar: 'gris' },
      { db, now: '2026-03-02T00:00:00Z' },
    );
    await saveRound(b.id, round('r1', '2026-03-02T14:00:00.000Z', true), words, { db });
    await profilesRepo.remove(b.id, db);
    expect(await db.profiles.get(b.id)).toBeUndefined();
    expect(await db.rounds.where('profileId').equals(b.id).count()).toBe(0);
    expect(await db.profileState.get(b.id)).toBeUndefined();
    expect((await profilesRepo.active(db))?.id).toBe(a.id);
    await profilesRepo.remove(a.id, db);
    expect(await profilesRepo.active(db)).toBeUndefined();
  });
});
