// Aplica las migraciones pendientes en el proyecto de Supabase (producción), con la conexión
// de administrador de `.env.local`. Se corre desde tu máquina antes de mergear a main un
// cambio de esquema (docs/puesta-en-marcha.md):
//   npm run db:push
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { applyMigrations, readMigrations } from './migrations.ts';
import { ADMIN_URL_VAR, parseAdminUrl } from './setup-db-lib.ts';

const ENV_FILE = join(fileURLToPath(new URL('../../', import.meta.url)), '.env.local');

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!existsSync(ENV_FILE)) fail('Falta .env.local en la raíz del repo (copiá .env.example).');
process.loadEnvFile(ENV_FILE);
const raw = process.env[ADMIN_URL_VAR];
if (!raw) fail(`Falta ${ADMIN_URL_VAR} en .env.local.`);
let admin;
try {
  admin = parseAdminUrl(raw);
} catch (e) {
  fail((e as Error).message);
}

console.log(
  `→ Proyecto de Supabase ${admin.ref}: ${readMigrations().length} migraciones en el repo`,
);
const sql = postgres(admin.url.href, { max: 1, onnotice: () => {} });
try {
  const applied = await applyMigrations(sql);
  console.log(
    applied.length
      ? `✓ Aplicadas: ${applied.join(', ')}`
      : '✓ La base ya estaba al día: no había migraciones pendientes',
  );
} catch (e) {
  fail(`La migración falló y no se aplicó nada de ella: ${(e as Error).message}`);
} finally {
  await sql.end();
}
