// Gate de CI: re-deriva sílabas, tónica, tipo, tilde y regla de cada palabra publicada
// en bank/ y falla si algo no coincide. Uso: npm run validate -w words
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEntry, WORLDS } from '../lib/bank.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'bank');
const lexPath = join(ROOT, 'data', 'lexicon.json');
const lexicon = existsSync(lexPath) ? JSON.parse(readFileSync(lexPath, 'utf8')) : null;

export function validateBank() {
  const problems = [];
  const ids = new Map();
  let total = 0;
  const files = readdirSync(DIR).filter((f) => /^world-\d+\.json$/.test(f));
  if (files.length !== Object.keys(WORLDS).length) problems.push(`hay ${files.length} archivos de mundo, se esperan ${Object.keys(WORLDS).length}`);
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
    for (const e of data.words) {
      total++;
      if (e.world !== data.world) problems.push(`${f} ${e.id}: world ${e.world} en archivo del mundo ${data.world}`);
      if (ids.has(e.id)) problems.push(`${f} ${e.id}: id repetido (también en ${ids.get(e.id)})`);
      ids.set(e.id, f);
      for (const err of checkEntry(e, lexicon)) problems.push(`${f} ${e.id}: ${err}`);
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
