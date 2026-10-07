// Perfil invitado: apodo + gatito. Sin email ni nombre real.
import { useState, type FormEvent } from 'react';
import { aliasProblem, ALIAS_MAX, AVATARS, type Avatar } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { profilesRepo } from '../../db/repos.ts';

export function Welcome() {
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState<Avatar>('negro');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const problem = aliasProblem(alias);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || saving) return;
    setSaving(true);
    await profilesRepo.create({ alias, avatar });
  };

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <Gatita avatar={avatar} className="mx-auto h-28 w-28" />
        <h1 className="mt-2 font-heading text-3xl font-bold text-pink-600">La Gatita Gramática</h1>
        <p className="text-gray-600">¡Hola! Antes de jugar, contame cómo te llamo.</p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="font-bold text-gray-700">Tu apodo</span>
        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={ALIAS_MAX + 5}
          autoComplete="off"
          placeholder="Por ejemplo, Michi"
          className="min-h-12 rounded-2xl border-2 border-pink-200 bg-white px-4 text-lg focus:border-pink-400 focus:outline-none"
          aria-invalid={touched && !!problem}
          aria-describedby="alias-help"
        />
        <span
          id="alias-help"
          className={`text-sm ${touched && problem ? 'font-semibold text-red-600' : 'text-gray-500'}`}
        >
          {touched && problem ? problem : 'Inventá un apodo. No pongas tu nombre completo.'}
        </span>
      </label>

      <fieldset>
        <legend className="mb-2 font-bold text-gray-700">Elegí tu gatito</legend>
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((a) => (
            <label
              key={a}
              className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 bg-white p-2 ${avatar === a ? 'border-pink-500 ring-2 ring-pink-200' : 'border-transparent'}`}
            >
              <input
                type="radio"
                name="avatar"
                value={a}
                checked={avatar === a}
                onChange={() => setAvatar(a)}
                className="sr-only"
              />
              <Gatita avatar={a} className="h-16 w-16" label={`Gatito ${a}`} />
              <span className="text-sm font-semibold text-gray-600 capitalize">
                {a === 'siames' ? 'siamés' : a}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" className="mt-auto min-h-14 w-full" disabled={saving}>
        ¡A jugar!
      </Button>
    </form>
  );
}
