// Gate de CI: valida el banco publicado (ver lib/validate.ts). Uso: npm run validate -w words
import { validateBank } from '../lib/validate.ts';
import { readLexicon } from '../lib/paths.ts';

const lexicon = readLexicon();
const { total, problems } = validateBank({ lexicon });
if (problems.length) {
  console.error(`✗ ${problems.length} problemas en ${total} palabras:\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(
  `✓ ${total} palabras validadas${lexicon ? ' (con diccionario y ambigüedad)' : ' (sin lexicon.json)'}`,
);
