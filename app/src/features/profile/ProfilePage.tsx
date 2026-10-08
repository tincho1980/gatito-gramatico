// Perfil: sonido, perfiles del dispositivo (para cambiar o agregar), aula y acceso de adultos.
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { Gatita } from '../../components/Gatita.tsx';
import { profilesRepo } from '../../db/repos.ts';
import { useActiveProfile } from './hooks.ts';

export function ProfilePage() {
  const profile = useActiveProfile();
  const profiles = useLiveQuery(() => profilesRepo.list());
  const navigate = useNavigate();
  if (!profile) return null;
  const others = (profiles ?? []).filter((p) => p.id !== profile.id);
  const linkText =
    profile.link?.via === 'classroom'
      ? 'Tu progreso se guarda en tu aula.'
      : profile.link?.via === 'family'
        ? 'Tu progreso se guarda en la cuenta de tu familia.'
        : 'Tu progreso está solo en este dispositivo.';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pt-6 pb-safe">
      <Link
        to="/"
        className="-my-3 flex min-h-12 items-center self-start pr-3 font-bold text-pink-600"
      >
        ← Volver
      </Link>
      <div className="text-center">
        <Gatita
          avatar={profile.avatar}
          accessory={profile.look?.accesorio}
          className="mx-auto h-28 w-28"
        />
        <h1 className="mt-2 font-heading text-3xl font-bold text-gray-800">{profile.alias}</h1>
        <p className="text-sm text-gray-600">{linkText}</p>
      </div>
      <label className="flex min-h-14 items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="font-bold text-gray-700">Sonido y vibración</span>
        <input
          type="checkbox"
          role="switch"
          checked={profile.sound}
          onChange={(e) => void profilesRepo.setSound(profile.id, e.target.checked)}
          className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-gray-300 transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:transition checked:bg-pink-500 checked:before:translate-x-5.5"
        />
      </label>

      {profile.link?.via !== 'classroom' && (
        <Link
          to="/entrar-al-aula"
          className="flex min-h-14 items-center justify-between rounded-2xl bg-white px-4 font-bold text-gray-700 shadow-sm"
        >
          Entrar a mi aula <span aria-hidden>🏫</span>
        </Link>
      )}

      <section aria-labelledby="otros" className="grid gap-2">
        <h2 id="otros" className="font-heading text-lg font-bold text-gray-800">
          Otros perfiles en este dispositivo
        </h2>
        {others.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              void profilesRepo.setActive(p.id).then(() => navigate('/'));
            }}
            className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 text-left font-bold text-gray-700 shadow-sm"
          >
            <Gatita
              avatar={p.avatar}
              accessory={p.look?.accesorio}
              className="h-10 w-10"
              label=""
            />
            <span className="flex-1">{p.alias}</span>
            <span className="text-sm text-pink-600">Jugar</span>
          </button>
        ))}
        <Link
          to="/nuevo-perfil"
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 font-bold text-pink-600"
        >
          + Agregar otro perfil
        </Link>
      </section>

      <Link
        to="/adultos"
        className="mt-auto flex min-h-12 items-center justify-center text-sm font-bold text-gray-500 underline"
      >
        Para familias y docentes
      </Link>
    </main>
  );
}
