// Carga del banco publicado (`/words/*.json`). El `fetch` es inyectable para testear
// y para usarlo igual en la app y en el Worker; es el único acceso a red de `shared/`.
import { IndexSchema, WorldFileSchema, type WordsIndex, type WorldFile } from '../schemas.ts';

export type FetchLike = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface LoaderOptions {
  fetch?: FetchLike;
  /** Dónde están los JSON. Por defecto `/words`. */
  baseUrl?: string;
}

export const worldFileName = (world: number): string =>
  `world-${String(world).padStart(2, '0')}.json`;

async function getJson(file: string, { fetch, baseUrl = '/words' }: LoaderOptions) {
  const doFetch = fetch ?? (globalThis as unknown as { fetch?: FetchLike }).fetch;
  if (!doFetch) throw new Error('No hay fetch disponible');
  const url = `${baseUrl.replace(/\/$/, '')}/${file}`;
  const res = await doFetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json();
}

export async function loadIndex(options: LoaderOptions = {}): Promise<WordsIndex> {
  return IndexSchema.parse(await getJson('index.json', options));
}

export async function loadWorld(world: number, options: LoaderOptions = {}): Promise<WorldFile> {
  const data = WorldFileSchema.parse(await getJson(worldFileName(world), options));
  if (data.world !== world) throw new Error(`${worldFileName(world)} trae el mundo ${data.world}`);
  return data;
}
