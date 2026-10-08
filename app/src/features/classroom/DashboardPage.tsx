// Tablero docente (/aula/:id): por mundo, una fila por alumno y una columna por regla con su
// dominio (color + texto), el promedio del curso, la regla para repasar, el mundo actual y la
// última actividad. Tocar un alumno abre su vista. Desde acá se abre un mundo para el aula.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  gateRules,
  RULE_NAMES,
  ruleKey,
  WORLDS,
  type DashboardResponse,
  type DashboardStudent,
} from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';
import { Stars } from '../../components/Stars.tsx';
import { initAdultAuth, useAdultAuth } from '../../auth/adult.ts';
import { adultApi } from '../../sync/api.ts';
import { useWords } from '../../words/words.ts';
import { isAvatar } from '@gatita/shared';
import {
  commonWorld,
  lastActivityText,
  LEVELS,
  levelOf,
  ruleSummaries,
  ruleToReview,
} from './dashboard.ts';

const pct = (x: number) => `${Math.round(x * 100)} %`;

export function DashboardPage() {
  const { id = '' } = useParams();
  const { status, session } = useAdultAuth();
  const { words } = useWords();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [world, setWorld] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void initAdultAuth();
  }, []);

  const refresh = useCallback(() => {
    if (!session) return;
    adultApi(session.token)
      .dashboard(id)
      .then(setData)
      .catch(() => setError('No pudimos traer el tablero de esta aula.'));
  }, [session, id]);
  useEffect(refresh, [refresh]);

  const shownWorld = world ?? (data ? commonWorld(data.students) : 1);
  const rules = useMemo(
    () => (words ? gateRules(words.index.byWorld.get(shownWorld) ?? []) : []),
    [words, shownWorld],
  );
  const summaries = useMemo(
    () => (data ? ruleSummaries(data.students, shownWorld, rules) : []),
    [data, shownWorld, rules],
  );
  const review = ruleToReview(summaries);

  if (status === 'out') {
    return (
      <Shell title="Tablero">
        <p className="text-gray-700">
          Para ver el tablero,{' '}
          <Link to="/adultos" className="font-bold text-pink-600 underline">
            entrá como docente
          </Link>
          .
        </p>
      </Shell>
    );
  }
  if (error)
    return (
      <Shell title="Tablero">
        <p role="alert" className="text-red-700">
          {error}
        </p>
      </Shell>
    );
  if (!data || !words)
    return (
      <Shell title="Tablero">
        <p className="text-gray-600">Cargando…</p>
      </Shell>
    );

  const student = data.students.find((s) => s.id === selected);
  const worldInfo = WORLDS.find((w) => w.id === shownWorld);

  return (
    <Shell title={data.classroom.name}>
      <p className="-mt-3 text-sm text-gray-600">
        Código <strong className="tracking-widest">{data.classroom.code}</strong> ·{' '}
        {data.students.length === 1 ? '1 alumno' : `${data.students.length} alumnos`}
      </p>

      {data.students.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-gray-700 shadow-sm">
          Todavía no entró nadie. Compartí el código <strong>{data.classroom.code}</strong>: cada
          alumno lo escribe en <strong>Entrar a mi aula</strong>.
        </p>
      ) : (
        <>
          <label className="grid min-w-0 gap-1">
            <span className="font-bold text-gray-700">Mundo</span>
            <select
              value={shownWorld}
              onChange={(e) => setWorld(Number(e.target.value))}
              className="min-h-12 w-full min-w-0 rounded-2xl border-2 border-pink-200 bg-white px-3 text-lg"
            >
              {WORLDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id}. {w.name} ({w.topic})
                </option>
              ))}
            </select>
          </label>

          <p className="rounded-2xl bg-white px-4 py-3 text-gray-800 shadow-sm" role="status">
            {review ? (
              <>
                Para repasar con el curso: <strong>{RULE_NAMES[review.rule]}</strong> (promedio{' '}
                {pct(review.average!)}, {review.played} de {data.students.length} la jugaron).
              </>
            ) : summaries.some((s) => s.played > 0) ? (
              <>En {worldInfo?.name}, el curso domina todas las reglas que jugó.</>
            ) : (
              <>Nadie jugó todavía {worldInfo?.name}.</>
            )}
          </p>

          <div className="w-full min-w-0 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-max border-collapse text-sm">
              <caption className="sr-only">
                Dominio de cada regla de {worldInfo?.name} por alumno
              </caption>
              <thead>
                <tr className="text-left text-gray-600">
                  <th scope="col" className="sticky left-0 bg-white px-3 py-2">
                    Alumno
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Mundo
                  </th>
                  {rules.map((r) => (
                    <th key={r} scope="col" className="max-w-40 px-3 py-2 font-semibold">
                      {RULE_NAMES[r]}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2">
                    Última vez
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <th scope="row" className="sticky left-0 bg-white px-3 py-2 text-left">
                      <button
                        type="button"
                        onClick={() => setSelected(s.id === selected ? null : s.id)}
                        className="min-h-11 font-bold text-pink-700 underline"
                      >
                        {s.alias}
                      </button>
                    </th>
                    <td className="px-3 py-2 text-gray-700">{s.world}</td>
                    {rules.map((r) => {
                      const m = s.rules[ruleKey(shownWorld, r)];
                      const level = levelOf(m && m.attempts > 0 ? m.ema : undefined);
                      return (
                        <td key={r} className={`px-3 py-2 ${LEVELS[level].cell}`}>
                          <span className="block font-bold">{m ? pct(m.ema) : '—'}</span>
                          <span className="text-xs">{LEVELS[level].label}</span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-gray-700">
                      {lastActivityText(s.lastActivity, new Date())}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <th
                    scope="row"
                    className="sticky left-0 bg-white px-3 py-2 text-left text-gray-700"
                  >
                    Promedio
                  </th>
                  <td />
                  {summaries.map((s) => {
                    const level = levelOf(s.average);
                    return (
                      <td key={s.rule} className={`px-3 py-2 ${LEVELS[level].cell}`}>
                        {s.average === undefined ? '—' : pct(s.average)}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            {(['good', 'ok', 'low', 'none'] as const).map((l) => (
              <span key={l} className={`mr-2 inline-block rounded px-2 py-0.5 ${LEVELS[l].cell}`}>
                {LEVELS[l].label}
              </span>
            ))}
            El jefe de cada mundo se habilita cuando todas sus reglas están en "Domina".
          </p>

          {student && <StudentView student={student} />}
        </>
      )}

      <Unlocks
        unlocks={data.classroom.unlocks}
        onUnlock={async (w) => {
          if (!session) return;
          await adultApi(session.token).unlock(id, w);
          refresh();
        }}
      />
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl min-w-0 flex-col gap-5 px-4 pt-6 pb-safe">
      <PageHeader title={title} back="/adultos" />
      {children}
    </main>
  );
}

function StudentView({ student }: { student: DashboardStudent }) {
  const played = WORLDS.filter(
    (w) =>
      (student.stars[w.id] ?? 0) > 0 ||
      Object.keys(student.rules).some((k) => k.startsWith(`${w.id}:`)),
  );
  return (
    <section aria-labelledby="alumno" className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Gatita
          avatar={isAvatar(student.avatar) ? student.avatar : 'naranja'}
          className="h-12 w-12"
          label=""
        />
        <div>
          <h2 id="alumno" className="font-heading text-xl font-bold text-gray-800">
            {student.alias}
          </h2>
          <p className="text-sm text-gray-600">
            {student.roundsPlayed} rondas · Mundo {student.world} ·{' '}
            {lastActivityText(student.lastActivity, new Date())}
          </p>
        </div>
      </div>
      {played.length === 0 && <p className="text-gray-600">Todavía no jugó.</p>}
      <ul className="grid gap-2">
        {played.map((w) => {
          const rules = Object.entries(student.rules).filter(([k]) => k.startsWith(`${w.id}:`));
          return (
            <li key={w.id} className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">
                  {w.id}. {w.name}
                </span>
                <Stars count={student.stars[w.id] ?? 0} className="text-lg" />
              </div>
              <ul className="mt-1 grid gap-1 text-sm">
                {rules.map(([k, m]) => {
                  const rule = k.split(':')[1] as keyof typeof RULE_NAMES;
                  const level = levelOf(m.attempts > 0 ? m.ema : undefined);
                  return (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-gray-700">{RULE_NAMES[rule]}</span>
                      <span className={`rounded px-2 ${LEVELS[level].cell}`}>
                        {pct(m.ema)} · {LEVELS[level].label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Unlocks({
  unlocks,
  onUnlock,
}: {
  unlocks: number[];
  onUnlock: (world: number) => Promise<void>;
}) {
  const closed = WORLDS.filter((w) => w.requires.length > 0 && !unlocks.includes(w.id));
  const [world, setWorld] = useState<number>(closed[0]?.id ?? 2);
  const [busy, setBusy] = useState(false);
  return (
    <section aria-labelledby="abrir" className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <h2 id="abrir" className="font-heading text-lg font-bold text-gray-800">
        Abrir un mundo para el aula
      </h2>
      <p className="text-sm text-gray-600">
        Los alumnos lo van a tener disponible aunque no hayan vencido al jefe anterior. No se puede
        volver a cerrar.
      </p>
      {unlocks.length > 0 && (
        <p className="text-sm text-gray-700">
          Ya abiertos: {unlocks.map((u) => WORLDS.find((w) => w.id === u)?.name).join(', ')}.
        </p>
      )}
      {closed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={world}
            onChange={(e) => setWorld(Number(e.target.value))}
            aria-label="Mundo para abrir"
            className="min-h-11 w-full min-w-0 flex-1 rounded-xl border-2 border-pink-200 bg-white px-2"
          >
            {closed.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id}. {w.name}
              </option>
            ))}
          </select>
          <Button
            disabled={busy}
            onClick={() => {
              const w = WORLDS.find((x) => x.id === world);
              if (!window.confirm(`¿Abrir ${w?.name} para todo el aula? No se puede deshacer.`))
                return;
              setBusy(true);
              void onUnlock(world).finally(() => setBusy(false));
            }}
          >
            Abrir
          </Button>
        </div>
      )}
    </section>
  );
}
