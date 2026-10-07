// Estados de prueba para ver el mapa en cada situación (`?debug=1`, plan etapa 4).
// Escriben `profileState` directo: no son coherentes con las rondas guardadas, y un
// `stateRepo.rebuild` los descarta.
import {
  gateRules,
  initialState,
  ruleKey,
  type ProfileState,
  type RuleMastery,
  type Stop,
  type WordIndex,
  type WorldProgress,
} from '@gatita/shared';

const mastered = (): RuleMastery => ({ ema: 0.95, attempts: 60, recent: Array(30).fill(1) });

const done = (stars: number, bossBest = 8 + Math.min(stars, 2)): WorldProgress => ({
  unlocked: true,
  stopsDone: [1, 2, 3, 4, 5],
  bossBest,
  stars,
});
const open = (stopsDone: Stop[] = []): WorldProgress => ({
  unlocked: true,
  stopsDone,
  bossBest: null,
  stars: 0,
});

function bossReady(s: ProfileState, world: number, words: WordIndex) {
  s.worlds[world] = open(world === 1 ? [1, 2, 3] : [1, 2, 3, 4]);
  for (const rule of gateRules(words.byWorld.get(world) ?? [])) {
    s.rules[ruleKey(world, rule)] = mastered();
  }
  s.lastWorld = world;
}

export interface Preset {
  id: string;
  name: string;
  build: (words: WordIndex) => ProfileState;
}

export const PRESETS: Preset[] = [
  { id: 'nuevo', name: 'Perfil nuevo', build: () => initialState() },
  {
    id: 'jefe-1',
    name: 'Jefe del mundo 1 habilitado',
    build: (words) => {
      const s = initialState();
      bossReady(s, 1, words);
      return s;
    },
  },
  {
    id: 'bifurcacion',
    name: 'Primera bifurcación (2 completo, 3 en curso, 4 nuevo)',
    build: () => {
      const s = initialState();
      s.worlds[1] = done(2);
      s.worlds[2] = done(3);
      s.worlds[3] = open([1, 2]);
      s.worlds[4] = open();
      s.lastWorld = 3;
      return s;
    },
  },
  {
    id: 'jefe-4',
    name: 'Jefe del 4 habilitado (2 y 3 vencidos)',
    build: (words) => {
      const s = initialState();
      s.worlds[1] = done(1);
      s.worlds[2] = done(2);
      s.worlds[3] = done(3);
      bossReady(s, 4, words);
      return s;
    },
  },
  {
    id: 'camino',
    name: 'Segunda bifurcación (6 en curso, 8 nuevo)',
    build: () => {
      const s = initialState();
      for (const id of [1, 2, 3, 4, 5]) s.worlds[id] = done(1 + (id % 3));
      s.worlds[6] = open([1, 2, 3]);
      s.worlds[8] = open();
      s.lastWorld = 6;
      return s;
    },
  },
  {
    id: 'todo',
    name: 'Todo completo',
    build: () => {
      const s = initialState();
      for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) s.worlds[id] = done(1 + (id % 3));
      s.lastWorld = 10;
      return s;
    },
  },
];
