import type { PlayAction, Stop } from '@gatita/shared';

/** Ruta para jugar una acción (lección, práctica, jefe o mapa). */
export function actionPath(action: PlayAction): string {
  switch (action.kind) {
    case 'map':
      return '/mapa';
    case 'lesson':
      return `/mundo/${action.world}/leccion`;
    default:
      return roundPath(action.world, action.stop);
  }
}

export const roundPath = (world: number, stop: Stop): string =>
  `/ronda?mundo=${world}&parada=${stop}`;

/** Lee mundo y parada de la URL de la ronda. */
export function parseRoundParams(params: URLSearchParams): { world: number; stop: Stop } | null {
  const world = Number(params.get('mundo'));
  const stop = Number(params.get('parada'));
  if (!Number.isInteger(world) || ![2, 3, 4, 5].includes(stop)) return null;
  return { world, stop: stop as Stop };
}
