// §4.4 Pantalla de resultados.
import { useEffect, useMemo } from 'react';
import { BADGES, RULE_NAMES, type Avatar, type RoundSummary } from '@gatita/shared';
import { AdSlot } from '../../components/AdSlot.tsx';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { XpGain } from '../../components/XpGain.tsx';
import { GATITA, pick } from '../../content/gatita.ts';
import { reactTo } from '../../lib/feedback.ts';

interface ResultsProps {
  summary: RoundSummary;
  /** XP total del perfil después de la ronda. */
  xpTotal: number;
  avatar: Avatar;
  accessory?: string;
  sound: boolean;
  /** La ronda completó la parada (§7.2). */
  stopCompleted: boolean;
  onNext: () => void;
  onWorld: () => void;
}

export function Results({
  summary,
  xpTotal,
  avatar,
  accessory,
  sound,
  stopCompleted,
  onNext,
  onWorld,
}: ResultsProps) {
  const ratio = summary.total ? summary.fulls / summary.total : 0;
  const message = useMemo(
    () =>
      pick(
        ratio >= 0.9
          ? GATITA.results.great
          : ratio >= 0.6
            ? GATITA.results.good
            : GATITA.results.keepGoing,
      ),
    [ratio],
  );
  const badges = BADGES.filter((b) => summary.newBadges.includes(b.id));

  useEffect(() => reactTo(ratio >= 0.6 ? 'success' : 'click', sound), [ratio, sound]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 text-center">
        <Gatita avatar={avatar} accessory={accessory} mood="success" className="h-24 w-24" />
        <h1 className="font-heading text-3xl font-bold text-pink-600">{message}</h1>

        <dl className="grid w-full grid-cols-2 gap-3">
          <Stat label="Completas" value={`${summary.fulls} / ${summary.total}`} />
          <XpGain gained={summary.xp} total={xpTotal} />
        </dl>

        <ul className="w-full space-y-2 text-left">
          {stopCompleted && (
            <Line icon="🎯">
              <strong>¡Completaste esta parada!</strong>
            </Line>
          )}
          {summary.improved && (
            <Line icon="⬆️">
              Mejoraste en <strong>{RULE_NAMES[summary.improved.rule]}</strong>
            </Line>
          )}
          {summary.toReview && (
            <Line icon="🔁">
              Conviene repasar <strong>{RULE_NAMES[summary.toReview.rule]}</strong>
            </Line>
          )}
          {summary.boxesUp.length > 0 && (
            <Line icon="📦">
              {summary.boxesUp.length === 1
                ? 'Una palabra subió de caja'
                : `${summary.boxesUp.length} palabras subieron de caja`}
            </Line>
          )}
          {summary.croquetas > 0 && (
            <Line icon="🐟">
              Ganaste {summary.croquetas} {summary.croquetas === 1 ? 'croqueta' : 'croquetas'}
            </Line>
          )}
          {badges.map((b) => (
            <Line key={b.id} icon="🏅">
              Nueva insignia: <strong>{b.name}</strong>
            </Line>
          ))}
        </ul>
      </div>

      <AdSlot slot="results" />
      <div className="grid shrink-0 gap-3 pb-[env(safe-area-inset-bottom)]">
        <Button onClick={onNext} size="lg" className="min-h-14 w-full">
          Seguir jugando
        </Button>
        <Button onClick={onWorld} variant="outline" size="lg" className="min-h-14 w-full">
          Volver al mundo
        </Button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <dt className="text-sm font-semibold text-gray-500">{label}</dt>
      <dd className="font-heading text-3xl font-bold text-gray-800">{value}</dd>
    </div>
  );
}

function Line({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 rounded-2xl bg-white px-4 py-3 text-gray-700 shadow-sm">
      <span aria-hidden>{icon}</span>
      <span>{children}</span>
    </li>
  );
}
