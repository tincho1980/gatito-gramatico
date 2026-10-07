// Azar con semilla: todo el sorteo del motor pasa por acá para que los tests sean deterministas.

/** Devuelve un número en [0, 1). */
export type Rng = () => number;

/** mulberry32: chico, rápido y suficiente para sortear palabras. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un texto (por ejemplo, el id de la ronda). */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Índice elegido con probabilidad proporcional al peso. -1 si no hay peso positivo. */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i] ?? 0);
    if (r < w) return i;
    r -= w;
  }
  // por redondeo: el último con peso
  for (let i = weights.length - 1; i >= 0; i--) if ((weights[i] ?? 0) > 0) return i;
  return -1;
}

/** Saca `count` elementos sin reposición, ponderados. */
export function weightedSample<T>(
  items: readonly T[],
  count: number,
  weight: (item: T) => number,
  rng: Rng,
): T[] {
  const pool = [...items];
  const weights = pool.map(weight);
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const i = weightedIndex(weights, rng);
    if (i < 0) break;
    out.push(pool[i] as T);
    pool.splice(i, 1);
    weights.splice(i, 1);
  }
  return out;
}

/** Fisher-Yates con el rng dado. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
