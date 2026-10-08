// Aplica las migraciones de supabase/migrations que falten, en orden y cada una en su
// transacción. Las registra en la misma tabla que usa la CLI de Supabase.
import { readdirSync, readFileSync } from 'node:fs';
import type { Sql } from 'postgres';

export const MIGRATIONS_DIR = new URL('../../supabase/migrations/', import.meta.url);

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

export function readMigrations(dir: URL = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .map((file) => ({ file, m: file.match(/^(\d+)_(.+)\.sql$/) }))
    .filter((x): x is { file: string; m: RegExpMatchArray } => x.m !== null)
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(({ file, m }) => ({
      version: m[1]!,
      name: m[2]!,
      sql: readFileSync(new URL(file, dir), 'utf8'),
    }));
}

/** Aplica las pendientes y devuelve sus versiones. Correrlo dos veces no hace nada. */
export async function applyMigrations(
  sql: Sql,
  migrations: Migration[] = readMigrations(),
): Promise<string[]> {
  await sql.unsafe(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );`);
  const done = new Set(
    (
      await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`
    ).map((r) => r.version),
  );
  const applied: string[] = [];
  for (const m of migrations) {
    if (done.has(m.version)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(m.sql);
      await tx`
        insert into supabase_migrations.schema_migrations (version, name, statements)
        values (${m.version}, ${m.name}, ${[m.sql]})`;
    });
    applied.push(m.version);
  }
  return applied;
}
