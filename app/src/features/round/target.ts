// Etapa 3: sin mapa todavía, se juega la práctica del mundo 2 (plan de desarrollo).
// El mundo 2 se abre como si fuera un desbloqueo del aula, para que sus palabras vuelvan
// como repasos. En la etapa 4 esto se reemplaza por el mapa y el botón "Jugar" de §7.2.
import type { Stop } from '@gatita/shared';

export const STAGE3_TARGET: { world: number; stop: Stop } = { world: 2, stop: 2 };
export const STAGE3_OPEN_WORLDS: readonly number[] = [2];
