// "Entrar a mi aula": código del aula + apodo + PIN de 4 números. El chico no tiene cuenta ni
// da email: recibe un token de perfil. Con el mismo apodo y PIN recupera su perfil en otro
// dispositivo (plan, etapa 8).
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  aliasProblem,
  CONFIG,
  isAvatar,
  isClassroomCode,
  normalizeClassroomCode,
  type Avatar,
} from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { profilesRepo } from '../../db/repos.ts';
import { ApiError, fetchProfile, joinClassroom } from '../../sync/api.ts';
import { requestSync } from '../../sync/store.ts';
import { useNotices } from '../notify/store.ts';
import { useActiveProfile } from '../profile/hooks.ts';

const inputClass =
  'min-h-12 rounded-2xl border-2 border-pink-200 bg-white px-4 text-lg focus:border-pink-400';

export function JoinPage() {
  const active = useActiveProfile();
  const navigate = useNavigate();
  const push = useNotices((s) => s.push);
  // Un perfil invitado del dispositivo entra con su progreso; si no, se crea uno nuevo.
  const guest = active && active.kind === 'guest' ? active : null;
  const [code, setCode] = useState('');
  const [alias, setAlias] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const aliasValue = alias ?? guest?.alias ?? '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeClassroomCode(code);
    const problem = !isClassroomCode(normalized)
      ? `El código tiene ${CONFIG.classroom.codeLength} letras.`
      : (aliasProblem(aliasValue) ??
        (pin.length !== CONFIG.classroom.pinLength
          ? `El PIN tiene ${CONFIG.classroom.pinLength} números.`
          : null));
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const res = await joinClassroom({
        code: normalized,
        alias: aliasValue,
        pin,
        avatar: guest?.avatar ?? active?.avatar,
        ...(guest ? { profileId: guest.id, createdAt: guest.createdAt } : {}),
      });
      const link = {
        via: 'classroom' as const,
        classroomId: res.profile.classroomId,
        token: res.token,
      };
      if (!res.existing && guest && res.profile.id === guest.id) {
        // El perfil de este dispositivo pasa a ser del aula: su historial se sube solo.
        await profilesRepo.link(guest.id, link);
      } else {
        // Perfil del aula que ya existía (otro dispositivo) o uno nuevo: se trae del servidor.
        const remote = await fetchProfile(res.token, res.profile.id);
        await profilesRepo.importRemote(
          {
            ...remote,
            profile: {
              ...remote.profile,
              avatar: isAvatar(remote.profile.avatar)
                ? remote.profile.avatar
                : ('naranja' as Avatar),
            },
          },
          link,
        );
      }
      requestSync();
      push({ icon: '🏫', text: res.existing ? '¡Volviste a tu aula!' : '¡Entraste a tu aula!' });
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiError && err.reason
          ? err.reason
          : 'No pudimos conectarnos. Fijate que haya internet y probá de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-6 pb-safe"
    >
      <PageHeader title="Entrar a mi aula" back={active ? '/perfil' : '/'} />
      <div className="text-center">
        <Gatita avatar={active?.avatar ?? 'naranja'} className="mx-auto h-24 w-24" />
        <p className="mt-2 text-gray-600">
          Pedile a tu docente el código del aula. Si ya entraste en otro celular, usá el mismo apodo
          y PIN.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold text-gray-700">Código del aula</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={CONFIG.classroom.codeLength + 2}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Por ejemplo, KMTXBA"
          className={`${inputClass} font-heading tracking-[0.3em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case`}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold text-gray-700">Tu apodo</span>
        <input
          value={aliasValue}
          onChange={(e) => setAlias(e.target.value)}
          autoComplete="off"
          placeholder="Por ejemplo, Michi"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold text-gray-700">Tu PIN</span>
        <input
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, '').slice(0, CONFIG.classroom.pinLength))
          }
          inputMode="numeric"
          autoComplete="off"
          type="password"
          placeholder="4 números"
          className={`${inputClass} tracking-[0.5em] placeholder:tracking-normal`}
        />
        <span className="text-sm text-gray-500">
          Inventá 4 números y acordate de ellos. No uses tu fecha de cumpleaños.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 font-semibold text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-auto min-h-14 w-full" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
