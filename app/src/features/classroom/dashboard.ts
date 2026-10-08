// Cuentas del tablero docente (plan, etapa 8): color y texto por regla, promedio del curso y
// la regla que conviene repasar. Puro, para poder probarlo.
import { CONFIG, ruleKey, type DashboardStudent, type Rule } from '@gatita/shared';

export type Level = 'good' | 'ok' | 'low' | 'none';

export const LEVELS: Record<Level, { label: string; cell: string }> = {
  good: { label: 'Domina', cell: 'bg-emerald-100 text-emerald-900' },
  ok: { label: 'En camino', cell: 'bg-amber-100 text-amber-900' },
  low: { label: 'Para repasar', cell: 'bg-rose-100 text-rose-900' },
  none: { label: 'Sin jugar', cell: 'bg-gray-50 text-gray-500' },
};

export function levelOf(ema: number | undefined, config = CONFIG): Level {
  if (ema === undefined) return 'none';
  if (ema >= config.dashboard.good) return 'good';
  if (ema >= config.dashboard.ok) return 'ok';
  return 'low';
}

/** Mundo que juega la mayoría (a igualdad, el menor). */
export function commonWorld(students: readonly DashboardStudent[]): number {
  const count = new Map<number, number>();
  for (const s of students) count.set(s.world, (count.get(s.world) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 1;
}

export interface RuleSummary {
  rule: Rule;
  /** EMA promedio de los que la jugaron; `undefined` si nadie. */
  average: number | undefined;
  played: number;
}

/** Promedio del curso por regla del mundo, solo con los chicos que la jugaron. */
export function ruleSummaries(
  students: readonly DashboardStudent[],
  world: number,
  rules: readonly Rule[],
): RuleSummary[] {
  return rules.map((rule) => {
    const emas = students
      .map((s) => s.rules[ruleKey(world, rule)])
      .filter((m): m is { ema: number; attempts: number } => !!m && m.attempts > 0)
      .map((m) => m.ema);
    return {
      rule,
      average: emas.length ? emas.reduce((a, b) => a + b, 0) / emas.length : undefined,
      played: emas.length,
    };
  });
}

/** "¿Qué regla tengo que repasar con este curso?": la de promedio más bajo, si está floja. */
export function ruleToReview(
  summaries: readonly RuleSummary[],
  config = CONFIG,
): RuleSummary | null {
  const played = summaries.filter((s) => s.average !== undefined);
  const weakest = played.sort((a, b) => a.average! - b.average!)[0];
  return weakest && weakest.average! < config.dashboard.good ? weakest : null;
}

/** "hace 3 días", "hoy", "nunca". */
export function lastActivityText(iso: string | null, now: Date): string {
  if (!iso) return 'Nunca';
  const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
