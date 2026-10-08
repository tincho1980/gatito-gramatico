// Mapa vertical de los 10 mundos (§7.1): el camino con las dos bifurcaciones, el estado de
// cada mundo y la gatita en el mundo actual. Las bifurcaciones no fuerzan orden.
import { Link } from 'react-router';
import { WORLDS, worldStatus, type ProfileState, type WorldStatus } from '@gatita/shared';
import { Gatita } from '../../components/Gatita.tsx';
import { Stars } from '../../components/Stars.tsx';
import { worldLook } from '../../content/worlds.ts';
import type { Profile } from '../../db/db.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';

const STATUS_TEXT: Record<WorldStatus, string> = {
  locked: 'bloqueado',
  available: 'disponible',
  inProgress: 'en curso',
  complete: 'completo',
};

export function MapPage() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  if (!profile || !state) return null;

  const node = (id: number) => <WorldNode key={id} id={id} state={state} profile={profile} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-4 pt-6 pb-safe">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex min-h-12 items-center pr-3 font-bold text-pink-600">
          ← Inicio
        </Link>
        <h1 className="font-heading text-2xl font-bold text-gray-800">El camino</h1>
        <span className="w-14" />
      </header>

      <div role="list" className="flex flex-col items-stretch gap-2" aria-label="Mundos">
        <Row>{node(1)}</Row>
        <Connector />
        <Fork label="Elegí el orden">
          <div className="grid grid-cols-3 gap-2">{[2, 3, 4].map(node)}</div>
        </Fork>
        <Connector />
        <Row>{node(5)}</Row>
        <Connector />
        <Fork label="Elegí el camino">
          <div className="grid grid-cols-2 gap-2">
            {node(6)}
            {node(8)}
            {node(7)}
            {node(9)}
          </div>
        </Fork>
        <Connector />
        <Row>{node(10)}</Row>
      </div>
    </main>
  );
}

function WorldNode({ id, state, profile }: { id: number; state: ProfileState; profile: Profile }) {
  const world = WORLDS.find((w) => w.id === id)!;
  const status = worldStatus(state, id);
  const look = worldLook(id);
  const stars = state.worlds[id]?.stars ?? 0;
  const here = state.lastWorld === id && status !== 'locked';
  const label = `Mundo ${id}, ${world.name}, ${STATUS_TEXT[status]}${status === 'complete' ? `, ${stars} de 3 estrellas` : ''}`;

  const body = (
    <div
      className={`relative flex h-full flex-col items-center gap-1 rounded-2xl border-2 bg-white p-2 text-center shadow-sm ${status === 'locked' ? 'border-transparent opacity-50 grayscale' : look.ring}`}
    >
      {here && (
        <span className="absolute top-1 right-1">
          <Gatita
            avatar={profile.avatar}
            accessory={profile.look?.accesorio}
            className="h-8 w-8"
            label="Estás acá"
          />
        </span>
      )}
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl ${look.bg}`}
        aria-hidden
      >
        {status === 'locked' ? '🔒' : look.icon}
      </span>
      <span className="font-heading text-sm leading-tight font-bold text-gray-800">
        {world.name}
      </span>
      <span className="text-xs text-gray-500">
        {id} · {world.topic}
      </span>
      {status === 'complete' && <Stars count={stars} className="text-sm" />}
      {status === 'available' && <span className="text-xs font-bold text-pink-600">¡Nuevo!</span>}
      {status === 'inProgress' && (
        <span className="text-xs font-bold text-amber-600">En curso</span>
      )}
    </div>
  );

  return (
    <div role="listitem" aria-label={label}>
      {status === 'locked' ? (
        <div aria-disabled>{body}</div>
      ) : (
        <Link to={`/mundo/${id}`} className="block h-full">
          {body}
        </Link>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-40">{children}</div>;
}

function Fork({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-pink-100/70 p-2 pt-1">
      <p className="mb-1 text-center text-xs font-bold tracking-wide text-pink-600 uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function Connector() {
  return <div className="mx-auto h-4 w-1 rounded-full bg-pink-200" aria-hidden />;
}
