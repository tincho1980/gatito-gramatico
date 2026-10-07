// Arma bank/world-XX.json a partir de src/*.txt + data/lexicon.json, y lo copia a app/public/words.
// Uso: npm run build -w words   (falla si alguna palabra no pasa la validación)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { IndexSchema, WorldFileSchema, type WordEntry } from '@gatita/shared';
import { parseSource, buildEntry, checkEntry, bankVersion, WORLDS } from '../lib/bank.ts';
import { APP_WORDS_DIR, BANK_DIR, SRC_DIR, readLexicon } from '../lib/paths.ts';

const lexicon = readLexicon();
if (!lexicon) console.warn('⚠ sin data/lexicon.json: no se chequea ortografía ni frecuencia');

const files = readdirSync(SRC_DIR)
  .filter((f) => /^world-\d+\.txt$/.test(f))
  .sort();
const all: WordEntry[] = [];
const problems: string[] = [];
for (const f of files) {
  for (const item of parseSource(readFileSync(join(SRC_DIR, f), 'utf8'), f)) {
    const { entry, errors } = buildEntry(item, lexicon ?? {});
    const more = checkEntry(entry, lexicon);
    const errs = [...new Set([...errors, ...more])];
    if (errs.length) problems.push(`${item.source}  ${item.word}: ${errs.join(' · ')}`);
    all.push(entry);
  }
}
const seen = new Map<string, number>();
for (const e of all) {
  if (seen.has(e.id))
    problems.push(`id repetido "${e.id}" (mundos ${seen.get(e.id)} y ${e.world})`);
  seen.set(e.id, e.world);
}
if (problems.length) {
  console.error(`✗ ${problems.length} problemas:\n` + problems.join('\n'));
  process.exit(1);
}

mkdirSync(BANK_DIR, { recursive: true });
const index = [];
const jsons: string[] = [];
for (const [w, meta] of Object.entries(WORLDS)) {
  const words = all
    .filter((e) => e.world === Number(w))
    .sort((a, b) => a.tier - b.tier || (b.freq ?? 0) - (a.freq ?? 0));
  const file = `world-${String(w).padStart(2, '0')}.json`;
  const json =
    JSON.stringify(WorldFileSchema.parse({ world: Number(w), ...meta, words }), null, 1) + '\n';
  writeFileSync(join(BANK_DIR, file), json);
  jsons.push(json);
  const byTier = [1, 2, 3].map((t) => words.filter((e) => e.tier === t).length);
  index.push({ world: Number(w), ...meta, file, count: words.length, byTier });
}
const indexData = IndexSchema.parse({ version: bankVersion(jsons), worlds: index });
writeFileSync(join(BANK_DIR, 'index.json'), JSON.stringify(indexData, null, 1) + '\n');

rmSync(APP_WORDS_DIR, { recursive: true, force: true });
cpSync(BANK_DIR, APP_WORDS_DIR, { recursive: true });
console.log(
  `✓ ${all.length} palabras en ${index.length} mundos (versión ${indexData.version}), copiadas a app/public/words`,
);
for (const i of index)
  console.log(
    `  ${String(i.world).padStart(2)} ${i.name.padEnd(28)} ${String(i.count).padStart(3)}  (tiers ${i.byTier.join('/')})`,
  );
