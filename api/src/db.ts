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
