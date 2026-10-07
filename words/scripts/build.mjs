// Arma bank/world-XX.json a partir de src/*.txt + data/lexicon.json.
// Uso: npm run build -w words   (falla si alguna palabra no pasa la validación)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource, buildEntry, checkEntry, WORLDS } from '../lib/bank.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'bank');
const lexPath = join(ROOT, 'data', 'lexicon.json');
const lexicon = existsSync(lexPath) ? JSON.parse(readFileSync(lexPath, 'utf8')) : null;
if (!lexicon) console.warn('⚠ sin data/lexicon.json: no se chequea ortografía ni frecuencia');

const files = readdirSync(SRC).filter((f) => /^world-\d+\.txt$/.test(f)).sort();
const all = [];
const problems = [];
for (const f of files) {
  for (const item of parseSource(readFileSync(join(SRC, f), 'utf8'), f)) {
    const { entry, errors } = buildEntry(item, lexicon ?? {});
    const more = checkEntry(entry, lexicon);
    const errs = [...new Set([...errors, ...more])];
    if (errs.length) problems.push(`${item.source}  ${item.word}: ${errs.join(' · ')}`);
    all.push(entry);
  }
}
const seen = new Map();
for (const e of all) {
  if (seen.has(e.id)) problems.push(`id repetido "${e.id}" (mundos ${seen.get(e.id)} y ${e.world})`);
  seen.set(e.id, e.world);
}
if (problems.length) {
  console.error(`✗ ${problems.length} problemas:\n` + problems.join('\n'));
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const index = [];
for (const [w, meta] of Object.entries(WORLDS)) {
  const words = all.filter((e) => e.world === Number(w))
    .sort((a, b) => a.tier - b.tier || (b.freq ?? 0) - (a.freq ?? 0));
  const file = `world-${String(w).padStart(2, '0')}.json`;
  writeFileSync(join(OUT, file), JSON.stringify({ world: Number(w), ...meta, words }, null, 1) + '\n');
  const byTier = [1, 2, 3].map((t) => words.filter((e) => e.tier === t).length);
  index.push({ world: Number(w), ...meta, file, count: words.length, byTier });
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ version: 1, worlds: index }, null, 1) + '\n');
console.log(`✓ ${all.length} palabras en ${index.length} mundos`);
for (const i of index) console.log(`  ${String(i.world).padStart(2)} ${i.name.padEnd(28)} ${String(i.count).padStart(3)}  (tiers ${i.byTier.join('/')})`);
