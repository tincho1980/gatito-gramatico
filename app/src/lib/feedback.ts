// Sonido y vibración corta al responder, si el perfil los tiene prendidos.
import { playSound } from './sound.ts';

export function reactTo(kind: 'success' | 'error' | 'click', enabled: boolean): void {
  if (!enabled) return;
  playSound(kind);
  if (kind !== 'click' && 'vibrate' in navigator)
    navigator.vibrate(kind === 'success' ? 30 : [40, 60, 40]);
}
