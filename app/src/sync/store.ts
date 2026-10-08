// Estado visible de la sincronización y el pedido de sincronizar desde cualquier pantalla.
import { create } from 'zustand';
import type { GetToken } from './api.ts';
import type { Runner, SyncStatus } from './runner.ts';

export const useSyncStatus = create<{ status: SyncStatus }>(() => ({ status: 'idle' }));

// El login adulto (etapa 8) cambia esto por el token de la sesión de Supabase.
let tokenProvider: GetToken = () => Promise.resolve(null);
export const setTokenProvider = (provider: GetToken) => {
  tokenProvider = provider;
};
export const getToken: GetToken = () => tokenProvider();

let current: Runner | null = null;
export const setRunner = (runner: Runner | null) => {
  current?.stop();
  current = runner;
};

/** Pide sincronizar (al terminar una ronda o una compra). Si no hay perfil vinculado, nada. */
export const requestSync = () => current?.trigger();
