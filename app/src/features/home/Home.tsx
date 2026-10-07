// Inicio. Sin perfil: bienvenida. Con perfil: el mundo actual, el botón "Jugar" (§7.2) y el mapa.
import { Link } from 'react-router';
import { currentStreak, localDay, playAction, WORLDS } from '@gatita/shared';
import { Gatita } from '../../components/Gatita.tsx';
import { worldLook } from '../../content/worlds.ts';
import { useWords } from '../../words/words.ts';
import { DebugPanel } from '../debug/DebugPanel.tsx';
import { isDebug } from '../debug/flag.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { Welcome } from '../profile/Welcome.tsx';
import { actionPath } from '../round/paths.ts';

export function Home() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const { words } = useWords();
  if (profile === undefined) return null;
  if (profile === null) return <Welcome />;

  const today = localDay(new Date().toISOString(), -new Date().getTimezoneOffset());
  const action = state && words ? playAction(state, words.index) : null;
  const worldId = action && action.kind !== 'map' ? action.world : (state?.lastWorld ?? 1);
  const world = WORLDS.find((w) => w.id === worldId);
  const look = worldLook(worldId);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-pink-600">¡Hola, {profile.alias}!</h1>
        <Link to="/perfil" aria-label="Tu perfil" className="rounded-full">
          <Gatita avatar={profile.avatar} className="h-12 w-12" />
        </Link>
      </header>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="XP" value={state?.xp ?? 0} />
        <Stat label="Croquetas" value={state?.croquetas ?? 0} />
        <Stat label="Racha" value={state ? currentStreak(state.streak, today) : 0} />
      </dl>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Gatita avatar={profile.avatar} className="h-36 w-36" />
        {world && (
          <Link
            to={`/mundo/${world.id}`}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xl ${look.bg}`}
              aria-hidden
            >
              {look.icon}
            </span>
            <span className="text-left">
              <span className="block text-xs font-semibold text-gray-500">
                Mundo {world.id} · {world.topic}
              </span>
              <span className="font-heading font-bold text-gray-800">{world.name}</span>
            </span>
          </Link>
        )}
        {action?.kind === 'map' && (
          <p className="text-gray-600">¡Completaste este mundo! Elegí el próximo en el camino.</p>
        )}
      </section>

      {isDebug() && <DebugPanel profileId={profile.id} />}

      <div className="grid gap-3 pb-[env(safe-area-inset-bottom)]">
        {action && (
          <Link
            to={actionPath(action)}
            className="flex min-h-14 items-center justify-center rounded-2xl border-b-4 border-pink-700 bg-pink-500 font-heading text-xl font-bold text-white shadow-sm active:translate-y-1 active:border-b-0"
          >
            {action.kind === 'boss'
              ? '¡Desafiar al jefe!'
              : action.kind === 'map'
                ? 'Elegir mundo'
                : 'Jugar'}
          </Link>
        )}
        <Link
          to="/mapa"
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-pink-200 bg-white font-heading text-lg font-bold text-pink-600"
        >
          Ver el camino
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <dt className="text-sm font-semibold text-gray-500">{label}</dt>
      <dd className="font-heading text-2xl font-bold text-gray-800">{value}</dd>
    </div>
  );
}
