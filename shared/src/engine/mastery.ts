// §6 Dominio por regla (EMA) y jefe habilitado.
import type { Rule, WordEntry } from '../schemas.ts';
import { CONFIG, type Config } from './config.ts';
import type { ProfileState, RuleMastery } from './types.ts';
import { requiredStopsBeforeBoss } from './worlds.ts';

/** La EMA se lleva por regla y por mundo de la palabra (§6.2 cuenta solo intentos de ese mundo). */
export const ruleKey = (world: number, rule: Rule): string => `${world}:${rule}`;

export const initialRuleMastery = (config: Config = CONFIG): RuleMastery => ({
  ema: config.emaInitial,
  attempts: 0,
  recent: [],
});

/** §6.1 Un turno sin pista actualiza la EMA de su regla y la ventana de intentos (§6.2). */
export function updateEma(m: RuleMastery, full: boolean, config: Config = CONFIG): RuleMastery {
  const a = config.emaAlpha;
  return {
    ema: (1 - a) * m.ema + a * (full ? 1 : 0),
    attempts: m.attempts + 1,
    recent: [...m.recent, full ? 1 : 0].slice(-config.bossGate.window),
  };
}

/** §6.2 Precisión en la ventana de intentos (0 si todavía no se llenó). */
export function windowAccuracy(m: RuleMastery | undefined, config: Config = CONFIG): number {
  if (!m || m.recent.length < config.bossGate.window) return 0;
  return m.recent.reduce((s, x) => s + x, 0) / m.recent.length;
}

/**
 * §6.2 Reglas que cuentan para el jefe: las que tienen al menos `minRuleShare` de las
 * palabras del mundo. Una regla con una o dos palabras sueltas no bloquea al jefe.
 */
export function gateRules(worldWords: readonly WordEntry[], config: Config = CONFIG): Rule[] {
  const counts = new Map<Rule, number>();
  for (const w of worldWords) counts.set(w.rule, (counts.get(w.rule) ?? 0) + 1);
  const min = worldWords.length * config.bossGate.minRuleShare;
  return [...counts].filter(([, n]) => n >= min).map(([rule]) => rule);
}

/** §6.2 condición 2: dominio de las reglas del mundo. */
export function rulesReadyForBoss(
  state: ProfileState,
  world: number,
  worldWords: readonly WordEntry[],
  config: Config = CONFIG,
): boolean {
  const { minEma, minAccuracy } = config.bossGate;
  return gateRules(worldWords, config).every((rule) => {
    const m = state.rules[ruleKey(world, rule)];
    return !!m && m.ema >= minEma && windowAccuracy(m, config) >= minAccuracy;
  });
}

/** §6.2 Jefe habilitado: paradas anteriores completas y reglas dominadas. */
export function isBossEnabled(
  state: ProfileState,
  world: number,
  worldWords: readonly WordEntry[],
  config: Config = CONFIG,
): boolean {
  const progress = state.worlds[world];
  if (!progress?.unlocked) return false;
  const stopsReady = requiredStopsBeforeBoss(world, config).every((s) =>
    progress.stopsDone.includes(s),
  );
  // §7.3 Una vez habilitado, sigue habilitado aunque pierda (la EMA puede bajar en el intento).
  return (
    stopsReady && (!!progress.bossReady || rulesReadyForBoss(state, world, worldWords, config))
  );
}
