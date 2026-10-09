// Exporta las palabras marcadas por los docentes para revisar (plan, etapa 9), con la
// conexión de administrador de `.env.local`:
//   npm run reviews:export
// Escribe `revisiones.local.csv` en la raíz (no se versiona): una fila por palabra marcada,
// con cuántos docentes la marcaron y sus notas. Las correcciones se hacen en words/src/*.txt.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { RULE_NAMES, type Rule } from '@gatita/shared';
import { BANK } from '../src/words.ts';
import { ADMIN_URL_VAR, parseAdminUrl } from './setup-db-lib.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ENV_FILE = join(ROOT, '.env.local');
const OUT = join(ROOT, 'revisiones.local.csv');

if (!existsSync(ENV_FILE)) throw new Error('Falta .env.local en la raíz del repo.');
process.loadEnvFile(ENV_FILE);
const raw = process.env[ADMIN_URL_VAR];
if (!raw) throw new Error(`Falta ${ADMIN_URL_VAR} en .env.local.`);
const sql = postgres(parseAdminUrl(raw).url.href, { max: 1, onnotice: () => {} });

const rows = await sql<{ wordId: string; marks: number; notes: string[]; versions: string[] }[]>`
  select word_id as "wordId", count(*)::int as marks,
         array_remove(array_agg(nullif(note, '') order by created_at), null) as notes,
         array_agg(distinct words_version) as versions
  from private.word_reviews group by word_id order by count(*) desc, word_id`;
await sql.end();

const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
const lines = [
  ['palabra', 'mundo', 'tier', 'tipo', 'tilde', 'regla', 'marcas', 'notas', 'id', 'versiones'],
  ...rows.map((r) => {
    const w = BANK.index.byId.get(r.wordId);
    return [
      w?.word ?? '(ya no está en el banco)',
      w?.world ?? '',
      w?.tier ?? '',
      w?.type ?? '',
      w ? (w.hasTilde ? 'sí' : 'no') : '',
      w ? RULE_NAMES[w.rule as Rule] : '',
      r.marks,
      r.notes.join(' | '),
      r.wordId,
      r.versions.join(' '),
    ];
  }),
].map((l) => l.map(cell).join(','));
// BOM para que Excel abra bien los acentos.
writeFileSync(OUT, '﻿' + lines.join('\n') + '\n');
console.log(`✓ ${rows.length} palabras marcadas → ${OUT}`);
