// Un paso del turno por pantalla (§2.1): arriba la palabra, abajo (zona del pulgar) las respuestas.
import {
  typeOptions,
  withoutTildes,
  type Step,
  type WordEntry,
  type WordType,
} from '@gatita/shared';
import { useMemo, type ReactNode } from 'react';
import { GATITA, pick } from '../../content/gatita.ts';

const TYPE_LABELS: Record<WordType, string> = {
  monosilaba: 'Monosílaba',
  aguda: 'Aguda',
  grave: 'Grave',
  esdrujula: 'Esdrújula',
  sobreesdrujula: 'Sobreesdrújula',
};

const PROMPTS: Record<Step, string> = {
  tonica: 'Tocá la sílaba que suena más fuerte',
  tipo: '¿Qué tipo de palabra es?',
  tilde: '¿Lleva tilde?',
};

interface TurnProps {
  word: WordEntry;
  step: Step;
  roundWorld: number;
  /** Sílaba tónica marcada (con pista, o después del paso `tonica`). */
  markStress: boolean;
  /** Si la tónica que marcó el chico estuvo bien (para el color de la marca). */
  tonicaOk: boolean | null;
  hinted: boolean;
  onAnswer: (value: number | WordType | boolean) => void;
}

export function Turn({
  word,
  step,
  roundWorld,
  markStress,
  tonicaOk,
  hinted,
  onAnswer,
}: TurnProps) {
  const syllables = word.syllables.map(withoutTildes);
  const hintText = useMemo(() => pick(GATITA.hint), []);
  const prompt =
    step === 'tilde' && word.sentence ? '¿La palabra resaltada lleva tilde?' : PROMPTS[step];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        {hinted && (
          <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            {hintText}
          </p>
        )}
        {word.sentence ? (
          <Sentence sentence={word.sentence} />
        ) : step === 'tonica' ? (
          <p className="font-heading text-4xl font-bold tracking-wide text-gray-800">
            {withoutTildes(word.word)}
          </p>
        ) : (
          <SyllableWord
            syllables={syllables}
            stress={markStress ? word.stressIndex : null}
            ok={tonicaOk}
          />
        )}
        {markStress && tonicaOk === false && (
          <p className="text-sm font-semibold text-gray-600">La sílaba fuerte es la marcada.</p>
        )}
        <h2 className="text-lg font-bold text-gray-600">{prompt}</h2>
      </div>

      <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {step === 'tonica' && (
          <Options cols={Math.min(syllables.length, 4)}>
            {syllables.map((s, i) => (
              <Choice key={i} onClick={() => onAnswer(i)} label={`Sílaba ${s}`}>
                {s}
              </Choice>
            ))}
          </Options>
        )}
        {step === 'tipo' && (
          <Options cols={2}>
            {typeOptions(word, roundWorld).map((t) => (
              <Choice key={t} onClick={() => onAnswer(t)}>
                {TYPE_LABELS[t]}
              </Choice>
            ))}
          </Options>
        )}
        {step === 'tilde' && (
          <Options cols={2}>
            <Choice onClick={() => onAnswer(true)}>Con tilde</Choice>
            <Choice onClick={() => onAnswer(false)}>Sin tilde</Choice>
          </Options>
        )}
      </div>
    </div>
  );
}

function SyllableWord({
  syllables,
  stress,
  ok,
}: {
  syllables: string[];
  stress: number | null;
  ok: boolean | null;
}) {
  return (
    <p
      className="flex flex-wrap justify-center gap-x-1 font-heading text-4xl font-bold text-gray-800"
      aria-label={syllables.join('')}
    >
      {syllables.map((s, i) => (
        <span key={i} className="flex items-center gap-x-1">
          {i > 0 && <span className="text-gray-300">·</span>}
          <span
            className={
              i === stress
                ? `rounded-xl px-1 ${ok === false ? 'bg-amber-200 text-amber-900' : 'bg-pink-200 text-pink-800'}`
                : ''
            }
          >
            {s}
          </span>
        </span>
      ))}
    </p>
  );
}

/** La oración con la palabra entre corchetes resaltada y sin tilde. */
function Sentence({ sentence }: { sentence: string }) {
  const parts = sentence.split(/(\[[^\]]+\])/);
  return (
    <p className="text-2xl leading-relaxed font-semibold text-gray-800">
      {parts.map((part, i) =>
        part.startsWith('[') ? (
          <mark
            key={i}
            className="rounded-lg bg-pink-200 px-1 font-heading font-bold text-pink-800"
          >
            {withoutTildes(part.slice(1, -1))}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function Options({ cols, children }: { cols: number; children: ReactNode }) {
  const grid =
    ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][cols] ??
    'grid-cols-4';
  return (
    <div className={`grid gap-3 ${grid}`} data-testid="choices">
      {children}
    </div>
  );
}

function Choice({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="min-h-14 rounded-2xl border-b-4 border-pink-200 bg-white px-3 py-3 font-heading text-xl font-bold text-gray-700 shadow-sm transition active:translate-y-0.5 active:scale-95 active:border-b-2"
    >
      {children}
    </button>
  );
}
