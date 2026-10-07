// Falla si el build contiene algo con forma de clave (arquitectura §9.10).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS = [
  ['clave de Google (AIza)', /AIza[0-9A-Za-z_-]{20,}/],
  ['clave secreta (sk-)', /\bsk-[0-9A-Za-z_-]{20,}/],
  ['JWT (eyJ)', /eyJ[0-9A-Za-z_-]{30,}\.[0-9A-Za-z_-]{30,}/],
];

const root = process.argv[2] ?? 'app/dist';

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

let found = 0;
for (const file of files(root)) {
  const text = readFileSync(file, 'latin1');
  for (const [label, re] of PATTERNS) {
    if (re.test(text)) {
      console.error(`${file}: ${label}`);
      found++;
    }
  }
}

if (found) {
  console.error(`Se encontraron ${found} posibles claves en ${root}.`);
  process.exit(1);
}
console.log(`Sin claves en ${root}.`);
