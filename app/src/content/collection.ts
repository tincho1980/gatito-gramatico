// Cómo se ve cada ítem de la colección (§8.3). El catálogo (precio, tipo) está en
// shared/src/data/collection.json; acá van solo los dibujos y colores.
import type { Avatar } from '@gatita/shared';

/** Fondos: clases de Tailwind para el recuadro donde está la gatita. */
export const BACKGROUNDS: Readonly<Record<string, string>> = {
  'fondo-jardin': 'bg-gradient-to-b from-sky-100 via-lime-100 to-green-200',
  'fondo-playa': 'bg-gradient-to-b from-sky-200 via-sky-100 to-amber-200',
  'fondo-noche': 'bg-gradient-to-b from-indigo-900 via-indigo-700 to-violet-600',
  'fondo-biblioteca': 'bg-gradient-to-b from-amber-100 via-orange-100 to-amber-300',
  'fondo-arcoiris': 'bg-gradient-to-br from-pink-200 via-yellow-100 to-sky-200',
};

/** Recuadro sin fondo comprado. */
export const DEFAULT_BACKGROUND = 'bg-white';

export const backgroundClass = (id: string | undefined): string =>
  (id && BACKGROUNDS[id]) || DEFAULT_BACKGROUND;

/** Gatos amigos: se dibujan con la gatita, otro pelaje y a veces un accesorio. */
export const FRIENDS: Readonly<Record<string, { avatar: Avatar; accessory?: string }>> = {
  'gato-tejado': { avatar: 'gris', accessory: 'bufanda' },
  'gato-dormilon': { avatar: 'blanco' },
  'gato-trepador': { avatar: 'atigrado' },
  'gato-mercader': { avatar: 'naranja', accessory: 'galera' },
  'gato-nadador': { avatar: 'siames', accessory: 'collar-cascabel' },
  'gato-equilibrista': { avatar: 'negro', accessory: 'pajarita' },
  'gatos-gemelos': { avatar: 'naranja', accessory: 'mono-rosa' },
  'gato-curioso': { avatar: 'gris', accessory: 'lentes' },
};
