// §8.3 Gatos amigos y §8.4 insignias. Las secretas se ven como "?" hasta ganarlas.
import { BADGES, COLLECTION, WORLDS } from '@gatita/shared';
import { Gatita } from '../../components/Gatita.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { FRIENDS } from '../../content/collection.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';

const FRIEND_ITEMS = COLLECTION.filter((i) => i.kind === 'gato');

const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

export function CollectionPage() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  if (!profile || !state) return null;

  // Primero las ganadas, en el orden del catálogo.
  const badges = [...BADGES].sort(
    (a, b) => Number(!state.badges[a.id]) - Number(!state.badges[b.id]),
  );
  const badgesWon = badges.filter((b) => state.badges[b.id]).length;
  const friendsWon = FRIEND_ITEMS.filter((i) => state.owned.includes(i.id)).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PageHeader title="Colección" />

      <section aria-labelledby="amigos">
        <h2 id="amigos" className="mb-2 font-heading text-xl font-bold text-gray-800">
          Gatos amigos{' '}
          <span className="text-base text-gray-500">
            {friendsWon} de {FRIEND_ITEMS.length}
          </span>
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {FRIEND_ITEMS.map((i) => {
            const world = WORLDS.find((w) => w.id === i.unlockedBy?.boss);
            const won = state.owned.includes(i.id);
            const look = FRIENDS[i.id];
            return (
              <li
                key={i.id}
                aria-label={won ? i.name : `Sin descubrir: jefe de ${world?.name}`}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 text-center shadow-sm"
              >
                {won && look ? (
                  <Gatita
                    avatar={look.avatar}
                    accessory={look.accessory}
                    className="h-16 w-16"
                    label=""
                  />
                ) : (
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl text-gray-400"
                    aria-hidden
                  >
                    ?
                  </span>
                )}
                <span className="text-xs leading-tight font-bold text-gray-700" aria-hidden>
                  {won ? i.name : `Jefe del mundo ${world?.id}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="insignias">
        <h2 id="insignias" className="mb-2 font-heading text-xl font-bold text-gray-800">
          Insignias{' '}
          <span className="text-base text-gray-500">
            {badgesWon} de {BADGES.length}
          </span>
        </h2>
        <ul className="grid gap-2">
          {badges.map((b) => {
            const at = state.badges[b.id];
            const hidden = b.secret && !at;
            return (
              <li
                key={b.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm ${at ? 'bg-white' : 'bg-gray-50'}`}
              >
                <span className={`text-3xl ${at ? '' : 'opacity-30 grayscale'}`} aria-hidden>
                  {hidden ? '❔' : '🏅'}
                </span>
                <span className="flex-1">
                  <span className={`block font-bold ${at ? 'text-gray-800' : 'text-gray-500'}`}>
                    {hidden ? '?' : b.name}
                  </span>
                  <span className="block text-sm text-gray-600">
                    {hidden ? 'Insignia secreta' : b.description}
                  </span>
                </span>
                {at && <span className="text-xs font-semibold text-gray-500">{dateText(at)}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
