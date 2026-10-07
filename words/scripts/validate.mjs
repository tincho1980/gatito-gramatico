// Gate de CI: valida bank/ contra los esquemas de shared/, re-deriva sílabas, tónica, tipo,
// tilde y regla de cada palabra publicada, chequea la versión del índice y que la copia de
// la app sea idéntica. Falla si algo no coincide. Uso: npm run validate -w words
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IndexSchema, WorldFileSchema } from '@gatita/shared';
import { checkEntry, bankVersion, WORLDS } from '../lib/bank.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'bank');
const APP_DIR = join(ROOT, '..', 'app', 'public', 'words');
const lexPath = join(ROOT, 'data', 'lexicon.json');
const lexicon = existsSync(lexPath) ? JSON.parse(readFileSync(lexPath, 'utf8')) : null;

const schemaProblems = (file, result) =>
  result.success ? [] : result.error.issues.map((i) => `${file} ${i.path.join('.')}: ${i.message}`);

export function validateBank({ dir = DIR, appDir = APP_DIR } = {}) {
  const problems = [];
  const ids = new Map();
  let total = 0;
  const files = readdirSync(dir).filter((f) => /^world-\d+\.json$/.test(f)).sort();
  if (files.length !== Object.keys(WORLDS).length) problems.push(`hay ${files.length} archivos de mundo, se esperan ${Object.keys(WORLDS).length}`);
  const jsons = [];
  for (const f of files) {
    const json = readFileSync(join(dir, f), 'utf8');
    jsons.push(json);
    const data = JSON.parse(json);
    problems.push(...schemaProblems(f, WorldFileSchema.safeParse(data)));
    for (const e of data.words ?? []) {
      total++;
      if (e.world !== data.world) problems.push(`${f} ${e.id}: world ${e.world} en archivo del mundo ${data.world}`);
      if (ids.has(e.id)) problems.push(`${f} ${e.id}: id repetido (también en ${ids.get(e.id)})`);
      ids.set(e.id, f);
      for (const err of checkEntry(e, lexicon)) problems.push(`${f} ${e.id}: ${err}`);
    }
  }

  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
  problems.push(...schemaProblems('index.json', IndexSchema.safeParse(index)));
  if (index.version !== bankVersion(jsons)) problems.push('index.json: la versión no coincide con el contenido (correr npm run build -w words)');

  if (appDir) {
    for (const f of [...files, 'index.json']) {
      const copy = join(appDir, f);
      if (!existsSync(copy) || readFileSync(copy, 'utf8') !== readFileSync(join(dir, f), 'utf8')) {
        problems.push(`app/public/words/${f} distinto de bank/ (correr npm run build -w words)`);
      }
    }
  }
  return { total, problems };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validate.mjs')) {
  const { total, problems } = validateBank();
  if (problems.length) {
    console.error(`✗ ${problems.length} problemas en ${total} palabras:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log(`✓ ${total} palabras validadas${lexicon ? ' (con diccionario y ambigüedad)' : ' (sin lexicon.json)'}`);
}
