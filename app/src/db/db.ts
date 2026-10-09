// IndexedDB con Dexie (arquitectura §4). `rounds` y `purchases` son el registro fuente;
// `profileState` es el estado derivado de las rondas (se puede reconstruir con `replay`).
import Dexie, { type EntityTable } from 'dexie';
import type { Avatar, ProfileState, Purchase, Round } from '@gatita/shared';

export interface Profile {
  id: string;
  alias: string;
  avatar: Avatar;
  /** Invitado: solo en este dispositivo. Vinculado: se sincroniza (ver `link`). */
  kind: 'guest' | 'linked';
  link?: ProfileLink;
  createdAt: string;
  /** Sonidos y vibración. */
  sound: boolean;
  /** Letra más grande en toda la app (accesibilidad, plan etapa 9). */
  bigText?: boolean;
  /** Accesorio y fondo puestos (ids de la colección). */
  look?: Look;
}

/**
 * Con qué se sincroniza un perfil vinculado: el login del adulto (familia) o el token del
 * chico de aula, que no tiene cuenta (arquitectura §6).
 */
export type ProfileLink =
  { via: 'family'; accountId: string } | { via: 'classroom'; classroomId: string; token: string };

export interface Look {
  accesorio?: string;
  fondo?: string;
}

/** Compra en la tienda (§8.3): registro fuente, como las rondas. */
export interface StoredPurchase extends Purchase {
  profileId: string;
  synced: boolean;
  rejected?: string;
}

export interface StoredRound extends Round {
  profileId: string;
  /** El servidor la aceptó (arquitectura §7). */
  synced: boolean;
  /** El servidor la rechazó por inválida: no se reintenta. */
  rejected?: string;
}

export interface StoredState {
  profileId: string;
  state: ProfileState;
  updatedAt: string;
}

export interface Meta {
  key: 'activeProfileId' | 'wordsVersion';
  value: string;
}

export class GatitaDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  rounds!: EntityTable<StoredRound, 'id'>;
  profileState!: EntityTable<StoredState, 'profileId'>;
  purchases!: EntityTable<StoredPurchase, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'gatita') {
    super(name);
    this.version(1).stores({
      profiles: 'id, createdAt',
      rounds: 'id, profileId, [profileId+finishedAt], synced',
      profileState: 'profileId',
      meta: 'key',
    });
    this.version(2).stores({ purchases: 'id, profileId, synced' });
  }
}

export const db = new GatitaDB();
