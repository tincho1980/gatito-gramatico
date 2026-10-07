// node --test: el banco publicado tiene que pasar el validador completo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBank } from './validate.ts';

test('banco de palabras sin errores', () => {
  const { total, problems } = validateBank();
  assert.ok(total > 0, 'banco vacío');
  assert.deepEqual(problems, []);
});
