import { Link } from 'react-router';
import { Gatita } from '../../components/Gatita.tsx';
import { profilesRepo } from '../../db/repos.ts';
import { useActiveProfile } from './hooks.ts';

export function ProfilePage() {
  const profile = useActiveProfile();
  if (!profile) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <Link to="/" className="self-start font-bold text-pink-600">
        ← Volver
      </Link>
      <div className="text-center">
        <Gatita avatar={profile.avatar} className="mx-auto h-28 w-28" />
        <h1 className="mt-2 font-heading text-3xl font-bold text-gray-800">{profile.alias}</h1>
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
    </main>
  );
}
