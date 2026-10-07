// Tests del motor: npm test -w words
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, syllabify, distractor, tildeVariants } from './acentuacion.ts';

const cases: [word: string, syllables: string, stress: number, type: string, rule: string][] = [
  // palabra, sílabas, tónica, tipo, regla
  ['casa', 'ca-sa', 0, 'grave', 'grave_n_s_vocal'],
  ['camisa', 'ca-mi-sa', 1, 'grave', 'grave_n_s_vocal'],
  ['reloj', 're-loj', 1, 'aguda', 'aguda_otra'],
  ['café', 'ca-fé', 1, 'aguda', 'aguda_n_s_vocal'],
  ['camión', 'ca-mión', 1, 'aguda', 'aguda_n_s_vocal'],
  ['árbol', 'ár-bol', 0, 'grave', 'grave_otra'],
  ['música', 'mú-si-ca', 0, 'esdrujula', 'esdrujula'],
  ['dígaselo', 'dí-ga-se-lo', 0, 'sobreesdrujula', 'sobreesdrujula'],
  // los 8 errores del banco viejo
  ['mamá', 'ma-má', 1, 'aguda', 'aguda_n_s_vocal'],
  ['lápiz', 'lá-piz', 0, 'grave', 'grave_otra'],
  ['examen', 'e-xa-men', 1, 'grave', 'grave_n_s_vocal'],
  ['gramática', 'gra-má-ti-ca', 1, 'esdrujula', 'esdrujula'],
  ['agrícola', 'a-grí-co-la', 1, 'esdrujula', 'esdrujula'],
  ['idiosincrasia', 'i-dio-sin-cra-sia', 3, 'grave', 'grave_n_s_vocal'],
  ['esternocleidomastoideo', 'es-ter-no-clei-do-mas-toi-de-o', 7, 'grave', 'grave_n_s_vocal'],
  ['electroencefalografista', 'e-lec-tro-en-ce-fa-lo-gra-fis-ta', 8, 'grave', 'grave_n_s_vocal'],
  // diptongos, triptongos, hiatos
  ['ciudad', 'ciu-dad', 1, 'aguda', 'aguda_otra'],
  ['cuídate', 'cuí-da-te', 0, 'esdrujula', 'esdrujula'],
  ['huésped', 'hués-ped', 0, 'grave', 'grave_otra'],
  ['buey', 'buey', 0, 'monosilaba', 'monosilabo'],
  ['uruguay', 'u-ru-guay', 2, 'aguda', 'aguda_otra'],
  ['río', 'rí-o', 0, 'grave', 'hiato'],
  ['baúl', 'ba-úl', 1, 'aguda', 'hiato'],
  ['país', 'pa-ís', 1, 'aguda', 'hiato'],
  ['búho', 'bú-ho', 0, 'grave', 'hiato'],
  ['prohíbe', 'pro-hí-be', 1, 'grave', 'hiato'],
  ['poeta', 'po-e-ta', 1, 'grave', 'grave_n_s_vocal'],
  ['héroe', 'hé-ro-e', 0, 'esdrujula', 'esdrujula'],
  ['leer', 'le-er', 1, 'aguda', 'aguda_otra'],
  // consonantes
  ['instante', 'ins-tan-te', 1, 'grave', 'grave_n_s_vocal'],
  ['instrumento', 'ins-tru-men-to', 2, 'grave', 'grave_n_s_vocal'],
  ['atleta', 'at-le-ta', 1, 'grave', 'grave_n_s_vocal'],
  ['guitarra', 'gui-ta-rra', 1, 'grave', 'grave_n_s_vocal'],
  ['pingüino', 'pin-güi-no', 1, 'grave', 'grave_n_s_vocal'],
  ['chocolate', 'cho-co-la-te', 2, 'grave', 'grave_n_s_vocal'],
  ['quesillo', 'que-si-llo', 1, 'grave', 'grave_n_s_vocal'],
  ['ayer', 'a-yer', 1, 'aguda', 'aguda_otra'],
  ['virrey', 'vi-rrey', 1, 'aguda', 'aguda_otra'],
  ['bíceps', 'bí-ceps', 0, 'grave', 'grave_otra'],
  ['robots', 'ro-bots', 1, 'aguda', 'aguda_otra'],
  // monosílabos
  ['fue', 'fue', 0, 'monosilaba', 'monosilabo'],
  ['tú', 'tú', 0, 'monosilaba', 'diacritica'],
  // voseo
  ['tenés', 'te-nés', 1, 'aguda', 'aguda_n_s_vocal'],
  ['decímelo', 'de-cí-me-lo', 1, 'esdrujula', 'esdrujula'],
  ['miralo', 'mi-ra-lo', 1, 'grave', 'grave_n_s_vocal'],
];

for (const [w, syl, idx, type, rule] of cases) {
  test(w, () => {
    const a = analyze(w);
    assert.equal(a.syllables.join('-'), syl);
    assert.equal(a.stressIndex, idx);
    assert.equal(a.type, type);
    assert.equal(a.rule, rule);
    assert.deepEqual(a.errors, []);
  });
}

test('-mente conserva la tilde del adjetivo', () => {
  const a = analyze('fácilmente', { mente: true });
  assert.equal(a.rule, 'mente');
  assert.equal(a.stressIndex, 0);
  assert.deepEqual(a.errors, []);
  assert.deepEqual(analyze('felizmente', { mente: true }).errors, []);
});

test('detecta tildes que sobran', () => {
  for (const w of ['exámen', 'relój', 'fué', 'dió', 'jóven'])
    assert.ok(analyze(w).errors.length, w);
});

test('distractores', () => {
  assert.equal(distractor('examen'), 'exámen');
  assert.equal(distractor('reloj'), 'relój');
  assert.equal(distractor('camión'), 'camion');
  assert.equal(distractor('fue'), 'fué');
  assert.equal(distractor('cuidado'), 'cuidádo');
  assert.equal(distractor('ciudad'), 'ciudád');
  assert.equal(distractor('huevo'), 'huévo');
  assert.equal(distractor('ruido'), 'ruído');
});

test('variantes para ambigüedad', () => {
  assert.ok(tildeVariants('papá').includes('papa'));
  assert.ok(tildeVariants('esta').includes('está'));
});

test('silabeo básico', () => {
  assert.equal(syllabify('abrazo').join('-'), 'a-bra-zo');
  assert.equal(syllabify('carro').join('-'), 'ca-rro');
  assert.equal(syllabify('calle').join('-'), 'ca-lle');
});
