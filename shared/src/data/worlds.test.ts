import { describe, expect, it } from 'vitest';
import { WORLDS, WORLD_IDS } from './worlds.ts';

describe('§7.1 grafo de desbloqueo', () => {
  it('tiene los 10 mundos, del 1 al 10', () => {
    expect(WORLD_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('nombres y temas como en la especificación', () => {
    expect(WORLDS.map((w) => `${w.name} · ${w.topic}`)).toEqual([
      'La Sílaba que Ronronea · sílaba tónica',
      'El Tejado Puntiagudo · agudas',
      'Las Llanuras de la Siesta · graves',
      'El Árbol Trepador · esdrújulas',
      'El Mercado de los Ovillos · las tres mezcladas',
      'El Río de los Abrazos · diptongos',
      'El Puente Roto · hiatos',
      'La Casa de los Gemelos · tú / tu, él / el',
      'El Bosque de las Preguntas · qué, cómo',
      'La Torre de la Gata Sabia · casos especiales',
    ]);
  });

  it('el mundo 1 está abierto desde el inicio', () => {
    expect(WORLDS[0]?.requires).toEqual([]);
  });

  it('cada mundo depende solo de mundos anteriores (sin ciclos)', () => {
    for (const w of WORLDS.slice(1)) {
      expect(w.requires.length).toBeGreaterThan(0);
      for (const r of w.requires) expect(r).toBeLessThan(w.id);
    }
  });

  it('el 5 pide 2, 3 y 4; el 10 pide 7 y 9', () => {
    expect(WORLDS.find((w) => w.id === 5)?.requires).toEqual([2, 3, 4]);
    expect(WORLDS.find((w) => w.id === 10)?.requires).toEqual([7, 9]);
  });
});
