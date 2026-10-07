// IndexedDB con Dexie (arquitectura §4). `rounds` es el registro fuente; `profileState` es el
// estado derivado (se puede reconstruir con `replay`).
import Dexie, { type EntityTable } from 'dexie';
import type { Avatar, ProfileState, Round } from '@gatita/shared';

export interface Profile {
  id: string;
  alias: string;
  avatar: Avatar;
  kind: 'guest' | 'linked';
  remoteId?: string;
  createdAt: string;
  /** Sonidos y vibración. */
  sound: boolean;
}

export interface StoredRound extends Round {
  profileId: string;
  synced: boolean;
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
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'gatita') {
    super(name);
    this.version(1).stores({
      profiles: 'id, createdAt',
      rounds: 'id, profileId, [profileId+finishedAt], synced',
      profileState: 'profileId',
      meta: 'key',
    });
  }
}

export const db = new GatitaDB();
