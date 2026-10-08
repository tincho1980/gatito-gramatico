// Indicador discreto para perfiles vinculados: ¿está todo guardado en la nube?
import { useLiveQuery } from 'dexie-react-hooks';
import { pendingCount } from './sync.ts';
import { useSyncStatus } from './store.ts';

export function SyncBadge({ profileId }: { profileId: string }) {
  const pending = useLiveQuery(() => pendingCount(profileId), [profileId]);
  const status = useSyncStatus((s) => s.status);
  if (pending === undefined) return null;
  const [icon, text] =
    status === 'syncing'
      ? ['🔄', 'Guardando en la nube…']
      : pending === 0
        ? ['☁️', 'Todo guardado en la nube']
        : ['⏳', `${pending} sin subir: se suben solas cuando haya internet`];
  return (
    <p className="flex items-center gap-1 text-xs font-semibold text-gray-500" role="status">
      <span aria-hidden>{icon}</span>
      {text}
    </p>
  );
}
