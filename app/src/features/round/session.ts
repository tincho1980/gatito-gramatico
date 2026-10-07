// La ronda en curso: qué palabra y qué paso se muestran, y cómo se arma el registro final.
// Funciones puras sobre el motor de shared/; el store de Zustand solo las envuelve.
import {
  buildBossRound,
  buildRound,
  createRng,
  evaluateTurn,
  nextWord,
  recordTurn,
  seedFrom,
  startRound,
  stepsFor,
  type PlannedWord,
  type ProfileState,
  type Rng,
  type Round,
  type RoundProgress,
  type Step,
  type Stop,
  type TurnAnswers,
  type TurnResult,
  type WordIndex,
} from '@gatita/shared';

/** Límites de `ms` que acepta el servidor (arquitectura §6). */
const MIN_MS = 300;
const MAX_MS = 600_000;

export interface Session {
  id: string;
  world: number;
  stop: Stop;
  kind: 'practice' | 'boss';
  startedAt: string;
  state: ProfileState;
  words: WordIndex;
  rng: Rng;
  progress: RoundProgress;
  current: PlannedWord | null;
  /** Pasos de la palabra actual (sin `tonica` si viene con pista). */
  steps: Step[];
  stepIndex: number;
  answers: TurnAnswers;
  /** Resultado del turno recién terminado (fase de feedback). */
  lastTurn: TurnResult | null;
  turnStartedAt: number;
  phase: 'step' | 'feedback' | 'finished';
}

export interface StartOptions {
  id: string;
  state: ProfileState;
  words: WordIndex;
  world: number;
  stop: Stop;
  kind: 'practice' | 'boss';
  /** Instante de inicio (ISO) y reloj en ms para medir los turnos. */
  startedAt: string;
  nowMs: number;
}

const stepsOf = (p: PlannedWord | null): Step[] =>
  p ? stepsFor(p.word).filter((s) => !(p.hinted && s === 'tonica')) : [];

export function createSession(o: StartOptions): Session {
  const rng = createRng(seedFrom(o.id));
  const ctx = {
    state: o.state,
    words: o.words,
    world: o.world,
    stop: o.stop,
    rng,
    now: o.startedAt,
  };
  const planned = o.kind === 'boss' ? buildBossRound(ctx) : buildRound(ctx);
  const base: Session = {
    id: o.id,
    world: o.world,
    stop: o.stop,
    kind: o.kind,
    startedAt: o.startedAt,
    state: o.state,
    words: o.words,
    rng,
    progress: startRound(o.kind, o.world, o.stop, planned),
    current: null,
    steps: [],
    stepIndex: 0,
    answers: {},
    lastTurn: null,
    turnStartedAt: o.nowMs,
    phase: 'step',
  };
  return advance(base, o.nowMs);
}

/** Pasa a la próxima palabra (o termina la ronda). */
export function advance(s: Session, nowMs: number): Session {
  const { progress, next } = nextWord(s.progress, { state: s.state, words: s.words, rng: s.rng });
  if (!next) return { ...s, progress, current: null, steps: [], phase: 'finished' };
  return {
    ...s,
    progress,
    current: next,
    steps: stepsOf(next),
    stepIndex: 0,
    answers: {},
    lastTurn: null,
    turnStartedAt: nowMs,
    phase: 'step',
  };
}

/** Registra la respuesta del paso actual; después del último, evalúa el turno. */
export function answerStep(
  s: Session,
  value: TurnAnswers[keyof TurnAnswers],
  nowMs: number,
): Session {
  const step = s.steps[s.stepIndex];
  if (!s.current || s.phase !== 'step' || !step) return s;
  const answers = { ...s.answers, [step]: value };
  if (s.stepIndex + 1 < s.steps.length) return { ...s, answers, stepIndex: s.stepIndex + 1 };

  const ms = Math.min(MAX_MS, Math.max(MIN_MS, Math.round(nowMs - s.turnStartedAt)));
  const turn = evaluateTurn(s.current.word, answers, {
    hinted: s.current.hinted,
    challenge: s.current.slot === 'challenge',
    ms,
  });
  return {
    ...s,
    answers,
    lastTurn: turn,
    progress: recordTurn(s.progress, turn),
    phase: 'feedback',
  };
}

/** ¿Acertó la tónica? (para marcarla en los pasos siguientes, §2.1). */
export const tonicaAnswered = (s: Session): boolean | null =>
  s.answers.tonica === undefined || !s.current
    ? null
    : s.answers.tonica === s.current.word.stressIndex;

/** El registro de la ronda terminada. */
export function toRound(
  s: Session,
  {
    finishedAt,
    tzOffsetMin,
    wordsVersion,
  }: { finishedAt: string; tzOffsetMin: number; wordsVersion: string },
): Round {
  return {
    id: s.id,
    world: s.world,
    stop: s.stop,
    kind: s.kind,
    startedAt: s.startedAt,
    finishedAt,
    tzOffsetMin,
    wordsVersion,
    turns: s.progress.turns,
  };
}

/** Turnos jugados y total previsto (puede crecer a 11 con el desafío extra). */
export const position = (s: Session) => ({
  done: s.progress.turns.length,
  total: s.progress.planned.length,
});
