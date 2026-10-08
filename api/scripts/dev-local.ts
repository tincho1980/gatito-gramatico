// API local sin Docker ni Supabase (docs/puesta-en-marcha.md §1):
//   npm run dev:local
//
// Levanta las mismas rutas del Worker sobre Postgres embebido (PGlite), guardado en
// `.local-db/` con las migraciones reales, en http://127.0.0.1:8787. Vite ya hace proxy de
// /api a ese puerto. Para empezar de cero, borrá `.local-db/`.
//
// El login es de mentira: cualquier token `local-<uuid>` vale como el adulto con ese id.
// Esto solo existe en este script; el Worker publicado verifica los JWT de Supabase.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import postgres from 'postgres';
import { createApp } from '../src/app.ts';
import type { Env } from '../src/env.ts';
import { BANK } from '../src/words.ts';
import { applyMigrations } from './migrations.ts';

// Para los e2e: `GATITA_LOCAL_DB=memory` (base nueva en memoria) y otro puerto.
const MEMORY = process.env.GATITA_LOCAL_DB === 'memory';
const DATA_DIR = fileURLToPath(new URL('../../.local-db/', import.meta.url));
const PORT = Number(process.env.GATITA_LOCAL_PORT ?? 8787);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

if (!MEMORY) mkdirSync(DATA_DIR, { recursive: true });
// Secreto local para los tokens de los chicos de aula: se guarda junto a la base para que
// los tokens sigan valiendo al reiniciar. No es el de producción.
const SECRET_FILE = `${DATA_DIR}app-secret.txt`;
if (!MEMORY && !existsSync(SECRET_FILE)) {
  writeFileSync(SECRET_FILE, randomBytes(32).toString('base64url'));
}
const appSecret = MEMORY
  ? randomBytes(32).toString('base64url')
  : readFileSync(SECRET_FILE, 'utf8').trim();
const db = MEMORY ? await PGlite.create() : await PGlite.create({ dataDir: DATA_DIR });
// Los roles que Supabase ya trae y la migración usa.
await db.exec(`
  do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
  end $$;`);
const socket = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' });
await socket.start();
const { port } = (
  socket as unknown as { server: { address(): { port: number } } }
).server.address();
const sql = postgres({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres', max: 1 });

const applied = await applyMigrations(sql);
if (applied.length) console.log(`✓ Migraciones aplicadas: ${applied.join(', ')}`);

const app = createApp({
  bank: BANK,
  appSecret: () => appSecret,
  openDb: () => ({ sql, close: async () => {} }),
  verifier: () => async (token) => {
    const id = token.match(/^local-(.+)$/)?.[1];
    return id && UUID.test(id) ? { accountId: id } : null;
  },
});

const env = { SUPABASE_URL: 'local' } as Env;
serve({ fetch: (req) => app.fetch(req, env), port: PORT, hostname: '127.0.0.1' }, () => {
  console.log(
    `✓ API local en http://127.0.0.1:${PORT}/api (base ${MEMORY ? 'en memoria' : 'en .local-db/'})`,
  );
  console.log(
    '  Probar: curl -X POST http://127.0.0.1:8787/api/accounts/me ' +
      '-H "Authorization: Bearer local-11111111-1111-4111-8111-111111111111" ' +
      `-H "Content-Type: application/json" -d '{"role":"family"}'`,
  );
});

const stop = async () => {
  await sql.end();
  await socket.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
