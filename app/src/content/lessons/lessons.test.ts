import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLDS, type WorldFile } from '@gatita/shared';
import { LESSONS } from './index.ts';

const world = (id: number): WorldFile =>
  JSON.parse(
    readFileSync(
      new URL(`../../../public/words/world-${String(id).padStart(2, '0')}.json`, import.meta.url),
      'utf8',
    ),
  ) as WorldFile;

describe('lecciones', () => {
  it('hay una lección por mundo', () => {
    expect(Object.keys(LESSONS).map(Number)).toEqual(WORLDS.map((w) => w.id));
  });

  for (const lesson of Object.values(LESSONS)) {
    it(`mundo ${lesson.world}: ejemplos y práctica son palabras de tier 1 del mundo`, () => {
      const tier1 = new Set(
        world(lesson.world)
          .words.filter((w) => w.tier === 1)
          .map((w) => w.id),
      );
      for (const id of [...lesson.examples, ...lesson.practice]) expect(tier1, id).toContain(id);
      expect(new Set([...lesson.examples, ...lesson.practice]).size).toBe(6);
    });
  }
});
