// La ronda: turno por turno, feedback y resultados. Al terminar se guarda en Dexie y se aplica
// `applyRound` (el estado queda listo aunque se recargue la página).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { summarizeRound, type ProfileState, type RoundSummary } from '@gatita/shared';
import { saveRound } from '../../db/repos.ts';
import { reactTo } from '../../lib/feedback.ts';
import { useWords } from '../../words/words.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { Feedback } from '../turn/Feedback.tsx';
import { Turn } from '../turn/Turn.tsx';
import { Results } from './Results.tsx';
import { position, toRound, tonicaAnswered } from './session.ts';
import { useRoundStore } from './store.ts';
import { STAGE3_OPEN_WORLDS, STAGE3_TARGET } from './target.ts';

export function RoundPage() {
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const storedState = useProfileState(profile?.id);
  const { words, error } = useWords();
  const { session, start, answer, next, clear } = useRoundStore();
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const saving = useRef(false);

  const begin = useCallback(
    (state: ProfileState) => {
      if (!words) return;
      saving.current = false;
      start({
        id: crypto.randomUUID(),
        state,
        words: words.index,
        ...STAGE3_TARGET,
        kind: 'practice',
        startedAt: new Date().toISOString(),
      });
    },
    [words, start],
  );

  // Arranca una ronda al entrar.
  useEffect(() => {
    if (!session && !summary && storedState && words) begin(storedState);
  }, [session, summary, storedState, words, begin]);

  // Al terminar: guardar y mostrar resultados.
  useEffect(() => {
    if (session?.phase !== 'finished' || !profile || !words || saving.current) return;
    saving.current = true;
    const round = toRound(session, {
      finishedAt: new Date().toISOString(),
      tzOffsetMin: -new Date().getTimezoneOffset(),
      wordsVersion: words.version,
    });
    void saveRound(profile.id, round, words.index, { teacherUnlocks: STAGE3_OPEN_WORLDS }).then(
      ({ before, after }) => {
        setSummary(summarizeRound(before, after, round, words.index));
        clear();
      },
    );
  }, [session, profile, words, clear]);

  // Si se sale a mitad de ronda, la ronda se descarta.
  useEffect(() => () => useRoundStore.getState().clear(), []);

  if (error) return <Centered>{error}</Centered>;
  if (!profile || !storedState || !words) return <Centered>Cargando…</Centered>;

  if (summary) {
    return (
      <Results
        summary={summary}
        avatar={profile.avatar}
        sound={profile.sound}
        onAgain={() => setSummary(null)}
        onHome={() => navigate('/')}
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
          onClick={() => navigate('/')}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl text-gray-500"
          aria-label="Salir de la ronda"
        >
          ✕
        </button>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-pink-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Avance de la ronda"
        >
          <div
            className="h-full rounded-full bg-pink-500 transition-all"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <span className="w-12 text-right text-sm font-bold text-gray-500">
          {Math.min(done + 1, total)}/{total}
        </span>
      </header>

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
