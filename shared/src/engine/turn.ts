// El turno (§2): qué pasos tiene cada palabra y cómo se evalúa.
import type { WordType, WordEntry } from '../schemas.ts';
import type { Step, StepResult, TurnResult } from './types.ts';

/** §2.1 Pasos según la palabra. */
export function stepsFor(word: WordEntry): Step[] {
  if (word.sentence) return ['tilde'];
  if (word.world === 1) return ['tonica'];
  // En monosílabos no hay tónica que elegir ni tipo: solo la tilde.
  if (word.type === 'monosilaba') return ['tilde'];
  return ['tonica', 'tipo', 'tilde'];
}

/** §2.1 Opciones del paso `tipo`: sobreesdrújula aparece desde el mundo 4. */
export function typeOptions(word: WordEntry, roundWorld: number): WordType[] {
  const base: WordType[] = ['aguda', 'grave', 'esdrujula'];
  return Math.max(word.world, roundWorld) >= 4 ? [...base, 'sobreesdrujula'] : base;
}

export interface TurnAnswers {
  /** Índice de la sílaba tocada. */
  tonica?: number;
  tipo?: WordType;
  tilde?: boolean;
}

export interface TurnOptions {
  hinted?: boolean;
  challenge?: boolean;
  ms: number;
}

/** §2.2 Resultado del turno. Un paso sin respuesta cuenta como incorrecto. */
export function evaluateTurn(
  word: WordEntry,
  answers: TurnAnswers,
  { hinted = false, challenge = false, ms }: TurnOptions,
): TurnResult {
  // Con pista, la tónica ya está resuelta y no cuenta.
  const steps = stepsFor(word).filter((s) => !(hinted && s === 'tonica'));
  const results: StepResult[] = steps.map((step) => ({
    step,
    correct: isStepCorrect(word, step, answers),
  }));
  return {
    wordId: word.id,
    steps: results,
    full: !hinted && results.every((r) => r.correct),
    hinted,
    challenge,
    ms,
  };
}

export function isStepCorrect(word: WordEntry, step: Step, answers: TurnAnswers): boolean {
  switch (step) {
    case 'tonica':
      return answers.tonica === word.stressIndex;
    case 'tipo':
      return answers.tipo === word.type;
    case 'tilde':
      return answers.tilde === word.hasTilde;
  }
}

/** La palabra sin tildes, como se muestra antes de responder. */
export const withoutTildes = (text: string): string =>
  text.normalize('NFD').replace(/[́]/g, '').normalize('NFC');
