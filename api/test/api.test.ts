import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  applyRound,
  initialState,
  type ProfileState,
  type Round,
  type RoundsResponse,
} from '@gatita/shared';
import { perfectPlayer, simulate, WORDS } from '../../shared/src/engine/testing.ts';
import { applyMigrations, readMigrations } from '../scripts/migrations.ts';
import { startHarness, SUPABASE_URL, type Harness } from './harness.ts';

const FAMILY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TEACHER = '33333333-3333-4333-8333-333333333333';

/** uuid v4 determinista a partir de un texto (los ids del simulador no son uuid). */
function uuidFor(text: string): string {
  const s = createHash('sha256').update(text).digest('hex').split('');
  s[12] = '4';
  s[16] = '8';
  const j = s.join('');
  return `${j.slice(0, 8)}-${j.slice(8, 12)}-${j.slice(12, 16)}-${j.slice(16, 20)}-${j.slice(20, 32)}`;
}

// 40 rondas de un chico perfecto (lecciones incluidas), del 2 al 12 de marzo.
const SIM = simulate(perfectPlayer, { maxRounds: 40 });
const ROUNDS: Round[] = SIM.rounds.map((r) => ({ ...r, id: uuidFor(r.id) }));
const localState = (rounds: Round[]): ProfileState =>
  rounds.reduce((s, r) => applyRound(s, r, WORDS), initialState());

let h: Harness;
let profileId: string;

beforeAll(async () => {
  h = await startHarness();
  expect((await h.call(FAMILY, 'POST', '/accounts/me', { role: 'family' })).status).toBe(200);
  await h.call(OTHER, 'POST', '/accounts/me', { role: 'family' });
  await h.call(TEACHER, 'POST', '/accounts/me', { role: 'teacher' });
  profileId = uuidFor('michi');
  const res = await h.call(FAMILY, 'POST', '/profiles', {
    id: profileId,
    alias: 'Michi',
    avatar: 'naranja',
    createdAt: '2026-03-01T00:00:00.000Z',
  });
  expect(res.status).toBe(200);
});

afterAll(() => h.close());

const upload = async (rounds: unknown[], sub = FAMILY, id = profileId) => {
  const res = await h.call(sub, 'POST', '/rounds', { profileId: id, rounds });
  return { status: res.status, body: (await res.json()) as RoundsResponse };
};

const count = async (table: string) =>
  Number((await h.sql.unsafe(`select count(*) from private.${table}`))[0]!.count);

describe('autenticación', () => {
  it('sin token, con otro emisor o vencido: 401', async () => {
    expect((await h.call(null, 'GET', '/profiles')).status).toBe(401);
    const bad = async (token: string) =>
      (
        await h.app.request('/api/profiles', { headers: { Authorization: `Bearer ${token}` } }, {
          SUPABASE_URL,
        } as never)
      ).status;
    expect(await bad(await h.token(FAMILY, { issuer: 'https://otro.supabase.co/auth/v1' }))).toBe(
      401,
    );
    expect(await bad(await h.token(FAMILY, { expiresIn: '-1m' }))).toBe(401);
    expect(await bad('no-es-un-jwt')).toBe(401);
  });

  it('el rol de la cuenta no cambia una vez elegido', async () => {
    const res = await h.call(FAMILY, 'POST', '/accounts/me', { role: 'teacher' });
    expect(await res.json()).toMatchObject({ role: 'family' });
  });
});

describe('perfiles', () => {
  it('lista solo los del adulto', async () => {
    const mine = (await (await h.call(FAMILY, 'GET', '/profiles')).json()) as {
      profiles: { alias: string }[];
    };
    expect(mine.profiles.map((p) => p.alias)).toEqual(['Michi']);
    const theirs = (await (await h.call(OTHER, 'GET', '/profiles')).json()) as {
      profiles: unknown[];
    };
    expect(theirs.profiles).toEqual([]);
  });

  it('el alias no puede ser un email y un docente no crea perfiles de familia', async () => {
    const email = await h.call(FAMILY, 'POST', '/profiles', {
      id: uuidFor('mail'),
      alias: 'mica@mail.com',
      avatar: 'gris',
    });
    expect(email.status).toBe(400);
    const teacher = await h.call(TEACHER, 'POST', '/profiles', {
      id: uuidFor('t'),
      alias: 'Tomi',
      avatar: 'gris',
    });
    expect(teacher.status).toBe(403);
  });

  it('no se guarda email ni nombre real: el perfil solo tiene alias y avatar', async () => {
    const cols = await h.sql`
      select column_name from information_schema.columns
      where table_schema = 'private' and table_name = 'profiles'`;
    expect(cols.map((c) => c.column_name).sort()).toEqual(
      ['alias', 'avatar', 'classroom_id', 'created_at', 'id', 'owner_id', 'pin_hash'].sort(),
    );
  });
});

describe('rondas (arquitectura §6 y §7)', () => {
  it('jugar offline 3 rondas y subirlas: el estado del servidor coincide con el local', async () => {
    const three = ROUNDS.slice(0, 3);
    const { status, body } = await upload(three);
    expect(status).toBe(200);
    expect(body.acceptedIds).toEqual(three.map((r) => r.id));
    expect(body.rejected).toEqual([]);
    expect(body.state).toEqual(localState(three));
  });

  it('mandar la misma ronda dos veces no la duplica', async () => {
    const before = { rounds: await count('rounds'), turns: await count('turns') };
    const { body } = await upload(ROUNDS.slice(0, 3));
    expect(body.acceptedIds).toHaveLength(3);
    expect(await count('rounds')).toBe(before.rounds);
    expect(await count('turns')).toBe(before.turns);
    expect(body.state).toEqual(localState(ROUNDS.slice(0, 3)));
  });

  it('el resto del historial, en tandas de 20 y fuera de orden, da el mismo estado', async () => {
    const rest = ROUNDS.slice(3).reverse();
    let last: RoundsResponse | null = null;
    for (let i = 0; i < rest.length; i += 20) last = (await upload(rest.slice(i, i + 20))).body;
    expect(last?.state).toEqual(SIM.state);
  });

  it('no acepta más de 20 rondas por pedido', async () => {
    expect((await upload(Array(21).fill(ROUNDS[0]))).status).toBe(400);
  });

  it('rechaza una palabra inexistente de la versión actual del banco', async () => {
    const r: Round = {
      ...ROUNDS[5]!,
      id: uuidFor('trucha'),
      wordsVersion: (await import('../src/words.ts')).BANK.version,
      turns: [{ ...ROUNDS[5]!.turns[0]!, wordId: 'palabra-inventada' }],
    };
    const { body } = await upload([r]);
    expect(body.acceptedIds).toEqual([]);
    expect(body.rejected).toEqual([{ id: r.id, reason: 'palabra inexistente: palabra-inventada' }]);
  });

  it('rechaza rondas del futuro, anteriores al perfil o con XP inventado', async () => {
    const base = ROUNDS[5]!;
    const future = { ...base, id: uuidFor('f'), finishedAt: '2026-05-01T00:00:00.000Z' };
    const old = {
      ...base,
      id: uuidFor('o'),
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:05:00.000Z',
    };
    const xp = { ...base, id: uuidFor('x'), xp: 9999 };
    const { body } = await upload([future, old, xp]);
    expect(body.acceptedIds).toEqual([]);
    expect(body.rejected.map((r) => r.reason)).toEqual([
      'la ronda termina en el futuro',
      'la ronda es anterior al perfil',
      'ronda: campos de más (xp)',
    ]);
  });

  it('un jefe no habilitado se guarda pero no da desbloqueos ni premios', async () => {
    const pid = uuidFor('nuevo');
    await h.call(FAMILY, 'POST', '/profiles', {
      id: pid,
      alias: 'Nuevo',
      avatar: 'gris',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const words = WORDS.byWorld.get(1)!.slice(0, 10);
    const boss: Round = {
      ...ROUNDS[1]!,
      id: uuidFor('jefe-trucho'),
      world: 1,
      stop: 5,
      kind: 'boss',
      turns: words.map((w) => ({
        wordId: w.id,
        steps: [{ step: 'tonica', correct: true }],
        full: true,
        hinted: false,
        challenge: false,
        ms: 2000,
      })),
    };
    const { body } = await upload([boss], FAMILY, pid);
    expect(body.acceptedIds).toEqual([boss.id]);
    expect(body.state.worlds[1]?.bossBest).toBeNull();
    expect(body.state.worlds[2]?.unlocked).toBe(false);
    expect(body.state.croquetas).toBe(0);
  });

  it('el perfil de otro adulto no existe para vos', async () => {
    expect((await upload(ROUNDS.slice(0, 1), OTHER)).status).toBe(404);
    expect((await h.call(OTHER, 'GET', `/profiles/${profileId}/state`)).status).toBe(404);
  });

  it('el id de una ronda de otro perfil no se pisa', async () => {
    const pid = uuidFor('otro-de-familia');
    await h.call(FAMILY, 'POST', '/profiles', {
      id: pid,
      alias: 'Otro',
      avatar: 'gris',
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const { body } = await upload([ROUNDS[0]!], FAMILY, pid);
    expect(body.rejected).toEqual([{ id: ROUNDS[0]!.id, reason: 'el id ya es de otro perfil' }]);
  });

  it('con el límite de subidas agotado: 429', async () => {
    h.setLimiter({ limit: () => Promise.resolve({ success: false }) });
    expect((await upload(ROUNDS.slice(0, 1))).status).toBe(429);
    h.setLimiter(undefined);
  });

  it('un dispositivo nuevo recibe el estado, las rondas y las compras', async () => {
    const res = await h.call(FAMILY, 'GET', `/profiles/${profileId}/state`);
    const body = (await res.json()) as { state: ProfileState; rounds: Round[] };
    expect(body.state).toEqual(SIM.state);
    expect(body.rounds).toHaveLength(ROUNDS.length);
    expect(localState(body.rounds)).toEqual(SIM.state);
  });
});

describe('perfiles de la familia', () => {
  it('no se repite un apodo en la misma cuenta (sin distinguir mayúsculas)', async () => {
    const res = await h.call(FAMILY, 'POST', '/profiles', {
      id: uuidFor('michi-repetido'),
      alias: 'MICHI',
      avatar: 'gris',
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Ya tenés un perfil con ese apodo.' });
    // Otra familia sí puede usar el mismo apodo.
    const other = await h.call(OTHER, 'POST', '/profiles', {
      id: uuidFor('michi-de-otra'),
      alias: 'Michi',
      avatar: 'gris',
    });
    expect(other.status).toBe(200);
  });

  it('la familia borra un perfil con todo su progreso; otro adulto no puede', async () => {
    const id = uuidFor('para-borrar');
    await h.call(FAMILY, 'POST', '/profiles', {
      id,
      alias: 'Borrable',
      avatar: 'gris',
      createdAt: '2026-03-01T00:00:00.000Z',
      rounds: ROUNDS.slice(0, 3).map((r) => ({ ...r, id: uuidFor(`borrar-${r.id}`) })),
    });
    expect((await h.call(OTHER, 'DELETE', `/profiles/${id}`)).status).toBe(404);
    expect((await h.call(FAMILY, 'DELETE', `/profiles/${id}`)).status).toBe(200);
    const left = await h.sql`
      select (select count(*)::int from private.profiles where id = ${id}) as p,
             (select count(*)::int from private.rounds where profile_id = ${id}) as r,
             (select count(*)::int from private.profile_state where profile_id = ${id}) as s`;
    expect(left[0]).toEqual({ p: 0, r: 0, s: 0 });
  });
});

describe('vincular un perfil invitado con su historial', () => {
  it('sube las rondas junto con el perfil', async () => {
    const pid = uuidFor('invitado');
    const rounds = ROUNDS.slice(0, 5).map((r) => ({ ...r, id: uuidFor(`inv-${r.id}`) }));
    const res = await h.call(FAMILY, 'POST', '/profiles', {
      id: pid,
      alias: 'Invitada',
      avatar: 'siames',
      createdAt: '2026-03-01T00:00:00.000Z',
      rounds,
    });
    const body = (await res.json()) as RoundsResponse;
    expect(body.acceptedIds).toHaveLength(5);
    expect(body.state).toEqual(localState(rounds));
  });
});

describe('compras (especificación §8.3)', () => {
  const buy = async (itemId: string, n: string) => {
    const res = await h.call(FAMILY, 'POST', '/purchases', {
      profileId,
      purchases: [{ id: uuidFor(n), itemId, at: '2026-03-20T10:00:00.000Z' }],
    });
    return (await res.json()) as { acceptedIds: string[]; rejected: { reason: string }[] };
  };

  it('acepta lo que alcanza el saldo y rechaza el resto', async () => {
    expect(SIM.state.croquetas).toBeGreaterThanOrEqual(20);
    expect((await buy('mono-rosa', 'c1')).acceptedIds).toEqual([uuidFor('c1')]);
    expect((await buy('mono-rosa', 'c1')).acceptedIds).toEqual([uuidFor('c1')]); // idempotente
    expect((await buy('mono-rosa', 'c2')).rejected[0]?.reason).toBe('owned');
    expect((await buy('gato-tejado', 'c3')).rejected[0]?.reason).toBe('not-for-sale');
    expect((await buy('fondo-arcoiris', 'c4')).rejected[0]?.reason).toBe('balance');
  });
});

describe('seguridad de la base (arquitectura §9)', () => {
  it('con los roles de la clave pública no se lee ninguna tabla de private', async () => {
    const tables = (
      await h.db.query<{ tablename: string }>(
        `select tablename from pg_tables where schemaname = 'private'`,
      )
    ).rows.map((r) => r.tablename);
    expect(tables.length).toBeGreaterThan(8);
    for (const role of ['anon', 'authenticated']) {
      for (const t of tables) {
        await h.db.exec(`set role ${role}`);
        await expect(h.db.query(`select * from private.${t}`)).rejects.toThrow(/permission denied/);
        await h.db.exec('reset role');
      }
    }
  });

  it('todas las tablas tienen RLS', async () => {
    const rows = (
      await h.db.query<{ relname: string; relrowsecurity: boolean }>(
        `select c.relname, c.relrowsecurity from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'private' and c.relkind = 'r'`,
      )
    ).rows;
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });

  it('las migraciones quedan registradas y no se aplican dos veces', async () => {
    expect(await applyMigrations(h.sql)).toEqual([]);
    const rows = await h.sql`select version, name from supabase_migrations.schema_migrations`;
    expect(rows.map((r) => r.name)).toEqual(readMigrations().map((m) => m.name));
  });

  it('el rol del Worker lee y escribe', async () => {
    await h.db.exec('set role gatita_worker');
    const { rows } = await h.db.query<{ n: number }>(
      'select count(*)::int as n from private.rounds',
    );
    await h.db.exec('reset role');
    expect(rows[0]!.n).toBeGreaterThan(0);
  });
});
