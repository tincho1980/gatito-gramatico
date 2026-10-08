// Registra el service worker y avisa cuando hay una versión nueva (plan, etapa 6). Durante
// una ronda o una lección no se muestra: actualizar recarga la página.
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useNotices } from '../notify/store.ts';

export function UpdatePrompt() {
  const { pathname } = useLocation();
  const push = useNotices((s) => s.push);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    push({ icon: '📶', text: 'Ya podés jugar sin internet' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, push]);

  const playing = pathname === '/ronda' || pathname.endsWith('/leccion');
  if (!needRefresh || playing) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Hay una versión nueva"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex animate-fade-in-up items-center gap-3 rounded-2xl bg-gray-800 px-4 py-3 text-white shadow-lg">
        <span className="flex-1 font-bold">Hay una versión nueva de la gatita.</span>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 px-2 text-sm font-bold text-gray-300"
        >
          Después
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-11 rounded-xl bg-pink-500 px-3 font-heading font-bold"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
