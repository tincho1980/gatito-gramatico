// Conecta el Worker con la base de un entorno (docs/puesta-en-marcha.md):
//   npm run setup:db -w api -- --env preview
//
// 1. Lee la conexión de administrador de `.env.local` (no se versiona).
// 2. Genera una contraseña aleatoria para `gatita_worker` y se la pone en Supabase.
// 3. Prueba que el rol entra y lee `private`.
// 4. Crea o actualiza Hyperdrive con esa contraseña y anota su id en `wrangler.jsonc`.
//
// La contraseña no se imprime ni se guarda: solo la conocen la base y Hyperdrive. Para
// cambiarla, se vuelve a correr el script.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import postgres from 'postgres';
import {
  adminUrlVar,
  currentHyperdriveId,
  isDeployEnv,
  parseAdminUrl,
  parseHyperdriveId,
  updateWranglerConfig,
  workerConnectionString,
} from './setup-db-lib.ts';

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(API_DIR, '..');
const ENV_FILE = join(ROOT, '.env.local');
const WRANGLER_CONFIG = join(API_DIR, 'wrangler.jsonc');

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values } = parseArgs({ options: { env: { type: 'string' } } });
const env = values.env;
if (!isDeployEnv(env)) fail('Indicá el entorno: --env preview o --env production');

if (!existsSync(ENV_FILE)) fail('Falta .env.local en la raíz del repo (copiá .env.example).');
process.loadEnvFile(ENV_FILE);
const rawAdmin = process.env[adminUrlVar(env)];
if (!rawAdmin) fail(`Falta ${adminUrlVar(env)} en .env.local.`);

let admin;
try {
  admin = parseAdminUrl(rawAdmin);
} catch (e) {
  fail((e as Error).message);
}
const supabaseUrl = `https://${admin.ref}.supabase.co`;
console.log(`→ Proyecto de Supabase ${admin.ref} (${env})`);

// base64url: sin comillas ni caracteres que haya que escapar en SQL o en la URL.
const password = randomBytes(32).toString('base64url');

const sql = postgres(admin.url.href, { max: 1, onnotice: () => {} });
try {
  const [role] = await sql`select 1 from pg_roles where rolname = 'gatita_worker'`;
  if (!role)
    fail('No existe el rol gatita_worker: aplicá primero las migraciones (supabase db push).');
  // ALTER ROLE no acepta parámetros: el valor es base64url, seguro como literal.
  await sql.unsafe(`alter role gatita_worker with login password '${password}'`);
} finally {
  await sql.end();
}
console.log('✓ Contraseña nueva para gatita_worker');

const workerUrl = workerConnectionString(admin, password);
// El pooler tarda unos segundos en ver la contraseña nueva.
let lastError: unknown;
for (let attempt = 0; attempt < 6; attempt++) {
  const worker = postgres(workerUrl, { max: 1, onnotice: () => {} });
  try {
    await worker`select count(*) from private.profiles`;
    lastError = null;
    break;
  } catch (e) {
    lastError = e;
    await new Promise((r) => setTimeout(r, 5000));
  } finally {
    await worker.end();
  }
}
if (lastError) fail(`gatita_worker no pudo conectarse: ${(lastError as Error).message}`);
console.log('✓ gatita_worker entra por el pooler y lee private');

// wrangler sin shell: los argumentos no pasan por el historial de la terminal.
const wranglerBin = join(
  dirname(createRequire(import.meta.url).resolve('wrangler/package.json')),
  'bin',
  'wrangler.js',
);
const wrangler = (args: string[]) => {
  const r = spawnSync(process.execPath, [wranglerBin, ...args], { cwd: API_DIR, encoding: 'utf8' });
  if (r.status !== 0) {
    // La salida puede repetir la cadena de conexión: se tapa la contraseña.
    fail(`wrangler falló:\n${(r.stderr || r.stdout).replaceAll(password, '***')}`);
  }
  return r.stdout;
};

const config = readFileSync(WRANGLER_CONFIG, 'utf8');
let hyperdriveId = currentHyperdriveId(config, env);
if (hyperdriveId) {
  wrangler(['hyperdrive', 'update', hyperdriveId, '--connection-string', workerUrl]);
  console.log(`✓ Hyperdrive ${hyperdriveId} actualizado`);
} else {
  const out = wrangler(['hyperdrive', 'create', `gatita-${env}`, '--connection-string', workerUrl]);
  hyperdriveId = parseHyperdriveId(out);
  if (!hyperdriveId) fail('No pude leer el id de Hyperdrive en la salida de wrangler.');
  console.log(`✓ Hyperdrive gatita-${env} creado: ${hyperdriveId}`);
}

writeFileSync(WRANGLER_CONFIG, updateWranglerConfig(config, env, { hyperdriveId, supabaseUrl }));
console.log(`✓ wrangler.jsonc: env.${env} apunta a ${supabaseUrl}`);
console.log(`\nListo. Publicá con: npm run build && npm run deploy -w api -- --env ${env}`);
