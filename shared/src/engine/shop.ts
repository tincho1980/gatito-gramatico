// §8.2 y §8.3 Saldo de croquetas y compras de la colección. Las compras son un registro
// propio (no salen de las rondas): `state.croquetas` es lo ganado y el saldo descuenta lo
// gastado. Como lo ganado nunca baja, el orden entre compras y rondas no cambia el resultado.
import { COLLECTION } from '../data/catalogs.ts';
import type { CollectionItem } from '../schemas.ts';
import type { ProfileState } from './types.ts';

export interface Purchase {
  id: string;
  itemId: string;
  /** ISO 8601 en UTC. */
  at: string;
}

export interface Wallet {
  /** Croquetas disponibles: ganadas menos gastadas. */
  balance: number;
  spent: number;
  /** Ítems del perfil: los ganados con jefes y los comprados. */
  owned: string[];
}

const itemById = (id: string): CollectionItem | undefined => COLLECTION.find((i) => i.id === id);

/** Se compra con croquetas: accesorios y fondos sin `unlockedBy`. */
export const isForSale = (item: CollectionItem): boolean =>
  item.kind !== 'gato' && !item.unlockedBy;

export function wallet(state: ProfileState, purchases: readonly Purchase[]): Wallet {
  const owned = [...state.owned];
  let spent = 0;
  for (const p of purchases) {
    const item = itemById(p.itemId);
    if (!item || !isForSale(item) || owned.includes(item.id)) continue;
    if (spent + item.price > state.croquetas) continue; // compra sin saldo: no cuenta
    owned.push(item.id);
    spent += item.price;
  }
  return { balance: state.croquetas - spent, spent, owned };
}

export type PurchaseProblem = 'unknown' | 'not-for-sale' | 'owned' | 'balance';

/** Por qué no se puede comprar un ítem, o `null` si se puede. */
export function purchaseProblem(
  state: ProfileState,
  purchases: readonly Purchase[],
  itemId: string,
): PurchaseProblem | null {
  const item = itemById(itemId);
  if (!item) return 'unknown';
  if (!isForSale(item)) return 'not-for-sale';
  const w = wallet(state, purchases);
  if (w.owned.includes(itemId)) return 'owned';
  if (w.balance < item.price) return 'balance';
  return null;
}
