// Panel de familia: vincular perfiles de este dispositivo a la cuenta (sube su historial),
// traer a este dispositivo los que están en la cuenta, y crear perfiles nuevos.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { aliasProblem, AVATARS, isAvatar, normalizeAlias, type Avatar } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { db } from '../../db/db.ts';
import { profilesRepo, roundsRepo } from '../../db/repos.ts';
import { adultApi, ApiError } from '../../sync/api.ts';
import { requestSync } from '../../sync/store.ts';
import { toRound } from '../../sync/sync.ts';
import { useNotices } from '../notify/store.ts';

interface RemoteSummary {
  id: string;
  alias: string;
  avatar: string;
}

export function FamilyPanel({ token, accountId }: { token: string; accountId: string }) {
  const local = useLiveQuery(() => profilesRepo.list());
  const [remote, setRemote] = useState<RemoteSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const push = useNotices((s) => s.push);
  const navigate = useNavigate();
  const api = adultApi(token);

  const refresh = useCallback(() => {
    adultApi(token)
      .profiles()
      .then((r) => setRemote(r.profiles.filter((p) => !p.classroomId)))
      .catch(() => setError('No pudimos traer los perfiles de tu cuenta.'));
  }, [token]);
  useEffect(refresh, [refresh]);

  const run = async (id: string, task: () => Promise<void>) => {
    setBusy(id);
    setError(null);
    try {
      await task();
      refresh();
    } catch (e) {
      setError(e instanceof ApiError && e.reason ? e.reason : 'Algo salió mal. Probá de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  /** Sube el historial del perfil invitado y lo deja vinculado a la cuenta. */
  const linkProfile = (id: string) =>
    run(id, async () => {
      const p = await db.profiles.get(id);
      if (!p) return;
      const rounds = await roundsRepo.byProfile(id);
      const res = await api.createProfile({
        id: p.id,
        alias: p.alias,
        avatar: p.avatar,
        createdAt: p.createdAt,
        rounds: rounds.map((r) => toRound({ ...r, profileId: id, synced: false })),
      });
      await db.transaction('rw', db.rounds, db.profiles, db.profileState, async () => {
        for (const rid of res.acceptedIds) await db.rounds.update(rid, { synced: true });
        for (const r of res.rejected) await db.rounds.update(r.id, { rejected: r.reason });
        await db.profileState.put({
          profileId: id,
          state: res.state,
          updatedAt: new Date().toISOString(),
        });
        await profilesRepo.link(id, { via: 'family', accountId });
      });
      requestSync(); // las compras pendientes
      push({ icon: '☁️', text: `${p.alias} quedó guardado en tu cuenta` });
    });

  const bringHere = (r: RemoteSummary) =>
    run(r.id, async () => {
      const full = await api.fetchProfile(r.id);
      await profilesRepo.importRemote(
        {
          ...full,
          profile: {
            ...full.profile,
            avatar: isAvatar(full.profile.avatar) ? full.profile.avatar : 'naranja',
          },
        },
        { via: 'family', accountId },
      );
      push({ icon: '📲', text: `${r.alias} ya está en este dispositivo` });
      navigate('/');
    });

  /**
   * Borra el perfil con todo su progreso: de la cuenta (si es de la familia) y del dispositivo.
   * Un perfil invitado o de aula solo se saca de este dispositivo.
   */
  const removeProfile = (id: string, alias: string, inAccount: boolean) => {
    const message = inAccount
      ? `¿Borrar a ${alias} con todo su progreso? Se borra de tu cuenta y de este dispositivo. No se puede deshacer.`
      : `¿Sacar a ${alias} de este dispositivo con todo su progreso? No se puede deshacer.`;
    if (!window.confirm(message)) return;
    void run(id, async () => {
      if (inAccount) await api.deleteProfile(id);
      await profilesRepo.remove(id);
      push({ icon: '🗑', text: `Se borró ${alias}` });
    });
  };

  const onDevice = new Set((local ?? []).map((p) => p.id));
  const taken = [...(local ?? []), ...(remote ?? [])].map((p) => p.alias.toLowerCase());
  const elsewhere = (remote ?? []).filter((r) => !onDevice.has(r.id));

  return (
    <div className="grid gap-6">
      <section aria-labelledby="aca" className="grid gap-2">
        <h2 id="aca" className="font-heading text-xl font-bold text-gray-800">
          En este dispositivo
        </h2>
        {(local ?? []).map((p) => (
          <div
            key={p.id}
            className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm"
          >
            <Gatita avatar={p.avatar} className="h-10 w-10" label="" />
            <span className="flex-1 font-bold text-gray-800">{p.alias}</span>
            {p.link?.via === 'family' ? (
              <span className="text-sm font-semibold text-emerald-700">☁️ En tu cuenta</span>
            ) : p.link?.via === 'classroom' ? (
              <span className="text-sm font-semibold text-gray-500">🏫 De un aula</span>
            ) : (
              <Button
                size="sm"
                className="min-h-11"
                disabled={busy !== null}
                onClick={() => void linkProfile(p.id)}
              >
                {busy === p.id ? 'Guardando…' : 'Guardar en mi cuenta'}
              </Button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => removeProfile(p.id, p.alias, p.link?.via === 'family')}
              aria-label={`Borrar a ${p.alias}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100"
            >
              🗑
            </button>
          </div>
        ))}
      </section>

      {elsewhere.length > 0 && (
        <section aria-labelledby="cuenta" className="grid gap-2">
          <h2 id="cuenta" className="font-heading text-xl font-bold text-gray-800">
            En tu cuenta, en otro dispositivo
          </h2>
          {elsewhere.map((r) => (
            <div
              key={r.id}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm"
            >
              <Gatita
                avatar={isAvatar(r.avatar) ? r.avatar : 'naranja'}
                className="h-10 w-10"
                label=""
              />
              <span className="flex-1 font-bold text-gray-800">{r.alias}</span>
              <Button
                size="sm"
                className="min-h-11"
                disabled={busy !== null}
                onClick={() => void bringHere(r)}
              >
                {busy === r.id ? 'Trayendo…' : 'Jugar acá'}
              </Button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => removeProfile(r.id, r.alias, true)}
                aria-label={`Borrar a ${r.alias}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-gray-400 hover:bg-gray-100"
              >
                🗑
              </button>
            </div>
          ))}
        </section>
      )}

      <NewProfile
        disabled={busy !== null}
        taken={taken}
        onCreate={(alias, avatar) =>
          run('nuevo', async () => {
            // Primero en la cuenta: si el servidor lo rechaza, no queda un perfil suelto acá.
            const id = crypto.randomUUID();
            const createdAt = new Date().toISOString();
            await api.createProfile({ id, alias, avatar, createdAt });
            const p = await profilesRepo.create({ alias, avatar }, { id, now: createdAt });
            await profilesRepo.link(p.id, { via: 'family', accountId });
            push({ icon: '🐱', text: `Listo: ${p.alias} ya puede jugar` });
            navigate('/');
          })
        }
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function NewProfile({
  onCreate,
  disabled,
  taken,
}: {
  onCreate: (alias: string, avatar: Avatar) => void;
  disabled: boolean;
  /** Apodos que ya existen (en el dispositivo o en la cuenta), en minúsculas. */
  taken: readonly string[];
}) {
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState<Avatar>('naranja');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p =
      aliasProblem(alias) ??
      (taken.includes(normalizeAlias(alias).toLowerCase())
        ? 'Ya tenés un perfil con ese apodo.'
        : null);
    setProblem(p);
    if (!p) onCreate(alias, avatar);
  };

  return (
    <form
      onSubmit={submit}
      aria-labelledby="nuevo"
      className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm"
    >
      <h2 id="nuevo" className="font-heading text-xl font-bold text-gray-800">
        Crear un perfil
      </h2>
      <p className="text-sm text-gray-600">Un apodo, nunca el nombre real.</p>
      <input
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Apodo"
        aria-label="Apodo"
        className="min-h-12 rounded-2xl border-2 border-pink-200 px-4 text-lg focus:border-pink-400 focus:outline-none"
      />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gatito">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={avatar === a}
            aria-label={`Gatito ${a}`}
            onClick={() => setAvatar(a)}
            className={`rounded-2xl border-2 p-1 ${avatar === a ? 'border-pink-500' : 'border-transparent'}`}
          >
            <Gatita avatar={a} className="h-10 w-10" label="" />
          </button>
        ))}
      </div>
      {problem && <p className="text-sm font-semibold text-red-700">{problem}</p>}
      <Button type="submit" disabled={disabled}>
        Crear
      </Button>
    </form>
  );
}
