// Inicio. Sin perfil: bienvenida. En la etapa 4 suma el mapa y el "Jugar" de §7.2.
import { Link } from 'react-router';
import { WORLDS, currentStreak, localDay } from '@gatita/shared';
import { Gatita } from '../../components/Gatita.tsx';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { Welcome } from '../profile/Welcome.tsx';
import { STAGE3_TARGET } from '../round/target.ts';

export function Home() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  if (profile === undefined) return null;
  if (profile === null) return <Welcome />;

  const today = localDay(new Date().toISOString(), -new Date().getTimezoneOffset());
  const world = WORLDS.find((w) => w.id === STAGE3_TARGET.world);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-pink-600">¡Hola, {profile.alias}!</h1>
        <Link to="/perfil" aria-label="Tu perfil" className="rounded-full">
          <Gatita avatar={profile.avatar} className="h-12 w-12" />
        </Link>
      </header>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="XP" value={state?.xp ?? 0} />
        <Stat label="Rondas" value={state?.roundsPlayed ?? 0} />
        <Stat label="Racha" value={state ? currentStreak(state.streak, today) : 0} />
      </dl>

      <section className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <Gatita avatar={profile.avatar} className="h-40 w-40" />
        {world && (
          <p className="text-gray-600">
            Mundo {world.id} · <strong>{world.name}</strong> · {world.topic}
          </p>
        )}
      </section>

      <Link
        to="/ronda"
        className="flex min-h-14 items-center justify-center rounded-2xl border-b-4 border-pink-700 bg-pink-500 font-heading text-xl font-bold text-white shadow-sm active:translate-y-1 active:border-b-0"
      >
        Jugar
      </Link>
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
