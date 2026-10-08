// Avisos dentro de la app al ganar algo (plan, etapa 5; no son notificaciones push).
import { BADGES, COLLECTION, levelFor, type ProfileState, type RoundSummary } from '@gatita/shared';

export interface Notice {
  icon: string;
  text: string;
}

/** Lo que se ganó con una ronda: subir de nivel, insignias y ítems de la colección. */
export function roundNotices(
  summary: RoundSummary,
  before: ProfileState,
  after: ProfileState,
): Notice[] {
  const notices: Notice[] = [];
  const level = levelFor(after.xp).level;
  if (level > levelFor(before.xp).level) {
    notices.push({ icon: '⭐', text: `¡Subiste al nivel ${level}!` });
  }
  for (const b of BADGES.filter((b) => summary.newBadges.includes(b.id))) {
    notices.push({ icon: '🏅', text: `Nueva insignia: ${b.name}` });
  }
  for (const i of COLLECTION.filter((i) => summary.newItems.includes(i.id))) {
    notices.push(
      i.kind === 'gato'
        ? { icon: '🐱', text: `Nuevo amigo: ${i.name}` }
        : { icon: '🎁', text: `Ganaste: ${i.name}` },
    );
  }
  return notices;
}
