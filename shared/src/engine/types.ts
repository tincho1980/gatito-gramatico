// Tipos del motor: turnos, rondas y estado del perfil (especificación §2, §4, §5; arquitectura §4).
import type { WordEntry } from '../schemas.ts';

export type Step = 'tonica' | 'tipo' | 'tilde';

export interface StepResult {
  step: Step;
  correct: boolean;
}

/** §2.2 */
export interface TurnResult {
  wordId: string;
  steps: StepResult[];
  /** Todos los pasos correctos y sin pista. */
  full: boolean;
  /** Se mostró la pista (tónica resaltada) antes de responder (§4.3). */
  hinted: boolean;
  /** La palabra vino por el cupo de desafío (§4.1, §4.3): suma XP extra (§3). */
  challenge: boolean;
  /** Tiempo total del turno. */
  ms: number;
}

export type RoundKind = 'practice' | 'boss' | 'lesson';

/** Parada de un mundo (§7.2): 1 lección, 2 práctica, 3 práctica +, 4 desafío, 5 jefe. */
export type Stop = 1 | 2 | 3 | 4 | 5;

/** Registro fuente: todo lo demás se recalcula a partir de las rondas. */
export interface Round {
  id: string;
  world: number;
  stop: Stop;
  kind: RoundKind;
  /** ISO 8601 en UTC. */
  startedAt: string;
  finishedAt: string;
  /** Minutos a sumar a UTC para la hora del dispositivo (-Date#getTimezoneOffset()). */
  tzOffsetMin: number;
  wordsVersion: string;
  turns: TurnResult[];
}

/** Cajas de una palabra para el perfil (§5). */
export interface WordMastery {
  box: number;
  dueRound: number;
  lastRound: number;
  lastSeenAt: string;
  /** Turnos no `full` sin pista. */
  errors: number;
  /** `full` seguidos (los turnos con pista no la cortan ni la suman). */
  fullStreak: number;
  firstBox3At?: string;
  firstBox5At?: string;
}

/** EMA de una regla en un mundo (§6.1). */
export interface RuleMastery {
  ema: number;
  attempts: number;
  /** Últimos intentos (1 = `full`, 0 = no), el más reciente al final (§6.2). */
  recent: number[];
}

export interface WorldProgress {
  unlocked: boolean;
  stopsDone: Stop[];
  /** Mejor resultado contra el jefe (`full` sobre 10), si lo venció. */
  bossBest: number | null;
  stars: number;
}

export interface Streak {
  days: number;
  /** Último día con ronda, `YYYY-MM-DD` en la hora del dispositivo. */
  lastDay: string | null;
  /** Lunes de la semana en la que se usó la última siesta. */
  napWeek: string | null;
}

export interface ProfileState {
  roundsPlayed: number;
  xp: number;
  croquetas: number;
  words: Record<string, WordMastery>;
  /** Clave `mundo:regla` (ver `ruleKey`). */
  rules: Record<string, RuleMastery>;
  /** EMA al final de cada día por clave `mundo:regla`, para la insignia Remontada. */
  ruleDaily: Record<string, { day: string; ema: number }[]>;
  worlds: Record<number, WorldProgress>;
  streak: Streak;
  /** Insignia → fecha en que se ganó. */
  badges: Record<string, string>;
  /** Ítems de la colección (gatos amigos ganados, compras). */
  owned: string[];
  /** Palabras de las últimas rondas, la más reciente al final (penalización §4.1). */
  recentRounds: string[][];
  lastWorld: number;
}

/** El banco indexado para el motor. */
export interface WordIndex {
  byId: ReadonlyMap<string, WordEntry>;
  byWorld: ReadonlyMap<number, readonly WordEntry[]>;
}
