// Acceso a Postgres con SQL explícito (postgres.js). Todo en el esquema `private`.
import type { Sql, TransactionSql } from 'postgres';
import type { ProfileState, Purchase, Round, StepResult } from '@gatita/shared';

type Tx = Sql | TransactionSql;

export type Role = 'family' | 'teacher';

export interface ProfileRow {
  id: string;
  ownerId: string | null;
  classroomId: string | null;
  alias: string;
  avatar: string;
  createdAt: Date;
}

export async function getAccount(sql: Tx, id: string): Promise<{ role: Role } | null> {
  const [row] = await sql<{ role: Role }[]>`select role from private.accounts where id = ${id}`;
  return row ?? null;
}

/** Crea la cuenta si no existe. El rol no cambia una vez elegido. */
export async function ensureAccount(sql: Tx, id: string, role: Role): Promise<Role> {
  const [row] = await sql<{ role: Role }[]>`
    insert into private.accounts (id, role) values (${id}, ${role})
    on conflict (id) do update set id = excluded.id
    returning role`;
  return row!.role;
}

export async function getProfile(sql: Tx, id: string): Promise<ProfileRow | null> {
  const [row] = await sql<ProfileRow[]>`
    select id, owner_id as "ownerId", classroom_id as "classroomId", alias, avatar,
           created_at as "createdAt"
    from private.profiles where id = ${id}`;
  return row ?? null;
}

export async function profilesOf(sql: Tx, accountId: string): Promise<ProfileRow[]> {
  return sql<ProfileRow[]>`
    select id, owner_id as "ownerId", classroom_id as "classroomId", alias, avatar,
           created_at as "createdAt"
    from private.profiles where owner_id = ${accountId}
    order by created_at`;
}

export async function insertProfile(
  sql: Tx,
  p: { id: string; ownerId: string; alias: string; avatar: string; createdAt: string },
): Promise<void> {
  await sql`
    insert into private.profiles (id, owner_id, alias, avatar, created_at)
    values (${p.id}, ${p.ownerId}, ${p.alias}, ${p.avatar}, ${p.createdAt})`;
}

/** Ids de rondas que ya existen, con su perfil (para la idempotencia). */
export async function existingRounds(
  sql: Tx,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await sql<{ id: string; profileId: string }[]>`
    select id, profile_id as "profileId" from private.rounds where id in ${sql(ids)}`;
  return new Map(rows.map((r) => [r.id, r.profileId]));
}

export async function insertRound(sql: Tx, profileId: string, r: Round): Promise<void> {
  await sql`
    insert into private.rounds
      (id, profile_id, world, stop, kind, started_at, finished_at, words_version, tz_offset_min)
    values (${r.id}, ${profileId}, ${r.world}, ${r.stop}, ${r.kind}, ${r.startedAt},
            ${r.finishedAt}, ${r.wordsVersion}, ${r.tzOffsetMin})
    on conflict (id) do nothing`;
  if (r.turns.length === 0) return;
  const turns = r.turns.map((t, idx) => ({
    round_id: r.id,
    idx,
    word_id: t.wordId,
    steps: sql.json(t.steps as unknown as Parameters<typeof sql.json>[0]),
    full_correct: t.full,
    hinted: t.hinted,
    challenge: t.challenge,
    ms: t.ms,
  }));
  await sql`insert into private.turns ${sql(turns)} on conflict do nothing`;
}

interface RoundRow {
  id: string;
  world: number;
  stop: Round['stop'];
  kind: Round['kind'];
  startedAt: Date;
  finishedAt: Date;
  wordsVersion: string;
  tzOffsetMin: number;
  turns: {
    wordId: string;
    steps: StepResult[];
    full: boolean;
    hinted: boolean;
    challenge: boolean;
    ms: number;
  }[];
}

/** Todas las rondas de un perfil con sus turnos, en el orden en que se aplican. */
export async function roundsOf(sql: Tx, profileId: string): Promise<Round[]> {
  const rows = await sql<RoundRow[]>`
    select r.id, r.world, r.stop, r.kind, r.started_at as "startedAt",
           r.finished_at as "finishedAt", r.words_version as "wordsVersion",
           r.tz_offset_min as "tzOffsetMin",
           coalesce(
             (select json_agg(json_build_object(
                'wordId', t.word_id, 'steps', t.steps, 'full', t.full_correct,
                'hinted', t.hinted, 'challenge', t.challenge, 'ms', t.ms) order by t.idx)
              from private.turns t where t.round_id = r.id),
             '[]'::json) as turns
    from private.rounds r
    where r.profile_id = ${profileId}
    order by r.finished_at, r.id`;
  return rows.map((r) => ({
    id: r.id,
    world: r.world,
    stop: r.stop,
    kind: r.kind,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt.toISOString(),
    wordsVersion: r.wordsVersion,
    tzOffsetMin: r.tzOffsetMin,
    turns: r.turns,
  }));
}

export async function teacherUnlocksOf(sql: Tx, profileId: string): Promise<number[]> {
  const rows = await sql<{ world: number }[]>`
    select u.world from private.teacher_unlocks u
    join private.profiles p on p.classroom_id = u.classroom_id
    where p.id = ${profileId}`;
  return rows.map((r) => r.world);
}

export async function saveState(sql: Tx, profileId: string, state: ProfileState): Promise<void> {
  await sql`
    insert into private.profile_state (profile_id, state, rounds_played, updated_at)
    values (${profileId}, ${sql.json(state as unknown as Parameters<typeof sql.json>[0])},
            ${state.roundsPlayed}, now())
    on conflict (profile_id) do update
      set state = excluded.state, rounds_played = excluded.rounds_played, updated_at = now()`;
}

export async function purchasesOf(sql: Tx, profileId: string): Promise<Purchase[]> {
  const rows = await sql<{ id: string; itemId: string; at: Date }[]>`
    select id, item_id as "itemId", at from private.purchases
    where profile_id = ${profileId} order by at, id`;
  return rows.map((p) => ({ id: p.id, itemId: p.itemId, at: p.at.toISOString() }));
}

export async function existingPurchases(
  sql: Tx,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await sql<{ id: string; profileId: string }[]>`
    select id, profile_id as "profileId" from private.purchases where id in ${sql(ids)}`;
  return new Map(rows.map((r) => [r.id, r.profileId]));
}

export async function insertPurchase(sql: Tx, profileId: string, p: Purchase): Promise<void> {
  await sql`
    insert into private.purchases (id, profile_id, item_id, at)
    values (${p.id}, ${profileId}, ${p.itemId}, ${p.at})
    on conflict do nothing`;
}

// —— Aulas (etapa 8) ——

export interface ClassroomRow {
  id: string;
  teacherId: string;
  name: string;
  code: string;
}

export async function insertClassroom(
  sql: Tx,
  c: { teacherId: string; name: string; code: string },
): Promise<ClassroomRow | null> {
  const [row] = await sql<ClassroomRow[]>`
    insert into private.classrooms (teacher_id, name, code)
    values (${c.teacherId}, ${c.name}, ${c.code})
    on conflict (code) do nothing
    returning id, teacher_id as "teacherId", name, code`;
  return row ?? null; // null: el código ya existía, se prueba otro
}

export async function getClassroom(sql: Tx, id: string): Promise<ClassroomRow | null> {
  const [row] = await sql<ClassroomRow[]>`
    select id, teacher_id as "teacherId", name, code from private.classrooms where id = ${id}`;
  return row ?? null;
}

export async function classroomByCode(sql: Tx, code: string): Promise<ClassroomRow | null> {
  const [row] = await sql<ClassroomRow[]>`
    select id, teacher_id as "teacherId", name, code from private.classrooms where code = ${code}`;
  return row ?? null;
}

export async function classroomsOf(
  sql: Tx,
  teacherId: string,
): Promise<(ClassroomRow & { students: number; unlocks: number[] })[]> {
  return sql`
    select c.id, c.teacher_id as "teacherId", c.name, c.code,
           (select count(*)::int from private.profiles p where p.classroom_id = c.id) as students,
           coalesce((select array_agg(u.world order by u.world) from private.teacher_unlocks u
                     where u.classroom_id = c.id), '{}') as unlocks
    from private.classrooms c
    where c.teacher_id = ${teacherId}
    order by c.created_at`;
}

export async function unlocksOf(sql: Tx, classroomId: string): Promise<number[]> {
  const rows = await sql<{ world: number }[]>`
    select world from private.teacher_unlocks where classroom_id = ${classroomId} order by world`;
  return rows.map((r) => r.world);
}

export async function addUnlock(sql: Tx, classroomId: string, world: number): Promise<void> {
  await sql`
    insert into private.teacher_unlocks (classroom_id, world) values (${classroomId}, ${world})
    on conflict do nothing`;
}

export async function profileInClassroom(
  sql: Tx,
  classroomId: string,
  alias: string,
): Promise<(ProfileRow & { pinHash: string | null }) | null> {
  const [row] = await sql<(ProfileRow & { pinHash: string | null })[]>`
    select id, owner_id as "ownerId", classroom_id as "classroomId", alias, avatar,
           created_at as "createdAt", pin_hash as "pinHash"
    from private.profiles
    where classroom_id = ${classroomId} and lower(alias) = lower(${alias})`;
  return row ?? null;
}

export async function insertClassroomProfile(
  sql: Tx,
  p: {
    id: string;
    classroomId: string;
    alias: string;
    avatar: string;
    pinHash: string;
    createdAt: string;
  },
): Promise<void> {
  await sql`
    insert into private.profiles (id, classroom_id, alias, avatar, pin_hash, created_at)
    values (${p.id}, ${p.classroomId}, ${p.alias}, ${p.avatar}, ${p.pinHash}, ${p.createdAt})`;
}

export async function profilesOfClassrooms(sql: Tx, teacherId: string): Promise<ProfileRow[]> {
  return sql<ProfileRow[]>`
    select p.id, p.owner_id as "ownerId", p.classroom_id as "classroomId", p.alias, p.avatar,
           p.created_at as "createdAt"
    from private.profiles p
    join private.classrooms c on c.id = p.classroom_id
    where c.teacher_id = ${teacherId}
    order by c.created_at, lower(p.alias)`;
}

/** Registra un intento de ingreso y devuelve cuántos hubo en la ventana (incluido este). */
export async function recordJoinAttempt(
  sql: Tx,
  ipHash: string,
  windowMin: number,
): Promise<number> {
  await sql`insert into private.join_attempts (ip_hash) values (${ipHash})`;
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from private.join_attempts
    where ip_hash = ${ipHash} and at > now() - make_interval(mins => ${windowMin})`;
  return row!.n;
}

export async function pruneJoinAttempts(sql: Tx): Promise<void> {
  await sql`delete from private.join_attempts where at < now() - interval '1 day'`;
}

export interface StudentRow {
  id: string;
  alias: string;
  avatar: string;
  roundsPlayed: number | null;
  lastWorld: number | null;
  rules: Record<string, { ema: number; attempts: number }> | null;
  worlds: Record<string, { stars: number }> | null;
  lastActivity: Date | null;
}

/** Datos del tablero: solo lo que muestra, no el estado entero de cada chico. */
export async function studentsOf(sql: Tx, classroomId: string): Promise<StudentRow[]> {
  return sql<StudentRow[]>`
    select p.id, p.alias, p.avatar, s.rounds_played as "roundsPlayed",
           (s.state->>'lastWorld')::int as "lastWorld",
           s.state->'rules' as rules, s.state->'worlds' as worlds,
           (select max(r.finished_at) from private.rounds r where r.profile_id = p.id)
             as "lastActivity"
    from private.profiles p
    left join private.profile_state s on s.profile_id = p.id
    where p.classroom_id = ${classroomId}
    order by lower(p.alias)`;
}

/** Abre un mundo en el estado guardado de cada chico del aula, sin recalcular rondas. */
export async function statesOfClassroom(
  sql: Tx,
  classroomId: string,
): Promise<{ profileId: string; state: ProfileState }[]> {
  return sql<{ profileId: string; state: ProfileState }[]>`
    select s.profile_id as "profileId", s.state
    from private.profile_state s
    join private.profiles p on p.id = s.profile_id
    where p.classroom_id = ${classroomId}`;
}

export async function storedState(sql: Tx, profileId: string): Promise<ProfileState | null> {
  const [row] = await sql<{ state: ProfileState }[]>`
    select state from private.profile_state where profile_id = ${profileId}`;
  return row?.state ?? null;
}

/** Clave de orden de la última ronda guardada (`finishedAt`, id), para aplicar solo lo nuevo. */
export async function lastRoundKey(
  sql: Tx,
  profileId: string,
): Promise<{ finishedAt: string; id: string } | null> {
  const [row] = await sql<{ finishedAt: Date; id: string }[]>`
    select finished_at as "finishedAt", id from private.rounds
    where profile_id = ${profileId}
    order by finished_at desc, id desc limit 1`;
  return row ? { finishedAt: row.finishedAt.toISOString(), id: row.id } : null;
}
