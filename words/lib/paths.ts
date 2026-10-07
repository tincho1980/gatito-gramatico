// Rutas del banco y lectura del lexicón, compartidas por el build y el validador.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lexicon } from './bank.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIR = join(ROOT, 'src');
export const BANK_DIR = join(ROOT, 'bank');
// Copia que sirve la app (generada: no se edita a mano).
export const APP_WORDS_DIR = join(ROOT, '..', 'app', 'public', 'words');
const LEXICON_PATH = join(ROOT, 'data', 'lexicon.json');

export const readLexicon = (): Lexicon | null =>
  existsSync(LEXICON_PATH) ? (JSON.parse(readFileSync(LEXICON_PATH, 'utf8')) as Lexicon) : null;
