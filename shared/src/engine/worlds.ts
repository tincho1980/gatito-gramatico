// §7 Mundos, paradas, desbloqueos y estrellas. El grafo está como datos en data/worlds.ts.
import type { WordEntry } from '../schemas.ts';
import { WORLDS } from '../data/worlds.ts';
import { CONFIG, type Config } from './config.ts';
import type { ProfileState, Stop, WordMastery, WorldProgress } from './types.ts';

export const initialWorldProgress = (unlocked: boolean): WorldProgress => ({
  unlocked,
  stopsDone: [],
  bossBest: null,
  stars: 0,
});

/** §7.2 Paradas del mundo, en orden. El mundo 1 no tiene desafío. */
export function stopsOf(world: number, config: Config = CONFIG): Stop[] {
  return config.worldsWithoutChallengeStop.includes(world) ? [1, 2, 3, 5] : [1, 2, 3, 4, 5];
}

export const requiredStopsBeforeBoss = (world: number, config: Config = CONFIG): Stop[] =>
  stopsOf(world, config).filter((s) => s !== 5);

/** Tier de las palabras "nuevas o en curso" de cada parada de práctica. */
export function tierOfStop(stop: Stop): 1 | 2 | 3 {
  if (stop === 3) return 2;
  if (stop === 4) return 3;
  return 1;
}

/** §7.2 Una parada se puede jugar si las anteriores del mundo están completas. */
export function canPlayStop(
  progress: WorldProgress | undefined,
  world: number,
  stop: Stop,
  config: Config = CONFIG,
): boolean {
  if (!progress?.unlocked) return false;
  const stops = stopsOf(world, config);
  if (!stops.includes(stop)) return false;
  return stops.slice(0, stops.indexOf(stop)).every((s) => progress.stopsDone.includes(s));
}

/** La parada más avanzada no completada (o el jefe, si ya está todo). */
export function currentStop(
  progress: WorldProgress | undefined,
  world: number,
  config: Config = CONFIG,
): Stop {
  const stops = stopsOf(world, config);
  return stops.find((s) => !progress?.stopsDone.includes(s)) ?? 5;
}

/**
 * §7.1 Mundos que se abren con los jefes vencidos. `teacherUnlocks` (§7.1, aula) los abre
 * aunque falte el jefe anterior. Lo desbloqueado no se vuelve a bloquear.
 */
export function unlockedWorlds(
  worlds: Record<number, WorldProgress>,
  teacherUnlocks: readonly number[] = [],
): number[] {
  const beaten = new Set(
    Object.entries(worlds)
      .filter(([, p]) => p.bossBest !== null)
      .map(([id]) => Number(id)),
  );
  return WORLDS.filter(
    (w) =>
      worlds[w.id]?.unlocked ||
      teacherUnlocks.includes(w.id) ||
      w.requires.every((r) => beaten.has(r)),
  ).map((w) => w.id);
}

/** Proporción de palabras del mundo en caja ≥ `threeStarsMinBox`. */
export function boxShare(
  worldWords: readonly WordEntry[],
  words: Record<string, WordMastery>,
  config: Config = CONFIG,
): number {
  if (worldWords.length === 0) return 0;
  const strong = worldWords.filter(
    (w) => (words[w.id]?.box ?? 0) >= config.threeStarsMinBox,
  ).length;
  return strong / worldWords.length;
}

/** §7.4 Estrellas según el mejor resultado contra el jefe y las cajas. */
export function starsFor(bossBest: number | null, share: number, config: Config = CONFIG): number {
  if (bossBest === null) return 0;
  if (bossBest < config.bossTwoStars) return 1;
  return share >= config.threeStarsBoxShare ? 3 : 2;
}

export interface PlayTarget {
  world: number;
  stop: Stop;
}

/** §7.2 Botón "Jugar": la parada más avanzada no completada del último mundo jugado. */
export function playTarget(state: ProfileState, config: Config = CONFIG): PlayTarget {
  const world = state.worlds[state.lastWorld]?.unlocked ? state.lastWorld : 1;
  return { world, stop: currentStop(state.worlds[world], world, config) };
}
