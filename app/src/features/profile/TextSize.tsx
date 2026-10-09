// Letra más grande (plan, etapa 9): Tailwind mide todo en rem, así que alcanza con agrandar la
// letra base del documento.
import { useEffect } from 'react';
import { useActiveProfile } from './hooks.ts';

export const BIG_TEXT_SIZE = '118.75%'; // 19 px en vez de 16

export function TextSize() {
  const big = !!useActiveProfile()?.bigText;
  useEffect(() => {
    document.documentElement.style.fontSize = big ? BIG_TEXT_SIZE : '';
  }, [big]);
  return null;
}
