// §3 XP ganado en la ronda: el número sube de a poco y la barra del nivel se llena.
import { useEffect, useState } from 'react';
import { levelFor } from '@gatita/shared';

const DURATION_MS = 1000;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function XpGain({ gained, total }: { gained: number; total: number }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? gained : 0));

  useEffect(() => {
    if (reducedMotion() || gained <= 0) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setShown(Math.round(gained * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gained]);

  const level = levelFor(total - gained + shown);
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <dt className="text-sm font-semibold text-gray-500">XP ganado</dt>
      <dd className="font-heading text-3xl font-bold text-gray-800" aria-label={`${gained} XP`}>
        +{shown}
      </dd>
      <dd className="mt-1 flex items-center gap-2 text-xs font-bold text-gray-500">
        <span>Nivel {level.level}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-pink-100" aria-hidden>
          <span
            className="block h-full rounded-full bg-pink-500"
            style={{ width: `${(level.into / level.needed) * 100}%` }}
          />
        </span>
      </dd>
    </div>
  );
}
