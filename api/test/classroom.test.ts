import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  ClassroomSummary,
  DashboardResponse,
  JoinResponse,
  ProfileState,
  Round,
  RoundsResponse,
} from '@gatita/shared';
import { perfectPlayer, simulate } from '../../shared/src/engine/testing.ts';
import { startHarness, type Harness } from './harness.ts';

const TEACHER = '33333333-3333-4333-8333-333333333333';
const OTHER_TEACHER = '44444444-4444-4444-8444-444444444444';
const FAMILY = '11111111-1111-4111-8111-111111111111';

function uuidFor(text: string): string {
  const s = createHash('sha256').update(text).digest('hex').split('');
  s[12] = '4';
  s[16] = '8';
  const j = s.join('');
  return `${j.slice(0, 8)}-${j.slice(8, 12)}-${j.slice(12, 16)}-${j.slice(16, 20)}-${j.slice(20, 32)}`;
}

const SIM = simulate(perfectPlayer, { maxRounds: 12 });
const roundsFor = (kid: string, n: number): Round[] =>
  SIM.rounds.slice(0, n).map((r) => ({ ...r, id: uuidFor(`${kid}-${r.id}`) }));

let h: Harness;
let classroom: ClassroomSummary;
let n = 0;
/** Cada "celular" sale de una IP distinta. */
const join = async (body: Record<string, unknown>, ip = `10.0.0.${++n}`) =>
  h.callWith(null, 'POST', '/classrooms/join', body, { 'CF-Connecting-IP': ip });

beforeAll(async () => {
  h = await startHarness();
  await h.call(TEACHER, 'POST', '/accounts/me', { role: 'teacher' });
  await h.call(OTHER_TEACHER, 'POST', '/accounts/me', { role: 'teacher' });
  await h.call(FAMILY, 'POST', '/accounts/me', { role: 'family' });
  h.queueCodes('ABCDEF');
  const res = await h.call(TEACHER, 'POST', '/classrooms', { name: '4.º B' });
  expect(res.status).toBe(200);
  classroom = ((await res.json()) as { classroom: ClassroomSummary }).classroom;
});

afterAll(() => h.close());

describe('aulas', () => {
  it('el docente crea un aula con un código de 6 letras', () => {
    expect(classroom).toMatchObject({ name: '4.º B', code: 'ABCDEF', students: 0 });
  });

  it('si el código ya existe, prueba otro', async () => {
    h.queueCodes('ABCDEF', 'GHJKLM');
    const res = await h.call(TEACHER, 'POST', '/classrooms', { name: '5.º A' });
    expect(((await res.json()) as { classroom: ClassroomSummary }).classroom.code).toBe('GHJKLM');
  });

  it('una familia no crea aulas ni ve tableros', async () => {
    expect((await h.call(FAMILY, 'POST', '/classrooms', { name: 'x' })).status).toBe(403);
    // El aula no es suya: no se distingue de una que no existe.
    expect((await h.call(FAMILY, 'GET', `/classrooms/${classroom.id}/dashboard`)).status).toBe(404);
  });

  it('un docente no ve el aula de otro', async () => {
    const res = await h.call(OTHER_TEACHER, 'GET', `/classrooms/${classroom.id}/dashboard`);
    expect(res.status).toBe(404);
  });
});

describe('tres chicos entran desde tres celulares y sus rondas aparecen en el tablero', () => {
  const kids = ['Mica', 'Tomi', 'Juli'];
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    for (const [i, alias] of kids.entries()) {
      const res = await join({
        code: 'abc-def', // se normaliza
        alias,
        pin: `100${i}`,
        createdAt: '2026-03-01T00:00:00.000Z',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as JoinResponse;
      expect(body.existing).toBe(false);
      tokens[alias] = body.token;
      ids[alias] = body.profile.id;
      const up = await h.callWith(body.token, 'POST', '/rounds', {
        profileId: body.profile.id,
        rounds: roundsFor(alias, 4 + i * 2),
      });
      expect(((await up.json()) as RoundsResponse).rejected).toEqual([]);
    }
  });

  it('el tablero muestra a los tres con sus reglas, mundo y última actividad', async () => {
    const res = await h.call(TEACHER, 'GET', `/classrooms/${classroom.id}/dashboard`);
    const body = (await res.json()) as DashboardResponse;
    expect(body.classroom).toMatchObject({ code: 'ABCDEF', students: 3 });
    expect(body.students.map((s) => s.alias)).toEqual(['Juli', 'Mica', 'Tomi']);
    for (const s of body.students) {
      expect(s.roundsPlayed).toBeGreaterThan(0);
      expect(s.lastActivity).not.toBeNull();
      expect(Object.keys(s.rules).length).toBeGreaterThan(0);
      for (const r of Object.values(s.rules)) {
        expect(r.ema).toBeGreaterThan(0);
        expect(r.attempts).toBeGreaterThan(0);
      }
    }
    expect(body.students.find((s) => s.alias === 'Juli')!.roundsPlayed).toBeGreaterThan(
      body.students.find((s) => s.alias === 'Mica')!.roundsPlayed,
    );
  });

  it('el docente ve a los chicos de sus aulas en /profiles', async () => {
    const res = await h.call(TEACHER, 'GET', '/profiles');
    const { profiles } = (await res.json()) as { profiles: { alias: string }[] };
    expect(profiles.map((p) => p.alias).sort()).toEqual(['Juli', 'Mica', 'Tomi']);
  });

  it('el token de un chico solo sirve para su perfil', async () => {
    const mica = tokens.Mica!;
    expect((await h.callWith(mica, 'GET', `/profiles/${ids.Tomi}/state?only=state`)).status).toBe(
      404,
    );
    expect((await h.callWith(mica, 'GET', `/profiles/${ids.Mica}/state?only=state`)).status).toBe(
      200,
    );
    expect((await h.callWith(mica, 'GET', '/classrooms')).status).toBe(403);
    expect((await h.callWith(mica, 'GET', '/accounts/me')).status).toBe(403);
    expect((await h.callWith(mica, 'POST', '/profiles', {})).status).toBe(403);
  });

  it('desde otro celular, con el mismo apodo y PIN, recupera el perfil', async () => {
    const res = await join({ code: 'ABCDEF', alias: 'mica', pin: '1000' });
    const body = (await res.json()) as JoinResponse;
    expect(body.existing).toBe(true);
    expect(body.profile.id).toBe(ids.Mica);
    const state = await h.callWith(body.token, 'GET', `/profiles/${ids.Mica}/state`);
    const full = (await state.json()) as { rounds: Round[] };
    expect(full.rounds).toHaveLength(4);
  });

  it('con otro PIN no entra', async () => {
    const res = await join({ code: 'ABCDEF', alias: 'Mica', pin: '9999' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'El apodo o el PIN no coinciden.' });
  });

  it('abrir un mundo para el aula lo abre en el estado de cada chico', async () => {
    const res = await h.call(TEACHER, 'POST', `/classrooms/${classroom.id}/unlocks`, { world: 8 });
    expect(await res.json()).toEqual({ unlocks: [8] });
    for (const alias of kids) {
      const s = await h.callWith(tokens[alias]!, 'GET', `/profiles/${ids[alias]}/state?only=state`);
      expect(((await s.json()) as { state: ProfileState }).state.worlds[8]?.unlocked).toBe(true);
    }
    // Y sigue abierto después de subir más rondas.
    const up = await h.callWith(tokens.Mica!, 'POST', '/rounds', {
      profileId: ids.Mica,
      rounds: roundsFor('Mica', 6).slice(4),
    });
    expect(((await up.json()) as RoundsResponse).state.worlds[8]?.unlocked).toBe(true);
  });
});

describe('ingreso con PIN (arquitectura §9.7)', () => {
  it('11 intentos seguidos desde la misma IP: el 11.º queda bloqueado', async () => {
    const ip = '203.0.113.7';
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await join({ code: 'ABCDEF', alias: 'Mica', pin: String(2000 + i) }, ip);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    // Bloqueado aunque ahora pruebe el PIN correcto; otra IP no queda bloqueada.
    expect((await join({ code: 'ABCDEF', alias: 'Mica', pin: '1000' }, ip)).status).toBe(429);
    expect((await join({ code: 'ABCDEF', alias: 'Mica', pin: '1000' })).status).toBe(200);
  });

  it('la IP no se guarda, solo su hash', async () => {
    const rows = await h.sql`select ip_hash from private.join_attempts`;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.ip_hash).not.toContain('203.0.113.7');
    }
  });

  it('el PIN se guarda con hash, distinto para el mismo PIN en otro apodo', async () => {
    await join({ code: 'ABCDEF', alias: 'Lola', pin: '1000' });
    const rows = await h.sql`
      select alias, pin_hash from private.profiles where alias in ('Mica', 'Lola')`;
    const hashes = rows.map((r) => r.pin_hash as string);
    expect(hashes.every((x) => /^[0-9a-f]{64}$/.test(x) && !x.includes('1000'))).toBe(true);
    expect(new Set(hashes).size).toBe(2);
  });

  it('código inexistente o mal escrito', async () => {
    expect((await join({ code: 'QWERTY', alias: 'Mica', pin: '1000' })).status).toBe(404);
    expect((await join({ code: 'AB', alias: 'Mica', pin: '1000' })).status).toBe(404);
    expect((await join({ code: 'ABCDEF', alias: 'Mica', pin: '12' })).status).toBe(400);
  });

  it('el apodo no puede ser un email', async () => {
    const res = await join({ code: 'ABCDEF', alias: 'mica@mail.com', pin: '1234' });
    expect(res.status).toBe(400);
  });

  it('ningún dato del chico incluye email ni nombre real', async () => {
    const res = await join({ code: 'ABCDEF', alias: 'Nico', pin: '4321' });
    const body = (await res.json()) as JoinResponse;
    expect(Object.keys(body.profile).sort()).toEqual(['alias', 'avatar', 'classroomId', 'id']);
    const dash = (await (
      await h.call(TEACHER, 'GET', `/classrooms/${classroom.id}/dashboard`)
    ).json()) as DashboardResponse;
    expect(Object.keys(dash.students[0]!).sort()).toEqual(
      ['alias', 'avatar', 'id', 'lastActivity', 'roundsPlayed', 'rules', 'stars', 'world'].sort(),
    );
  });

  it('un perfil invitado que entra al aula conserva su id y puede subir su historial', async () => {
    const guest = uuidFor('invitada-del-celu');
    const res = await join({
      code: 'ABCDEF',
      alias: 'Invitada',
      pin: '5555',
      profileId: guest,
      createdAt: '2026-03-01T00:00:00.000Z',
    });
    const body = (await res.json()) as JoinResponse;
    expect(body.profile.id).toBe(guest);
    const up = await h.callWith(body.token, 'POST', '/rounds', {
      profileId: guest,
      rounds: roundsFor('invitada', 3),
    });
    expect(((await up.json()) as RoundsResponse).acceptedIds).toHaveLength(3);
  });

  it('un token de chico vencido o firmado con otro secreto no sirve', async () => {
    const res = await join({ code: 'ABCDEF', alias: 'Nico', pin: '4321' });
    const { token, profile } = (await res.json()) as JoinResponse;
    const forged = `${token.slice(0, -4)}AAAA`;
    expect((await h.callWith(forged, 'GET', `/profiles/${profile.id}/state`)).status).toBe(401);
    h.setNow('2026-08-01T00:00:00.000Z'); // más de 90 días después
    expect((await h.callWith(token, 'GET', `/profiles/${profile.id}/state`)).status).toBe(401);
    h.setNow('2026-04-01T12:00:00.000Z');
  });
});
