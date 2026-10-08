// Inicio. Sin perfil: bienvenida. Con perfil: nivel, croquetas y racha (§3, §8), la gatita con
// lo que tiene puesto, el mundo actual, el botón "Jugar" (§7.2) y el mapa.
import { Link } from 'react-router';
import {
  COLLECTION,
  currentStreak,
  levelFor,
  localDay,
  napAvailable,
  playAction,
  WORLDS,
} from '@gatita/shared';
import { Croquetas } from '../../components/Croquetas.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { backgroundClass, FRIENDS } from '../../content/collection.ts';
import { worldLook } from '../../content/worlds.ts';
import { useWords } from '../../words/words.ts';
import { DebugPanel } from '../debug/DebugPanel.tsx';
import { isDebug } from '../debug/flag.ts';
import { useActiveProfile, useProfileState, useWallet } from '../profile/hooks.ts';
import { Welcome } from '../profile/Welcome.tsx';
import { InstallCard } from '../pwa/InstallCard.tsx';
import { actionPath } from '../round/paths.ts';

export function Home() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const wallet = useWallet(profile?.id, state);
  const { words } = useWords();
  if (profile === undefined) return null;
  if (profile === null) return <Welcome />;

  const today = localDay(new Date().toISOString(), -new Date().getTimezoneOffset());
  const action = state && words ? playAction(state, words.index) : null;
  const worldId = action && action.kind !== 'map' ? action.world : (state?.lastWorld ?? 1);
  const world = WORLDS.find((w) => w.id === worldId);
  const look = worldLook(worldId);
  const level = levelFor(state?.xp ?? 0);
  const streak = state ? currentStreak(state.streak, today) : 0;
  const nap = state ? napAvailable(state.streak, today) : true;
  const friends = COLLECTION.filter((i) => i.kind === 'gato' && wallet?.owned.includes(i.id));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-pink-600">¡Hola, {profile.alias}!</h1>
        <Link to="/perfil" aria-label="Tu perfil" className="rounded-full">
          <Gatita
            avatar={profile.avatar}
            accessory={profile.look?.accesorio}
            className="h-12 w-12"
          />
        </Link>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <dt className="text-xs font-semibold text-gray-500">Nivel</dt>
          <dd className="font-heading text-2xl font-bold text-gray-800">{level.level}</dd>
          <dd
            className="mx-1 mt-1 h-1.5 overflow-hidden rounded-full bg-pink-100"
            role="progressbar"
            aria-label={`${level.into} de ${level.needed} XP para el nivel ${level.level + 1}`}
            aria-valuemin={0}
            aria-valuemax={level.needed}
            aria-valuenow={level.into}
          >
            <div
              className="h-full rounded-full bg-pink-500"
              style={{ width: `${(level.into / level.needed) * 100}%` }}
            />
          </dd>
        </div>
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <dt className="text-xs font-semibold text-gray-500">Croquetas</dt>
          <dd>
            <Croquetas value={wallet?.balance ?? 0} className="text-2xl text-amber-600" />
          </dd>
        </div>
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <dt className="text-xs font-semibold text-gray-500">Racha</dt>
          <dd className="font-heading text-2xl font-bold text-gray-800">
            {streak} <span aria-hidden>🔥</span>
          </dd>
          <dd className="text-[11px] leading-tight font-semibold text-gray-500">
            {nap ? '😴 Siesta lista' : '😴 Siesta usada'}
          </dd>
        </div>
      </dl>

      <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div
          className={`flex w-full flex-col items-center justify-end gap-1 rounded-3xl px-4 pt-6 pb-3 shadow-sm ${backgroundClass(profile.look?.fondo)}`}
        >
          <Gatita
            avatar={profile.avatar}
            accessory={profile.look?.accesorio}
            className="h-32 w-32"
          />
          {friends.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-1" aria-label="Tus gatos amigos">
              {friends.map((f) => {
                const fl = FRIENDS[f.id];
                return (
                  fl && (
                    <li key={f.id} aria-label={f.name}>
                      <Gatita
                        avatar={fl.avatar}
                        accessory={fl.accessory}
                        className="h-10 w-10"
                        label=""
                      />
                    </li>
                  )
                );
              })}
            </ul>
          )}
        </div>
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

      {state && <InstallCard roundsPlayed={state.roundsPlayed} />}

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
        <nav className="grid grid-cols-3 gap-2" aria-label="Más">
          <NavLink to="/tienda" icon="🛍️" label="Tienda" />
          <NavLink to="/coleccion" icon="🏅" label="Colección" />
          <NavLink to="/progreso" icon="📊" label="Progreso" />
        </nav>
      </div>
    </main>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 flex-col items-center justify-center rounded-2xl bg-white text-sm font-bold text-gray-700 shadow-sm"
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
