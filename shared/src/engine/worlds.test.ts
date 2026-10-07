import { describe, expect, it } from 'vitest';
import { initialState } from './state.ts';
import { word } from './testing.ts';
import type { WorldProgress } from './types.ts';
import {
  boxShare,
  canPlayStop,
  currentStop,
  playTarget,
  starsFor,
  stopsOf,
  tierOfStop,
  unlockedWorlds,
} from './worlds.ts';

const beaten = (): WorldProgress => ({
  unlocked: true,
  stopsDone: [1, 2, 3, 4, 5],
  bossBest: 8,
  stars: 1,
});

describe('§7.1 grafo de desbloqueo', () => {
  it('§7.1 al principio solo está abierto el mundo 1', () => {
    expect(unlockedWorlds(initialState().worlds)).toEqual([1]);
  });

  it('§7.1 vencer al jefe del 1 abre 2, 3 y 4 a la vez', () => {
    const worlds = initialState().worlds;
    worlds[1] = beaten();
    expect(unlockedWorlds(worlds)).toEqual([1, 2, 3, 4]);
  });

  it('§7.1 el 5 recién se abre con los jefes de 2, 3 y 4', () => {
    const worlds = initialState().worlds;
    worlds[1] = beaten();
    worlds[2] = beaten();
    worlds[3] = beaten();
    expect(unlockedWorlds(worlds)).not.toContain(5);
    worlds[4] = beaten();
    expect(unlockedWorlds(worlds)).toContain(5);
  });

  it('§7.1 el 10 necesita los jefes de 7 y 9', () => {
    const worlds = initialState().worlds;
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) worlds[id] = beaten();
    expect(unlockedWorlds(worlds)).not.toContain(10);
    worlds[9] = beaten();
    expect(unlockedWorlds(worlds)).toContain(10);
  });

  it('§7.1 lo desbloqueado nunca se vuelve a bloquear', () => {
    const worlds = initialState().worlds;
    worlds[6] = { ...worlds[6]!, unlocked: true };
    expect(unlockedWorlds(worlds)).toContain(6);
  });

  it('§7.1 el docente puede abrir un mundo para el aula', () => {
    expect(unlockedWorlds(initialState().worlds, [8])).toEqual([1, 8]);
  });
});

describe('§7.2 paradas', () => {
  it('§7.2 cinco paradas; el mundo 1 no tiene desafío', () => {
    expect(stopsOf(2)).toEqual([1, 2, 3, 4, 5]);
    expect(stopsOf(1)).toEqual([1, 2, 3, 5]);
  });

  it('§7.2 tier de cada parada de práctica', () => {
    expect([2, 3, 4].map((s) => tierOfStop(s as 2 | 3 | 4))).toEqual([1, 2, 3]);
  });

  it('§7.2 las paradas son secuenciales y se pueden volver a jugar', () => {
    const p: WorldProgress = { unlocked: true, stopsDone: [1], bossBest: null, stars: 0 };
    expect(canPlayStop(p, 2, 2)).toBe(true);
    expect(canPlayStop(p, 2, 3)).toBe(false);
    expect(canPlayStop(p, 2, 1)).toBe(true);
    expect(canPlayStop({ ...p, unlocked: false }, 2, 1)).toBe(false);
    expect(canPlayStop(p, 1, 4)).toBe(false);
  });

  it('§7.2 parada actual: la primera no completada', () => {
    expect(currentStop(undefined, 2)).toBe(1);
    expect(currentStop({ unlocked: true, stopsDone: [1, 2], bossBest: null, stars: 0 }, 2)).toBe(3);
    expect(currentStop({ unlocked: true, stopsDone: [1, 2, 3], bossBest: null, stars: 0 }, 1)).toBe(
      5,
    );
    expect(currentStop(beaten(), 2)).toBe(5);
  });

  it('§7.2 botón Jugar: parada más avanzada no completada del último mundo jugado', () => {
    const s = initialState();
    expect(playTarget(s)).toEqual({ world: 1, stop: 1 });
    s.worlds[3] = { unlocked: true, stopsDone: [1, 2], bossBest: null, stars: 0 };
    s.lastWorld = 3;
    expect(playTarget(s)).toEqual({ world: 3, stop: 3 });
    s.lastWorld = 7; // bloqueado: vuelve al 1
    expect(playTarget(s)).toEqual({ world: 1, stop: 1 });
  });
});

describe('§7.4 estrellas', () => {
  it('§7.4 ★ jefe vencido, ★★ con 9 de 10, ★★★ además 80 % en caja 3+', () => {
    expect(starsFor(null, 1)).toBe(0);
    expect(starsFor(8, 1)).toBe(1);
    expect(starsFor(9, 0.79)).toBe(2);
    expect(starsFor(10, 0.8)).toBe(3);
  });

  it('§7.4 proporción de palabras en caja 3 o más', () => {
    const ws = [word({ id: 'a' }), word({ id: 'b' }), word({ id: 'c' }), word({ id: 'd' })];
    const m = (box: number) => ({
      box,
      dueRound: 0,
      lastRound: 0,
      lastSeenAt: '',
      errors: 0,
      fullStreak: 0,
    });
    expect(boxShare(ws, { a: m(3), b: m(5), c: m(2) })).toBe(0.5);
    expect(boxShare([], {})).toBe(0);
  });
});
