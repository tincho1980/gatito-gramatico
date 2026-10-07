import { describe, expect, it } from 'vitest';
import { WordType } from '../types';
import { WORD_BANK, getWords } from './wordService';

const typeOf = (word: string) => WORD_BANK.find(([w]) => w === word)?.[1];

describe('banco mínimo del juego viejo', () => {
  it('corrige los errores del FALLBACK_POOL anterior', () => {
    expect(typeOf('mamá')).toBe(WordType.Aguda);
    expect(typeOf('lápiz')).toBe(WordType.Grave);
    expect(typeOf('examen')).toBe(WordType.Grave);
    expect(typeOf('gramática')).toBe(WordType.Esdrujula);
    expect(typeOf('agrícola')).toBe(WordType.Esdrujula);
    expect(typeOf('idiosincrasia')).toBe(WordType.Grave);
    expect(typeOf('esternocleidomastoideo')).toBe(WordType.Grave);
    expect(typeOf('electroencefalografista')).toBe(WordType.Grave);
  });

  it('no repite palabras', () => {
    const words = WORD_BANK.map(([w]) => w);
    expect(new Set(words).size).toBe(words.length);
  });

  it('arma una ronda de 20 palabras distintas, coherentes con la tilde', () => {
    const round = getWords(5);
    expect(round).toHaveLength(20);
    expect(new Set(round.map((w) => w.correctWord)).size).toBe(20);
    for (const w of round) {
      expect(w.hasTilde).toBe(w.correctWord !== w.displayWord);
      if (w.type === WordType.Esdrujula) expect(w.hasTilde).toBe(true);
    }
  });

  it('evita las palabras recién jugadas si alcanza el banco', () => {
    const excluded = getWords(3).map((w) => w.displayWord);
    const next = getWords(3, { excludeWords: excluded });
    expect(next.some((w) => excluded.includes(w.displayWord))).toBe(false);
  });
});
