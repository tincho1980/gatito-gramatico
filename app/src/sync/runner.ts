// Corre la sincronización cuando se la pide (al abrir la app, al volver la red, al terminar
// una ronda) y reintenta con espera creciente si falla por red o por el servidor.
import { CONFIG } from '@gatita/shared';
import { ApiError } from './api.ts';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'waiting' | 'error';

export const backoffMs = (attempt: number): number =>
  Math.min(CONFIG.syncBackoff.baseMs * 2 ** attempt, CONFIG.syncBackoff.maxMs);

export interface Runner {
  trigger: () => void;
  stop: () => void;
}

export function createRunner({
  run,
  onStatus,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
}: {
  run: () => Promise<void>;
  onStatus: (s: SyncStatus) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}): Runner {
  let running = false;
  let again = false;
  let attempt = 0;
  let timer: unknown = null;
  let stopped = false;

  async function loop() {
    if (running || stopped) {
      again = true;
      return;
    }
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    running = true;
    onStatus('syncing');
    try {
      await run();
      attempt = 0;
      onStatus('synced');
    } catch (e) {
      if (e instanceof ApiError && e.retry) {
        onStatus('waiting');
        timer = setTimer(() => {
          timer = null;
          void loop();
        }, backoffMs(attempt++));
      } else {
        // Sin token o pedido inválido: no se reintenta solo, espera al próximo pedido.
        onStatus('error');
      }
    } finally {
      running = false;
    }
    if (again && !stopped) {
      again = false;
      void loop();
    }
  }

  return {
    trigger: () => void loop(),
    stop: () => {
      stopped = true;
      if (timer !== null) clearTimer(timer);
    },
  };
}
