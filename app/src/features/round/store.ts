// Estado de la ronda en curso (Zustand). La lógica está en session.ts.
import { create } from 'zustand';
import type { TurnAnswers } from '@gatita/shared';
import { advance, answerStep, createSession, type Session, type StartOptions } from './session.ts';

interface RoundStore {
  session: Session | null;
  start: (o: Omit<StartOptions, 'nowMs'>) => void;
  answer: (value: TurnAnswers[keyof TurnAnswers]) => void;
  next: () => void;
  clear: () => void;
}

export const useRoundStore = create<RoundStore>((set, get) => ({
  session: null,
  start: (o) => set({ session: createSession({ ...o, nowMs: performance.now() }) }),
  answer: (value) => {
    const s = get().session;
    if (s) set({ session: answerStep(s, value, performance.now()) });
  },
  next: () => {
    const s = get().session;
    if (s) set({ session: advance(s, performance.now()) });
  },
  clear: () => set({ session: null }),
}));
