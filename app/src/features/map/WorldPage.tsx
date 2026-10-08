// Pantalla de un mundo (§7.2): sus paradas en orden, cuáles están hechas, cuál sigue y
// cuánto falta para el jefe (§6.2).
import { Link, Navigate, useParams } from 'react-router';
import {
  bossGateStatus,
  CONFIG,
  canPlayStop,
  currentStop,
  isBossEnabled,
  RULE_NAMES,
  stopAction,
  stopsOf,
  WORLDS,
  type RuleGate,
  type Stop,
} from '@gatita/shared';
import { Stars } from '../../components/Stars.tsx';
import { worldLook } from '../../content/worlds.ts';
import { useWords } from '../../words/words.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { actionPath } from '../round/paths.ts';

const STOP_NAMES: Record<Stop, { name: string; detail: string }> = {
  1: { name: 'Lección', detail: 'La regla, ejemplos y práctica guiada' },
  2: { name: 'Práctica', detail: `Palabras fáciles · ${CONFIG.stopPass[2]} de 10 para pasar` },
  3: { name: 'Práctica +', detail: `Palabras medianas · ${CONFIG.stopPass[3]} de 10 para pasar` },
  4: { name: 'Desafío', detail: `Palabras difíciles · ${CONFIG.stopPass[4]} de 10 para pasar` },
  5: { name: 'Jefe', detail: `${CONFIG.bossWin} de 10 para ganar` },
};

export function WorldPage() {
  const id = Number(useParams().id);
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const { words } = useWords();
  const world = WORLDS.find((w) => w.id === id);

  if (!world) return <Navigate to="/mapa" replace />;
  if (!state || !words) return null;
  const progress = state.worlds[id];
  if (!progress?.unlocked) return <Navigate to="/mapa" replace />;

  const look = worldLook(id);
  const next = currentStop(progress, id);
  const worldWords = words.index.byWorld.get(id) ?? [];
  const bossEnabled = isBossEnabled(state, id, worldWords);
  const gate = bossGateStatus(state, id, worldWords);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-6 pb-safe">
      <Link
        to="/mapa"
        className="-my-3 flex min-h-12 items-center self-start pr-3 font-bold text-pink-600"
      >
        ← El camino
      </Link>
      <header className="flex items-center gap-3">
        <span
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-4xl ${look.bg}`}
          aria-hidden
        >
          {look.icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-500">
            Mundo {id} · {world.topic}
          </p>
          <h1 className="font-heading text-2xl leading-tight font-bold text-gray-800">
            {world.name}
          </h1>
          {progress.bossBest !== null && <Stars count={progress.stars} className="text-xl" />}
        </div>
      </header>

      <ol className="flex flex-col gap-2" aria-label="Paradas">
        {stopsOf(id).map((stop) => {
          const done = progress.stopsDone.includes(stop);
          const playable = canPlayStop(progress, id, stop);
          const isNext = stop === next && progress.bossBest === null;
          const action = stopAction(state, id, stop, words.index);
          const blockedBoss = stop === 5 && playable && !bossEnabled;
          return (
            <li key={stop}>
              <StopCard
                title={STOP_NAMES[stop].name}
                detail={STOP_NAMES[stop].detail}
                state={done ? 'done' : !playable ? 'locked' : isNext ? 'next' : 'open'}
                to={playable && !blockedBoss ? actionPath(action) : undefined}
              />
            </li>
          );
        })}
      </ol>

      {canPlayStop(progress, id, 5) && !bossEnabled && progress.bossBest === null && (
        <section className="rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="gate-title">
          <h2 id="gate-title" className="font-heading text-lg font-bold text-gray-800">
            Para desafiar al jefe
          </h2>
          <p className="mb-3 text-sm text-gray-600">
            Seguí practicando hasta que estas reglas te salgan casi siempre bien.
          </p>
          <ul className="flex flex-col gap-3">
            {gate.map((r) => (
              <li key={r.rule}>
                <div className="flex justify-between text-sm font-semibold text-gray-700">
                  <span>{RULE_NAMES[r.rule]}</span>
                  <span>{gateLabel(r)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-pink-100">
                  <div
                    className={`h-full rounded-full ${r.ready ? 'bg-green-500' : 'bg-pink-400'}`}
                    style={{ width: `${gateProgress(r) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Link
            to={actionPath(stopAction(state, id, 5, words.index))}
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-pink-100 font-bold text-pink-700"
          >
            Practicar
          </Link>
        </section>
      )}
    </main>
  );
}

const { window: WINDOW, minAccuracy, minEma } = CONFIG.bossGate;

function gateLabel(r: RuleGate): string {
  if (r.ready) return '¡Lista!';
  if (r.attempts < WINDOW) return `${r.attempts} de ${WINDOW} intentos`;
  return `${Math.round(r.accuracy * 100)} % de ${Math.round(minAccuracy * 100)} %`;
}

/** Avance aproximado: intentos jugados y qué tan cerca está del dominio pedido. */
function gateProgress(r: RuleGate): number {
  if (r.ready) return 1;
  const skill = r.attempts < WINDOW ? r.ema / minEma : r.accuracy / minAccuracy;
  return Math.min(1, r.attempts / WINDOW) * Math.min(1, skill);
}

type StopState = 'done' | 'next' | 'open' | 'locked';

function StopCard({
  title,
  detail,
  state,
  to,
}: {
  title: string;
  detail: string;
  state: StopState;
  to?: string;
}) {
  const badge = { done: '✓', next: '▶', open: '↻', locked: '🔒' }[state];
  const content = (
    <div
      className={`flex min-h-16 items-center gap-3 rounded-2xl p-3 shadow-sm ${state === 'next' ? 'bg-pink-500 text-white' : 'bg-white text-gray-800'} ${state === 'locked' ? 'opacity-50' : ''}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${state === 'next' ? 'bg-white/25' : state === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
        aria-hidden
      >
        {badge}
      </span>
      <span className="flex flex-col">
        <span className="font-heading text-lg font-bold">{title}</span>
        <span className={`text-sm ${state === 'next' ? 'text-white/90' : 'text-gray-500'}`}>
          {detail}
        </span>
      </span>
    </div>
  );
  const label = `${title}, ${{ done: 'completa', next: 'la que sigue', open: 'disponible', locked: 'bloqueada' }[state]}`;
  return to ? (
    <Link to={to} aria-label={label} className="block">
      {content}
    </Link>
  ) : (
    <div aria-label={label} aria-disabled>
      {content}
    </div>
  );
}
