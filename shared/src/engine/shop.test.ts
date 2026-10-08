import { describe, expect, it } from 'vitest';
import { COLLECTION } from '../data/catalogs.ts';
import { isForSale, purchaseProblem, wallet, type Purchase } from './shop.ts';
import { initialState } from './state.ts';
import type { ProfileState } from './types.ts';

const withCroquetas = (croquetas: number, owned: string[] = []): ProfileState => ({
  ...initialState(),
  croquetas,
  owned,
});
const buy = (itemId: string, n = 1): Purchase => ({
  id: `p${n}`,
  itemId,
  at: '2026-03-02T14:00:00.000Z',
});

describe('§8.3 tienda', () => {
  it('los gatos amigos y la corona no se venden; accesorios y fondos sí', () => {
    const forSale = COLLECTION.filter(isForSale);
    expect(forSale.length).toBeGreaterThan(0);
    expect(forSale.every((i) => i.kind !== 'gato' && !i.unlockedBy && i.price > 0)).toBe(true);
    expect(COLLECTION.filter((i) => i.kind === 'gato').every((i) => !isForSale(i))).toBe(true);
    expect(isForSale(COLLECTION.find((i) => i.id === 'corona-gata-sabia')!)).toBe(false);
  });

  it('el saldo es lo ganado menos lo gastado; lo comprado pasa a ser del perfil', () => {
    const w = wallet(withCroquetas(50, ['gato-tejado']), [buy('mono-rosa')]);
    expect(w).toEqual({ balance: 30, spent: 20, owned: ['gato-tejado', 'mono-rosa'] });
  });

  it('una compra repetida, desconocida, sin saldo o de algo que no se vende no cuenta', () => {
    const w = wallet(withCroquetas(30), [
      buy('mono-rosa', 1),
      buy('mono-rosa', 2),
      buy('no-existe', 3),
      buy('gato-tejado', 4),
      buy('galera', 5),
    ]);
    expect(w).toEqual({ balance: 10, spent: 20, owned: ['mono-rosa'] });
  });

  it('por qué no se puede comprar', () => {
    const s = withCroquetas(25, ['gato-tejado']);
    expect(purchaseProblem(s, [], 'mono-rosa')).toBeNull();
    expect(purchaseProblem(s, [buy('mono-rosa')], 'mono-rosa')).toBe('owned');
    expect(purchaseProblem(s, [buy('mono-rosa')], 'flor')).toBe('balance');
    expect(purchaseProblem(s, [], 'gato-tejado')).toBe('not-for-sale');
    expect(purchaseProblem(s, [], 'nada')).toBe('unknown');
  });
});
