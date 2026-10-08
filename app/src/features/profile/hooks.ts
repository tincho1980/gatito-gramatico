import { useLiveQuery } from 'dexie-react-hooks';
import { wallet, type ProfileState, type Purchase, type Wallet } from '@gatita/shared';
import type { Profile } from '../../db/db.ts';
import { profilesRepo, purchasesRepo, stateRepo } from '../../db/repos.ts';

/** `undefined` mientras carga, `null` si todavía no hay perfil. */
export function useActiveProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await profilesRepo.active()) ?? null);
}

export function useProfileState(profileId: string | undefined): ProfileState | undefined {
  return useLiveQuery(() => (profileId ? stateRepo.get(profileId) : undefined), [profileId]);
}

export function usePurchases(profileId: string | undefined): Purchase[] | undefined {
  return useLiveQuery(
    () => (profileId ? purchasesRepo.byProfile(profileId) : undefined),
    [profileId],
  );
}

/** Saldo de croquetas e ítems del perfil (§8.2, §8.3). */
export function useWallet(
  profileId: string | undefined,
  state: ProfileState | undefined,
): Wallet | undefined {
  const purchases = usePurchases(profileId);
  return state && purchases ? wallet(state, purchases) : undefined;
}
