import { useLiveQuery } from 'dexie-react-hooks';
import type { ProfileState } from '@gatita/shared';
import type { Profile } from '../../db/db.ts';
import { profilesRepo, stateRepo } from '../../db/repos.ts';

/** `undefined` mientras carga, `null` si todavía no hay perfil. */
export function useActiveProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await profilesRepo.active()) ?? null);
}

export function useProfileState(profileId: string | undefined): ProfileState | undefined {
  return useLiveQuery(() => (profileId ? stateRepo.get(profileId) : undefined), [profileId]);
}
