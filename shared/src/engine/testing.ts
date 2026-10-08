// Ayudas para tests: banco real, palabras de ejemplo y un chico simulado que juega rondas.
// No se exporta desde el índice del paquete.
import type { WordEntry } from '../schemas.ts';
import w01 from '../../../words/bank/world-01.json' with { type: 'json' };
import w02 from '../../../words/bank/world-02.json' with { type: 'json' };
import w03 from '../../../words/bank/world-03.json' with { type: 'json' };
import w04 from '../../../words/bank/world-04.json' with { type: 'json' };
import w05 from '../../../words/bank/world-05.json' with { type: 'json' };
import w06 from '../../../words/bank/world-06.json' with { type: 'json' };
import w07 from '../../../words/bank/world-07.json' with { type: 'json' };
import w08 from '../../../words/bank/world-08.json' with { type: 'json' };
import w09 from '../../../words/bank/world-09.json' with { type: 'json' };
import w10 from '../../../words/bank/world-10.json' with { type: 'json' };
import { CONFIG, type Config } from './config.ts';
import { addDays } from './dates.ts';
import { isBossEnabled } from './mastery.ts';
import { createRng, type Rng } from './rng.ts';
import {
  buildBossRound,
  buildRound,
  nextWord,
  recordTurn,
  startRound,
  type PlannedWord,
} from './round.ts';
import { applyRound, indexWords, initialState } from './state.ts';
import { evaluateTurn, type TurnAnswers } from './turn.ts';
import type { ProfileState, Round, Stop, TurnResult, WordIndex } from './types.ts';
import { currentStop, requiredStopsBeforeBoss } from './worlds.ts';

export const BANK: WordEntry[] = [w01, w02, w03, w04, w05, w06, w07, w08, w09, w10].flatMap(
  (f) => f.words as WordEntry[],
);
export const WORDS: WordIndex = indexWords(BANK);

/** Palabra de ejemplo con valores razonables; se pisan los campos que importan. */
export function word(overrides: Partial<WordEntry> = {}): WordEntry {
  return {
    id: overrides.word ?? 'casa',
    word: 'casa',
    syllables: ['ca', 'sa'],
    stressIndex: 0,
    type: 'grave',
    hasTilde: false,
    rule: 'grave_n_s_vocal',
    world: 3,
    tier: 1,
    distractor: 'cása',
    sentence: null,
    tags: [],
    features: [],
    related: null,
    freq: 5,
    ...overrides,
  };
}

export function turn(overrides: Partial<TurnResult> = {}): TurnResult {
  const full = overrides.full ?? true;
  return {
    wordId: 'casa',
    steps: [{ step: 'tilde', correct: full }],
    full,
    hinted: false,
    challenge: false,
    ms: 3000,
    ...overrides,
  };
}

export function round(overrides: Partial<Round> = {}): Round {
  return {
    id: 'r1',
    world: 1,
    stop: 2,
    kind: 'practice',
    startedAt: '2026-03-02T14:00:00.000Z',
    finishedAt: '2026-03-02T14:05:00.000Z',
    tzOffsetMin: -180,
    wordsVersion: 'test',
    turns: [],
    ...overrides,
  };
}

/** Respuestas correctas para una palabra. */
export const correctAnswers = (w: WordEntry): TurnAnswers => ({
  tonica: w.stressIndex,
  tipo: w.type,
  tilde: w.hasTilde,
});

/** Respuestas todas incorrectas. */
export const wrongAnswers = (w: WordEntry): TurnAnswers => ({
  tonica: w.stressIndex === 0 ? 1 : 0,
  tipo: w.type === 'aguda' ? 'grave' : 'aguda',
  tilde: !w.hasTilde,
});

export interface Player {
  /** Responde una palabra planeada. */
  answer(planned: PlannedWord, rng: Rng): TurnAnswers;
}

export const perfectPlayer: Player = { answer: (p) => correctAnswers(p.word) };

/** Acierta el turno completo con probabilidad `p`. */
export const randomPlayer = (p: number): Player => ({
  answer: (planned, rng) => (rng() < p ? correctAnswers(planned.word) : wrongAnswers(planned.word)),
});

/** Juega una ronda completa con el armado y el ajuste del motor. */
export function playRound(opts: {
  state: ProfileState;
  world: number;
  stop: Stop;
  kind: 'practice' | 'boss';
  player: Player;
  rng: Rng;
  id: string;
  finishedAt: string;
  config?: Config;
}): Round {
  const { state, world, stop, kind, player, rng, config = CONFIG } = opts;
  const ctx = { state, words: WORDS, world, stop, rng, now: opts.finishedAt, config };
  const planned = kind === 'boss' ? buildBossRound(ctx) : buildRound(ctx);
  let progress = startRound(kind, world, stop, planned);
  for (;;) {
    const step = nextWord(progress, { state, words: WORDS, rng, config });
    progress = step.progress;
    if (!step.next) break;
    const t = evaluateTurn(step.next.word, player.answer(step.next, rng), {
      hinted: step.next.hinted,
      challenge: step.next.slot === 'challenge',
      ms: 4000,
    });
    progress = recordTurn(progress, t);
  }
  return {
    id: opts.id,
    world,
    stop,
    kind,
    startedAt: opts.finishedAt,
    finishedAt: opts.finishedAt,
    tzOffsetMin: -180,
    wordsVersion: 'test',
    turns: progress.turns,
  };
}

export interface SimulationResult {
  state: ProfileState;
  rounds: Round[];
  /** Ronda (1-based) en la que se venció a cada jefe. */
  bossBeatenAt: Record<number, number>;
  bossEverEnabled: boolean;
}

/**
 * Un chico que sigue el camino: en cada ronda juega el primer mundo abierto sin jefe vencido,
 * en su parada actual; si ya completó las paradas y el jefe no está habilitado, repite la
 * última parada de práctica. Juega 4 rondas por día.
 */
export function simulate(
  player: Player,
  { maxRounds, seed = 1, config = CONFIG }: { maxRounds: number; seed?: number; config?: Config },
): SimulationResult {
  const rng = createRng(seed);
  let state = initialState();
  const rounds: Round[] = [];
  const bossBeatenAt: Record<number, number> = {};
  let bossEverEnabled = false;
  let day = '2026-03-02';
  let played = 0;

  while (played < maxRounds) {
    const world = Object.entries(state.worlds)
      .filter(([, p]) => p.unlocked && p.bossBest === null)
      .map(([id]) => Number(id))
      .sort((a, b) => a - b)[0];
    if (world === undefined) break;
    const hour = 13 + (played % 4) * 2;
    const finishedAt = `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
    if (played % 4 === 3) day = addDays(day, 1);

    const progress = state.worlds[world];
    let stop = currentStop(progress, world, config);
    if (stop === 1) {
      // Un minuto antes de la ronda que sigue: el orden no depende de los ids.
      const l = lesson(world, new Date(Date.parse(finishedAt) - 60_000).toISOString());
      rounds.push(l);
      state = applyRound(state, l, WORDS, { config });
      continue;
    }
    const enabled = isBossEnabled(state, world, WORDS.byWorld.get(world) ?? [], config);
    bossEverEnabled ||= enabled;
    let kind: 'practice' | 'boss' = 'practice';
    if (stop === 5) {
      if (enabled) kind = 'boss';
      else stop = requiredStopsBeforeBoss(world, config).at(-1) as Stop;
    }
    const r = playRound({
      state,
      world,
      stop,
      kind,
      player,
      rng,
      id: `r${played}`,
      finishedAt,
      config,
    });
    rounds.push(r);
    state = applyRound(state, r, WORDS, { config });
    played++;
    if (kind === 'boss' && state.worlds[world]?.bossBest !== null) bossBeatenAt[world] = played;
  }
  return { state, rounds, bossBeatenAt, bossEverEnabled };
}

function lesson(world: number, at: string): Round {
  return round({
    id: `lesson-${world}`,
    world,
    stop: 1,
    kind: 'lesson',
    startedAt: at,
    finishedAt: at,
  });
}
