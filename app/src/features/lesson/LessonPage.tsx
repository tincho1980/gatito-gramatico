// Lección (parada 1, §4.2): la regla, 3 ejemplos y 3 turnos de práctica guiada. Se guarda
// como ronda `lesson`: completa la parada y no cambia cajas, EMA ni XP.
import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import {
  evaluateTurn,
  ruleText,
  stepsFor,
  type Step,
  type TurnAnswers,
  type TurnResult,
  type WordEntry,
} from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { LESSONS } from '../../content/lessons/index.ts';
import { worldLook } from '../../content/worlds.ts';
import { saveRound } from '../../db/repos.ts';
import { reactTo } from '../../lib/feedback.ts';
import { useWords } from '../../words/words.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';
import { roundPath } from '../round/paths.ts';
import { Feedback } from '../turn/Feedback.tsx';
import { Turn } from '../turn/Turn.tsx';

type Phase =
  | { kind: 'rule' }
  | { kind: 'turn'; index: number; stepIndex: number; answers: TurnAnswers; startedAt: number }
  | { kind: 'feedback'; index: number; turn: TurnResult }
  | { kind: 'done' };

export function LessonPage() {
  const world = Number(useParams().id);
  const navigate = useNavigate();
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const { words } = useWords();
  const lesson = LESSONS[world];
  const [phase, setPhase] = useState<Phase>({ kind: 'rule' });
  const turns = useRef<TurnResult[]>([]);
  const startedAt = useRef(new Date().toISOString());
  const saving = useRef(false);

  const entries = useMemo(() => {
    const get = (id: string) => words?.index.byId.get(id);
    return {
      examples: (lesson?.examples.map(get) ?? []).filter((w): w is WordEntry => !!w),
      practice: (lesson?.practice.map(get) ?? []).filter((w): w is WordEntry => !!w),
    };
  }, [words, lesson]);

  if (!lesson) return <Navigate to="/mapa" replace />;
  if (!profile || !state || !words) return null;
  if (!state.worlds[world]?.unlocked) return <Navigate to="/mapa" replace />;
  const look = worldLook(world);

  const finish = async () => {
    if (saving.current) return; // un doble toque en "Seguir" no guarda dos veces
    saving.current = true;
    const now = new Date();
    await saveRound(
      profile.id,
      {
        id: crypto.randomUUID(),
        world,
        stop: 1,
        kind: 'lesson',
        startedAt: startedAt.current,
        finishedAt: now.toISOString(),
        tzOffsetMin: -now.getTimezoneOffset(),
        wordsVersion: words.version,
        turns: turns.current,
      },
      words.index,
    );
    setPhase({ kind: 'done' });
  };

  if (phase.kind === 'rule') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-6">
        <Link to={`/mundo/${world}`} className="self-start font-bold text-pink-600">
          ← Volver
        </Link>
        <header className="flex items-center gap-3">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl ${look.bg}`}
            aria-hidden
          >
            {look.icon}
          </span>
          <h1 className="font-heading text-2xl font-bold text-gray-800">{lesson.title}</h1>
        </header>
        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-lg text-gray-700 shadow-sm">
          {lesson.rule.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
        <section aria-labelledby="ejemplos" className="flex flex-col gap-2">
          <h2 id="ejemplos" className="font-heading text-lg font-bold text-gray-700">
            Ejemplos
          </h2>
          {entries.examples.map((w) => (
            <Example key={w.id} word={w} />
          ))}
        </section>
        <Button
          size="lg"
          className="mt-auto min-h-14 w-full"
          onClick={() =>
            setPhase({
              kind: 'turn',
              index: 0,
              stepIndex: 0,
              answers: {},
              startedAt: performance.now(),
            })
          }
        >
          Practicar
        </Button>
      </main>
    );
  }

  if (phase.kind === 'done') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <Gatita avatar={profile.avatar} mood="success" className="h-32 w-32" />
        <h1 className="font-heading text-3xl font-bold text-pink-600">¡Lección lista!</h1>
        <p className="text-gray-600">Ahora a practicar con palabras de este mundo.</p>
        <Button size="lg" className="min-h-14 w-full" onClick={() => navigate(roundPath(world, 2))}>
          Ir a la práctica
        </Button>
        <Link to={`/mundo/${world}`} className="font-bold text-pink-600">
          Volver al mundo
        </Link>
      </main>
    );
  }

  const word = entries.practice[phase.index];
  if (!word) return null;
  const steps: Step[] = stepsFor(word);

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="flex shrink-0 items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link
          to={`/mundo/${world}`}
          className="flex h-12 w-12 items-center justify-center text-2xl text-gray-500"
          aria-label="Salir de la lección"
        >
          ✕
        </Link>
        <span className="text-sm font-bold text-gray-500">
          Práctica guiada {phase.index + 1} de {entries.practice.length}
        </span>
        <span className="w-12" />
      </header>
      {phase.kind === 'feedback' ? (
        <Feedback
          word={word}
          turn={phase.turn}
          avatar={profile.avatar}
          sound={profile.sound}
          onNext={() => {
            reactTo('click', profile.sound);
            const index = phase.index + 1;
            if (index < entries.practice.length) {
              setPhase({
                kind: 'turn',
                index,
                stepIndex: 0,
                answers: {},
                startedAt: performance.now(),
              });
            } else {
              void finish();
            }
          }}
        />
      ) : (
        <>
          <p className="mx-4 rounded-2xl bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-900">
            {lesson.rule.at(-1)}
          </p>
          <Turn
            key={`${word.id}-${phase.stepIndex}`}
            word={word}
            step={steps[phase.stepIndex]!}
            roundWorld={world}
            hinted={false}
            markStress={phase.answers.tonica !== undefined}
            tonicaOk={
              phase.answers.tonica === undefined ? null : phase.answers.tonica === word.stressIndex
            }
            onAnswer={(value) => {
              const step = steps[phase.stepIndex]!;
              const answers = { ...phase.answers, [step]: value };
              if (phase.stepIndex + 1 < steps.length) {
                setPhase({ ...phase, stepIndex: phase.stepIndex + 1, answers });
                return;
              }
              const ms = Math.min(
                600_000,
                Math.max(300, Math.round(performance.now() - phase.startedAt)),
              );
              const turn = evaluateTurn(word, answers, { ms });
              turns.current.push(turn);
              setPhase({ kind: 'feedback', index: phase.index, turn });
            }}
          />
        </>
      )}
    </main>
  );
}

function Example({ word }: { word: WordEntry }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      {word.sentence ? (
        <p className="text-lg text-gray-800">
          {word.sentence.split(/(\[[^\]]+\])/).map((part, i) =>
            part.startsWith('[') ? (
              <strong key={i} className="text-pink-600">
                {part.slice(1, -1)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
      ) : (
        <p className="font-heading text-2xl font-bold text-gray-800">
          {word.syllables.map((s, i) => (
            <span key={i} className={i === word.stressIndex ? 'text-pink-600' : ''}>
              {i > 0 && <span className="text-gray-300">·</span>}
              {s}
            </span>
          ))}
        </p>
      )}
      <p className="text-sm text-gray-600">
        {/* El mundo 1 enseña solo la sílaba fuerte: la tilde llega después. */}
        {word.world === 1
          ? `La sílaba que suena más fuerte es «${word.syllables[word.stressIndex]}».`
          : ruleText(word)}
      </p>
    </div>
  );
}
