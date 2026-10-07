// Valida el banco publicado: esquemas de shared/, re-derivación de sílabas, tónica, tipo,
// tilde y regla de cada palabra, versión del índice y copia idéntica en la app.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { IndexSchema, WorldFileSchema, type WordEntry } from '@gatita/shared';
import { checkEntry, bankVersion, WORLDS, type Lexicon } from './bank.ts';
import { APP_WORDS_DIR, BANK_DIR, readLexicon } from './paths.ts';

interface SchemaResult {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}

const schemaProblems = (file: string, result: SchemaResult): string[] =>
  result.error?.issues.map((i) => `${file} ${i.path.map(String).join('.')}: ${i.message}`) ?? [];

export interface ValidateOptions {
  dir?: string;
  /** Copia de la app a comparar; `null` para no chequearla. */
  appDir?: string | null;
  lexicon?: Lexicon | null;
}

export function validateBank({
  dir = BANK_DIR,
  appDir = APP_WORDS_DIR,
  lexicon = readLexicon(),
}: ValidateOptions = {}): { total: number; problems: string[] } {
  const problems: string[] = [];
  const ids = new Map<string, string>();
  let total = 0;
  const files = readdirSync(dir)
    .filter((f) => /^world-\d+\.json$/.test(f))
    .sort();
  const expected = Object.keys(WORLDS).length;
  if (files.length !== expected)
    problems.push(`hay ${files.length} archivos de mundo, se esperan ${expected}`);
  const jsons: string[] = [];
  for (const f of files) {
    const json = readFileSync(join(dir, f), 'utf8');
    jsons.push(json);
    const data = JSON.parse(json) as { world: number; words?: WordEntry[] };
    problems.push(...schemaProblems(f, WorldFileSchema.safeParse(data)));
    for (const e of data.words ?? []) {
      total++;
      if (e.world !== data.world)
        problems.push(`${f} ${e.id}: world ${e.world} en archivo del mundo ${data.world}`);
      const other = ids.get(e.id);
      if (other) problems.push(`${f} ${e.id}: id repetido (también en ${other})`);
      ids.set(e.id, f);
      for (const err of checkEntry(e, lexicon)) problems.push(`${f} ${e.id}: ${err}`);
    }
  }

  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { version?: unknown };
  problems.push(...schemaProblems('index.json', IndexSchema.safeParse(index)));
  if (index.version !== bankVersion(jsons))
    problems.push(
      'index.json: la versión no coincide con el contenido (correr npm run build -w words)',
    );

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
