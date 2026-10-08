// Sincroniza el perfil activo si está vinculado: al abrir, al volver la red y cuando se pide.
import { useEffect } from 'react';
import { useActiveProfile } from '../features/profile/hooks.ts';
import { useWords } from '../words/words.ts';
import { createApi } from './api.ts';
import { createRunner } from './runner.ts';
import { getToken, setRunner, useSyncStatus } from './store.ts';
import { syncProfile } from './sync.ts';

export function SyncManager() {
  const profile = useActiveProfile();
  const { words } = useWords();
  const linkedId = profile?.kind === 'linked' ? profile.id : null;

  useEffect(() => {
    if (!linkedId || !words) return;
    const api = createApi(getToken);
    const runner = createRunner({
      run: async () => {
        await syncProfile(linkedId, { api, words: words.index });
      },
      onStatus: (status) => useSyncStatus.setState({ status }),
    });
    setRunner(runner);
    runner.trigger();
    const online = () => runner.trigger();
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      setRunner(null);
    };
  }, [linkedId, words]);

  return null;
}
