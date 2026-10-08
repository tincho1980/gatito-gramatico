// Instalar la app (plan, etapa 6). Chrome y Edge avisan con `beforeinstallprompt`, que se
// guarda para mostrar un botón propio; Safari en iOS no lo tiene y se explica a mano.
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallStore {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export const useInstall = create<InstallStore>(() => ({ prompt: null, installed: false }));

/** Se llama una vez al arrancar, antes de que el navegador dispare el evento. */
export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // sin el cartel del navegador: el botón aparece cuando corresponde
    useInstall.setState({ prompt: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () =>
    useInstall.setState({ prompt: null, installed: true }),
  );
}

export async function promptInstall(): Promise<void> {
  const e = useInstall.getState().prompt;
  if (!e) return;
  await e.prompt();
  const { outcome } = await e.userChoice;
  useInstall.setState({ prompt: null, installed: outcome === 'accepted' });
}

/** Abierta como app instalada (no en una pestaña del navegador). */
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone o iPad (los iPad nuevos dicen ser Mac, pero tienen pantalla táctil). */
export const isIos = (ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints): boolean =>
  /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);

const DISMISS_KEY = 'gatita.install.dismissed';

export function installDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // sin storage, vuelve a aparecer la próxima vez: no pasa nada
  }
}
