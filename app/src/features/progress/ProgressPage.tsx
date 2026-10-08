// Progreso por regla (§6.1): una barra por cada regla que cuenta para el jefe de cada mundo
// abierto (§6.2), con la EMA y la marca que pide el jefe. Reemplaza la pantalla vieja de
// logros y el gráfico de Recharts.
import { CONFIG, gateRules, RULE_NAMES, ruleKey, WORLDS } from '@gatita/shared';
import { PageHeader } from '../../components/PageHeader.tsx';
import { worldLook } from '../../content/worlds.ts';
import { useWords } from '../../words/words.ts';
import { useActiveProfile, useProfileState } from '../profile/hooks.ts';

const pct = (x: number) => Math.round(x * 100);

export function ProgressPage() {
  const profile = useActiveProfile();
  const state = useProfileState(profile?.id);
  const { words } = useWords();
  if (!profile || !state || !words) return null;

  // Primero el mundo que está jugando.
  const worlds = WORLDS.filter((w) => state.worlds[w.id]?.unlocked).sort(
    (a, b) => Number(b.id === state.lastWorld) - Number(a.id === state.lastWorld),
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PageHeader title="Tu progreso" />
      <p className="text-gray-600">
        Cada barra es cuánto dominás una regla. Cuando todas las de un mundo pasan la marca, se
        acerca el jefe.
      </p>

      {worlds.map((w) => {
        const rules = gateRules(words.index.byWorld.get(w.id) ?? []);
        const look = worldLook(w.id);
        return (
          <section key={w.id} aria-labelledby={`mundo-${w.id}`}>
            <h2
              id={`mundo-${w.id}`}
              className="mb-2 flex items-center gap-2 font-heading text-lg font-bold text-gray-800"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${look.bg}`}
                aria-hidden
              >
                {look.icon}
              </span>
              {w.name}
            </h2>
            <ul className="grid gap-2">
              {rules.map((rule) => {
                const m = state.rules[ruleKey(w.id, rule)];
                return (
                  <li key={rule} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="font-bold text-gray-700">{RULE_NAMES[rule]}</span>
                      <span className="shrink-0 font-semibold text-gray-500">
                        {m ? `${pct(m.ema)} %` : 'Sin jugar'}
                      </span>
                    </div>
                    <div
                      className="relative h-3 rounded-full bg-pink-100"
                      role="progressbar"
                      aria-label={RULE_NAMES[rule]}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={m ? pct(m.ema) : 0}
                    >
                      <div
                        className={`h-full rounded-full ${m && m.ema >= CONFIG.bossGate.minEma ? 'bg-emerald-500' : 'bg-pink-500'}`}
                        style={{ width: `${m ? pct(m.ema) : 0}%` }}
                      />
                      <div
                        className="absolute -top-1 h-5 w-0.5 rounded bg-gray-500"
                        style={{ left: `${pct(CONFIG.bossGate.minEma)}%` }}
                        aria-hidden
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
