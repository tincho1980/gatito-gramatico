// La ronda: turno por turno, feedback y resultados. Mundo y parada vienen en la URL
// (`/ronda?mundo=2&parada=3`; la parada 5 es el jefe). Al terminar se guarda en Dexie y se
// aplica `applyRound`.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  canPlayStop,
  CONFIG,
  currentStop,
  isBossEnabled,
  stopAction,
  summarizeRound,
  type PlayAction,
  type ProfileState,
  type RoundSummary,
  type Stop,
} from '@gatita/shared';
import { saveRound } from '../../db/repos.ts';
import { reactTo } from '../../lib/feedback.ts';
import { useWords, type LoadedWords } from '../../words/words.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { Feedback } from '../turn/Feedback.tsx';
import { Turn } from '../turn/Turn.tsx';
import { BossResult } from './BossResult.tsx';
import { actionPath, parseRoundParams } from './paths.ts';
import { Results } from './Results.tsx';
import { position, toRound, tonicaAnswered } from './session.ts';
import { useRoundStore } from './store.ts';

interface Outcome {
  summary: RoundSummary;
  after: ProfileState;
  stopCompleted: boolean;
  bossWon: boolean;
  next: PlayAction;
}

export function RoundPage() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const target = parseRoundParams(params);
  if (!target) return <Navigate to="/mapa" replace />;
  // Una ronda nueva por cada URL.
  return <Round key={search} world={target.world} stop={target.stop} />;
}

function Round({ world, stop }: { world: number; stop: Stop }) {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const storedState = useProfileState(profile?.id);
  const { words, error } = useWords();
  const { session, start, answer, next, clear } = useRoundStore();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const saving = useRef(false);
  const kind = stop === 5 ? 'boss' : 'practice';

  const playable = useCallback(
    (state: ProfileState, w: LoadedWords) =>
      canPlayStop(state.worlds[world], world, stop) &&
      (kind === 'practice' || isBossEnabled(state, world, w.index.byWorld.get(world) ?? [])),
    [world, stop, kind],
  );

  // Arranca la ronda al entrar (una sola vez).
  useEffect(() => {
    if (session || outcome || !storedState || !words || !playable(storedState, words)) return;
    saving.current = false;
    start({
      id: crypto.randomUUID(),
      state: storedState,
      words: words.index,
      world,
      stop,
      kind,
      startedAt: new Date().toISOString(),
    });
  }, [session, outcome, storedState, words, playable, start, world, stop, kind]);

  // Al terminar: guardar y mostrar resultados.
  useEffect(() => {
    if (session?.phase !== 'finished' || !profile || !words || saving.current) return;
    saving.current = true;
    const round = toRound(session, {
      finishedAt: new Date().toISOString(),
      tzOffsetMin: -new Date().getTimezoneOffset(),
      wordsVersion: words.version,
    });
    void saveRound(profile.id, round, words.index).then(({ before, after }) => {
      const progress = after.worlds[world];
      setOutcome({
        summary: summarizeRound(before, after, round, words.index),
        after,
        stopCompleted:
          !before.worlds[world]?.stopsDone.includes(stop) && !!progress?.stopsDone.includes(stop),
        bossWon:
          kind === 'boss' &&
          (progress?.bossBest ?? null) !== null &&
          round.turns.filter((t) => t.full).length >= CONFIG.bossWin,
        next:
          progress?.bossBest !== null && progress?.bossBest !== undefined
            ? { kind: 'map' }
            : stopAction(after, world, currentStop(progress, world), words.index),
      });
      clear();
    });
  }, [session, profile, words, clear, world, stop, kind]);

  // Si se sale a mitad de ronda, la ronda se descarta.
  useEffect(() => () => useRoundStore.getState().clear(), []);

  if (error) return <Centered>{error}</Centered>;
  if (!profile || !storedState || !words) return <Centered>Cargando…</Centered>;
  if (!session && !outcome && !playable(storedState, words)) {
    return <Navigate to={`/mundo/${world}`} replace />;
  }

  if (outcome) {
    if (kind === 'boss') {
      return (
        <BossResult
          won={outcome.bossWon}
          summary={outcome.summary}
          stars={outcome.after.worlds[world]?.stars ?? 0}
          avatar={profile.avatar}
          sound={profile.sound}
          onMap={() => navigate('/mapa')}
          onPractice={() => navigate(actionPath(stopAction(outcome.after, world, 4, words.index)))}
          onWorld={() => navigate(`/mundo/${world}`)}
        />
      );
    }
    return (
      <Results
        summary={outcome.summary}
        stopCompleted={outcome.stopCompleted}
        avatar={profile.avatar}
        sound={profile.sound}
        onNext={() => navigate(actionPath(outcome.next))}
        onWorld={() => navigate(`/mundo/${world}`)}
      />
    );
  }

  if (!session?.current) return <Centered>Cargando…</Centered>;
  const { done, total } = position(session);
  const step = session.steps[session.stepIndex];

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="flex shrink-0 items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={() => navigate(`/mundo/${world}`)}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-gray-500"
          aria-label="Salir de la ronda"
        >
          ✕
        </button>
        <div
          className={`h-3 flex-1 overflow-hidden rounded-full ${kind === 'boss' ? 'bg-violet-100' : 'bg-pink-100'}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={kind === 'boss' ? 'Avance contra el jefe' : 'Avance de la ronda'}
        >
          <div
            className={`h-full rounded-full transition-all ${kind === 'boss' ? 'bg-violet-500' : 'bg-pink-500'}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <span className="w-12 text-right text-sm font-bold text-gray-500">
          {Math.min(done + 1, total)}/{total}
        </span>
      </header>
      {kind === 'boss' && done === 0 && session.phase === 'step' && session.stepIndex === 0 && (
        <p className="mx-4 rounded-2xl bg-violet-100 px-3 py-2 text-center text-sm font-bold text-violet-800">
          ¡Ronda del jefe! Necesitás {CONFIG.bossWin} de 10.
        </p>
      )}

      {session.phase === 'feedback' && session.lastTurn ? (
        <Feedback
          word={session.current.word}
          turn={session.lastTurn}
          avatar={profile.avatar}
          sound={profile.sound}
          onNext={() => {
            reactTo('click', profile.sound);
            next();
          }}
        />
      ) : step ? (
        <Turn
          key={`${session.current.word.id}-${step}`}
          word={session.current.word}
          step={step}
          roundWorld={session.world}
          hinted={session.current.hinted}
          markStress={session.current.hinted || session.answers.tonica !== undefined}
          tonicaOk={session.current.hinted ? null : tonicaAnswered(session)}
          onAnswer={(v) => answer(v)}
        />
      ) : null}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center font-bold text-gray-600">
      {children}
    </main>
  );
}
