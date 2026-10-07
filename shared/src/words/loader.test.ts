import { describe, expect, it } from 'vitest';
import { loadIndex, loadWorld, worldFileName, type FetchLike } from './loader.ts';

const entry = {
  id: 'café',
  word: 'café',
  syllables: ['ca', 'fé'],
  stressIndex: 1,
  type: 'aguda',
  hasTilde: true,
  rule: 'aguda_n_s_vocal',
  world: 2,
  tier: 1,
  distractor: 'cafe',
  sentence: null,
  tags: [],
  features: [],
  related: null,
  freq: 5,
};

const files: Record<string, unknown> = {
  '/words/index.json': {
    version: 'abc123',
    worlds: [
      {
        world: 2,
        name: 'El Tejado Puntiagudo',
        topic: 'agudas',
        file: 'world-02.json',
        count: 1,
        byTier: [1, 0, 0],
      },
    ],
  },
  '/words/world-02.json': {
    world: 2,
    name: 'El Tejado Puntiagudo',
    topic: 'agudas',
    words: [entry],
  },
  '/words/world-03.json': {
    world: 2,
    name: 'El Tejado Puntiagudo',
    topic: 'agudas',
    words: [entry],
  },
};

const fakeFetch: FetchLike = async (url) => ({
  ok: url in files,
  status: url in files ? 200 : 404,
  json: async () => files[url],
});

describe('loader del banco', () => {
  it('arma el nombre del archivo con dos dígitos', () => {
    expect(worldFileName(2)).toBe('world-02.json');
    expect(worldFileName(10)).toBe('world-10.json');
  });

  it('carga y valida el índice', async () => {
    const index = await loadIndex({ fetch: fakeFetch });
    expect(index.version).toBe('abc123');
    expect(index.worlds[0]?.file).toBe('world-02.json');
  });

  it('carga un mundo', async () => {
    const world = await loadWorld(2, { fetch: fakeFetch });
    expect(world.words.map((w) => w.id)).toEqual(['café']);
  });

  it('respeta baseUrl', async () => {
    const seen: string[] = [];
    const spy: FetchLike = (url) => {
      seen.push(url);
      return fakeFetch(url.replace('/base/', '/words/'));
    };
    await loadIndex({ fetch: spy, baseUrl: '/base/' });
    expect(seen).toEqual(['/base/index.json']);
  });

  it('falla si el archivo no existe', async () => {
    await expect(loadWorld(4, { fetch: fakeFetch })).rejects.toThrow('404');
  });

  it('falla si el archivo trae otro mundo', async () => {
    await expect(loadWorld(3, { fetch: fakeFetch })).rejects.toThrow('trae el mundo 2');
  });

  it('falla si el JSON no cumple el esquema', async () => {
    const broken: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version: 1, worlds: [] }),
    });
    await expect(loadIndex({ fetch: broken })).rejects.toThrow();
  });
});
