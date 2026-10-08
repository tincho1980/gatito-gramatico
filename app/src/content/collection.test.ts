import { describe, expect, it } from 'vitest';
import { COLLECTION } from '@gatita/shared';
import { ACCESSORY_SHAPES } from './accessories.tsx';
import { BACKGROUNDS, FRIENDS } from './collection.ts';

describe('dibujos de la colección', () => {
  it('cada ítem del catálogo tiene su dibujo', () => {
    for (const item of COLLECTION) {
      const drawn =
        item.kind === 'accesorio'
          ? ACCESSORY_SHAPES[item.id]
          : item.kind === 'fondo'
            ? BACKGROUNDS[item.id]
            : FRIENDS[item.id];
      expect(drawn, item.id).toBeDefined();
    }
  });
});
