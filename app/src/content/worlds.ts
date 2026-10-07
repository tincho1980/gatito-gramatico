// Ilustración simple de cada mundo: un ícono y un color (plan, etapa 4). Las definitivas
// llegan en la etapa 9.

export interface WorldLook {
  icon: string;
  /** Fondo del ícono y borde de la tarjeta. */
  bg: string;
  ring: string;
}

export const WORLD_LOOKS: Record<number, WorldLook> = {
  1: { icon: '🐾', bg: 'bg-pink-200', ring: 'border-pink-300' },
  2: { icon: '🏠', bg: 'bg-orange-200', ring: 'border-orange-300' },
  3: { icon: '🌾', bg: 'bg-lime-200', ring: 'border-lime-300' },
  4: { icon: '🌳', bg: 'bg-emerald-200', ring: 'border-emerald-300' },
  5: { icon: '🧶', bg: 'bg-fuchsia-200', ring: 'border-fuchsia-300' },
  6: { icon: '🌊', bg: 'bg-sky-200', ring: 'border-sky-300' },
  7: { icon: '🌉', bg: 'bg-indigo-200', ring: 'border-indigo-300' },
  8: { icon: '👯', bg: 'bg-amber-200', ring: 'border-amber-300' },
  9: { icon: '🌲', bg: 'bg-teal-200', ring: 'border-teal-300' },
  10: { icon: '🏰', bg: 'bg-violet-200', ring: 'border-violet-300' },
};

export const worldLook = (id: number): WorldLook =>
  WORLD_LOOKS[id] ?? { icon: '⭐', bg: 'bg-gray-200', ring: 'border-gray-300' };
