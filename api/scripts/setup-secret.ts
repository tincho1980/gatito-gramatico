// Crea el secreto del Worker de producción (`APP_SECRET`), con valor aleatorio, sin mostrarlo
// ni guardarlo en ningún archivo (docs/puesta-en-marcha.md):
//   npm run setup:secret -w api
//
// Firma los tokens de los chicos de aula y protege el PIN y la IP. **No se cambia**: los PIN
// guardados dependen de él, y con otro secreto ningún chico podría volver a entrar. Por eso el
// script no hace nada si ya existe.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'APP_SECRET';
const wranglerBin = join(
  dirname(createRequire(import.meta.url).resolve('wrangler/package.json')),
  'bin',
  'wrangler.js',
);
const wrangler = (args: string[], input?: string) =>
  spawnSync(process.execPath, [wranglerBin, ...args, '--env', 'production'], {
    cwd: API_DIR,
    encoding: 'utf8',
    input,
  });

const list = wrangler(['secret', 'list', '--format', 'json']);
if (list.status !== 0) {
  console.error(`✗ wrangler falló (¿hiciste "npx wrangler login" desde api/?):\n${list.stderr}`);
  process.exit(1);
}
const existing = (JSON.parse(list.stdout || '[]') as { name: string }[]).some(
  (s) => s.name === NAME,
);
if (existing) {
  console.log(
    `✓ ${NAME} ya existe: no se toca (cambiarlo dejaría afuera a todos los chicos de aula).`,
  );
  process.exit(0);
}

// Por stdin: el valor no aparece en la línea de comandos ni en la salida.
const put = wrangler(['secret', 'put', NAME], randomBytes(32).toString('base64url'));
if (put.status !== 0) {
  console.error(`✗ No se pudo crear ${NAME}:\n${put.stderr}`);
  process.exit(1);
}
console.log(
  `✓ ${NAME} creado en el Worker de producción. No se muestra ni se guarda en ningún lado.`,
);
