// Estado visible de la sincronización y el pedido de sincronizar desde cualquier pantalla.
import { create } from 'zustand';
import type { Runner, SyncStatus } from './runner.ts';

export const useSyncStatus = create<{ status: SyncStatus }>(() => ({ status: 'idle' }));

let current: Runner | null = null;
export const setRunner = (runner: Runner | null) => {
  current?.stop();
  current = runner;
};

/** Pide sincronizar (al terminar una ronda o una compra). Si no hay perfil vinculado, nada. */
export const requestSync = () => current?.trigger();
