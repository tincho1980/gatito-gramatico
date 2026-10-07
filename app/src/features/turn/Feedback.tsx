// §2.3 Feedback después del último paso: palabra bien escrita con la tónica, la regla,
// el error común si hubo error y la gatita.
import { useEffect, useMemo } from 'react';
import {
  commonErrorText,
  ruleText,
  type Avatar,
  type TurnResult,
  type WordEntry,
} from '@gatita/shared';
import { Gatita } from '../../components/Gatita.tsx';
import { Button } from '../../components/Button.tsx';
import { GATITA, pick } from '../../content/gatita.ts';
import { reactTo } from '../../lib/feedback.ts';

const STEP_NAMES = { tonica: 'Sílaba fuerte', tipo: 'Tipo', tilde: 'Tilde' } as const;

interface FeedbackProps {
  word: WordEntry;
  turn: TurnResult;
  avatar: Avatar;
  sound: boolean;
  onNext: () => void;
}

export function Feedback({ word, turn, avatar, sound, onNext }: FeedbackProps) {
  const message = useMemo(() => pick(turn.full ? GATITA.success : GATITA.error), [turn]);
  const commonError = commonErrorText(word, turn.full);

  useEffect(() => {
    reactTo(turn.full ? 'success' : 'error', sound);
  }, [turn, sound]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 text-center">
        <Gatita
          mood={turn.full ? 'success' : 'error'}
          avatar={avatar}
          className="h-24 w-24 shrink-0"
        />
        <p className="font-bold text-gray-600" role="status">
          {message}
        </p>
        <p className="flex flex-wrap justify-center font-heading text-4xl font-bold text-gray-800">
          {word.syllables.map((s, i) => (
            <span
              key={i}
              className={
                i === word.stressIndex
                  ? 'text-pink-600 underline decoration-4 underline-offset-4'
                  : ''
              }
            >
              {s}
            </span>
          ))}
        </p>
        {word.sentence && (
          <p className="text-lg text-gray-700">{word.sentence.replace(/\[([^\]]+)\]/, '$1')}</p>
        )}
        <ul className="flex flex-wrap justify-center gap-2" aria-label="Pasos">
          {turn.steps.map((s) => (
            <li
              key={s.step}
              className={`rounded-full px-3 py-1 text-sm font-bold ${s.correct ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
            >
              {s.correct ? '✓' : '✗'} {STEP_NAMES[s.step]}
            </li>
          ))}
        </ul>
        <p className="rounded-2xl bg-blue-50 px-4 py-3 text-base font-semibold text-blue-900">
          {ruleText(word)}
        </p>
        {commonError && <p className="text-sm font-semibold text-gray-500">{commonError}</p>}
      </div>
      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button onClick={onNext} size="lg" className="min-h-14 w-full" autoFocus>
          Seguir
        </Button>
      </div>
    </div>
  );
}
