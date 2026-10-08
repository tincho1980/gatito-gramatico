// §7.3 Resultado del jefe: victoria con animación, estrellas, gato amigo y mundos nuevos; o
// derrota con ánimo (no se pierde nada).
import { useEffect } from 'react';
import { COLLECTION, CONFIG, WORLDS, type Avatar, type RoundSummary } from '@gatita/shared';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { Stars } from '../../components/Stars.tsx';
import { reactTo } from '../../lib/feedback.ts';

interface BossResultProps {
  won: boolean;
  summary: RoundSummary;
  stars: number;
  avatar: Avatar;
  accessory?: string;
  sound: boolean;
  onMap: () => void;
  onPractice: () => void;
  onWorld: () => void;
}

export function BossResult({
  won,
  summary,
  stars,
  avatar,
  accessory,
  sound,
  onMap,
  onPractice,
  onWorld,
}: BossResultProps) {
  useEffect(() => reactTo(won ? 'success' : 'error', sound), [won, sound]);
  const items = COLLECTION.filter((i) => summary.newItems.includes(i.id));
  const opened = WORLDS.filter((w) => summary.unlocked.includes(w.id));

  if (!won) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <Gatita avatar={avatar} accessory={accessory} mood="error" className="h-32 w-32" />
        <h1 className="font-heading text-3xl font-bold text-gray-800">¡Casi!</h1>
        <p className="text-lg text-gray-700">
          Hiciste {summary.fulls} de {summary.total}. Para ganarle al jefe hacen falta{' '}
          {CONFIG.bossWin}.
        </p>
        <p className="text-gray-600">
          No perdiste nada: tus palabras y tu XP siguen ahí. Practicá un poco más y desafialo cuando
          quieras.
        </p>
        <div className="mt-4 grid w-full gap-3">
          <Button size="lg" className="min-h-14 w-full" onClick={onPractice}>
            Practicar
          </Button>
          <Button size="lg" variant="outline" className="min-h-14 w-full" onClick={onWorld}>
            Volver al mundo
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 overflow-hidden px-4 py-6 text-center">
      <Confetti />
      <Gatita
        avatar={avatar}
        accessory={accessory}
        mood="success"
        className="h-36 w-36 animate-bounce"
      />
      <h1 className="font-heading text-4xl font-bold text-pink-600">¡Le ganaste al jefe!</h1>
      <Stars count={stars} className="animate-fade-in-up text-5xl" />
      <p className="text-lg font-semibold text-gray-700">
        {summary.fulls} de {summary.total} · +{summary.xp} XP · +{summary.croquetas} croquetas
      </p>
      {items.map((i) => (
        <p
          key={i.id}
          className="rounded-2xl bg-white px-4 py-3 font-semibold text-gray-700 shadow-sm"
        >
          {i.kind === 'gato' ? '🐱 Nuevo amigo' : '👑 Ganaste'}: <strong>{i.name}</strong>
        </p>
      ))}
      {opened.length > 0 && (
        <p className="text-gray-700">
          {opened.length === 1 ? 'Se abrió' : 'Se abrieron'}{' '}
          <strong>{opened.map((w) => w.name).join(', ')}</strong>
        </p>
      )}
      <Button size="lg" className="mt-4 min-h-14 w-full" onClick={onMap}>
        Ver el camino
      </Button>
    </main>
  );
}

function Confetti() {
  const pieces = ['⭐', '🎉', '✨', '🐾', '🎊', '⭐', '✨', '🐾'];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute animate-bounce text-3xl"
          style={{
            left: `${8 + i * 11}%`,
            top: `${6 + (i % 3) * 9}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}
