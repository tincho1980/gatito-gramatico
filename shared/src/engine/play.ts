// Qué mostrar en el mapa y qué hace el botón "Jugar" (§7.2), a partir del estado.
import type { Rule, WordEntry } from '../schemas.ts';
import { CONFIG, type Config } from './config.ts';
import { gateRules, isBossEnabled, ruleKey, windowAccuracy } from './mastery.ts';
import type { ProfileState, Stop, WordIndex } from './types.ts';
import { canPlayStop, currentStop, requiredStopsBeforeBoss } from './worlds.ts';

export type WorldStatus = 'locked' | 'available' | 'inProgress' | 'complete';

/** Estado de un mundo en el mapa. */
export function worldStatus(state: ProfileState, world: number): WorldStatus {
  const p = state.worlds[world];
  if (!p?.unlocked) return 'locked';
  if (p.bossBest !== null) return 'complete';
  return p.stopsDone.length > 0 ? 'inProgress' : 'available';
}

export type PlayAction =
  | { kind: 'lesson'; world: number; stop: 1 }
  | { kind: 'practice'; world: number; stop: Stop }
  | { kind: 'boss'; world: number; stop: 5 }
  /** El último mundo está completo: se elige el próximo en el mapa (las bifurcaciones no fuerzan orden). */
  | { kind: 'map' };

/**
 * §7.2 Botón "Jugar": la parada más avanzada no completada del último mundo jugado.
 * Si ya completó las paradas y el jefe no está habilitado, repite la última práctica.
 */
export function playAction(
  state: ProfileState,
  words: WordIndex,
  config: Config = CONFIG,
): PlayAction {
  const world = state.worlds[state.lastWorld]?.unlocked ? state.lastWorld : 1;
  const progress = state.worlds[world];
  if (progress?.bossBest !== null && progress?.bossBest !== undefined) return { kind: 'map' };
  return stopAction(state, world, currentStop(progress, world, config), words, config);
}

/** La acción para jugar una parada concreta (desde la pantalla del mundo). */
export function stopAction(
  state: ProfileState,
  world: number,
  stop: Stop,
  words: WordIndex,
  config: Config = CONFIG,
): PlayAction {
  if (stop === 1) return { kind: 'lesson', world, stop: 1 };
  if (stop !== 5) return { kind: 'practice', world, stop };
  if (isBossEnabled(state, world, words.byWorld.get(world) ?? [], config)) {
    return { kind: 'boss', world, stop: 5 };
  }
  const last = requiredStopsBeforeBoss(world, config).at(-1) as Stop;
  return last === 1 ? { kind: 'lesson', world, stop: 1 } : { kind: 'practice', world, stop: last };
}

export interface RuleGate {
  rule: Rule;
  ema: number;
  /** Precisión en la ventana de intentos (0 si todavía no se llenó). */
  accuracy: number;
  /** Intentos en la ventana (hasta `bossGate.window`). */
  attempts: number;
  ready: boolean;
}

/** §6.2 Cuánto falta en cada regla para habilitar al jefe (para mostrarlo en el mundo). */
export function bossGateStatus(
  state: ProfileState,
  world: number,
  worldWords: readonly WordEntry[],
  config: Config = CONFIG,
): RuleGate[] {
  const { minEma, minAccuracy } = config.bossGate;
  return gateRules(worldWords, config).map((rule) => {
    const m = state.rules[ruleKey(world, rule)];
    const ema = m?.ema ?? config.emaInitial;
    const accuracy = windowAccuracy(m, config);
    return {
      rule,
      ema,
      accuracy,
      attempts: m?.recent.length ?? 0,
      ready: ema >= minEma && accuracy >= minAccuracy,
    };
  });
}

/** §4.4 Qué viene después de una ronda de práctica, para avisarlo en los resultados. */
export type NextNote =
  /** El jefe quedó habilitado: el botón lleva a él. */
  | { kind: 'bossReady' }
  /** Paradas completas pero el jefe todavía no (§6.2): se repite la última práctica. */
  | { kind: 'bossLocked'; rules: Rule[] }
  /** La ronda no completó la parada: se vuelve a jugar con la marca que falta. */
  | { kind: 'stopPending'; need: number };

export function nextNote(
  after: ProfileState,
  world: number,
  stop: Stop,
  next: PlayAction,
  words: WordIndex,
  config: Config = CONFIG,
): NextNote | null {
  const progress = after.worlds[world];
  if (next.kind === 'boss') return { kind: 'bossReady' };
  if (next.kind !== 'practice' || next.world !== world || progress?.bossBest != null) return null;
  if (canPlayStop(progress, world, 5, config)) {
    const gate = bossGateStatus(after, world, words.byWorld.get(world) ?? [], config);
    return { kind: 'bossLocked', rules: gate.filter((r) => !r.ready).map((r) => r.rule) };
  }
  if (next.stop === stop && !progress?.stopsDone.includes(stop)) {
    return { kind: 'stopPending', need: config.stopPass[stop] ?? 0 };
  }
  return null;
}
