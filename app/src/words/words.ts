// Banco de palabras en la app: se carga una vez desde /words (lo sirve public/words) y se indexa.
import { useEffect, useState } from 'react';
import { indexWords, loadIndex, loadWorld, type WordIndex } from '@gatita/shared';

export interface LoadedWords {
  version: string;
  index: WordIndex;
}

let cache: Promise<LoadedWords> | null = null;

/** Carga todos los mundos. Son livianos (~800 palabras) y hacen falta para los repasos. */
export function loadAllWords(): Promise<LoadedWords> {
  cache ??= (async () => {
    const index = await loadIndex();
    const worlds = await Promise.all(index.worlds.map((w) => loadWorld(w.world)));
    return { version: index.version, index: indexWords(worlds.flatMap((w) => w.words)) };
  })().catch((err: unknown) => {
    cache = null; // que el próximo intento vuelva a probar
    throw err;
  });
  return cache;
}

export function useWords(): { words: LoadedWords | null; error: string | null } {
  const [words, setWords] = useState<LoadedWords | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadAllWords()
      .then((w) => alive && setWords(w))
      .catch(() => alive && setError('No pudimos cargar las palabras. Probá recargar la página.'));
    return () => {
      alive = false;
    };
  }, []);
  return { words, error };
}
