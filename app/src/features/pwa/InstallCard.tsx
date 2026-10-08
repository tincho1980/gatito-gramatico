// Ofrece instalar la app después de la segunda ronda (plan, etapa 6).
import { useState } from 'react';
import { Link } from 'react-router';
import { CONFIG } from '@gatita/shared';
import {
  dismissInstall,
  installDismissed,
  isIos,
  isStandalone,
  promptInstall,
  useInstall,
} from './install.ts';

export function InstallCard({ roundsPlayed }: { roundsPlayed: number }) {
  const { prompt, installed } = useInstall();
  const [dismissed, setDismissed] = useState(installDismissed);
  const ios = isIos();
  if (
    installed ||
    dismissed ||
    isStandalone() ||
    roundsPlayed < CONFIG.installAfterRounds ||
    (!prompt && !ios)
  ) {
    return null;
  }

  return (
    <aside className="flex items-center gap-3 rounded-2xl border-2 border-pink-200 bg-white px-3 py-2 shadow-sm">
      <img src="/pwa-64x64.png" alt="" className="h-10 w-10 rounded-xl" />
      <p className="flex-1 text-sm font-semibold text-gray-700">
        Tené la gatita en tu pantalla de inicio, y jugá sin internet.
      </p>
      <div className="flex flex-col gap-1">
        {prompt ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="min-h-11 rounded-xl bg-pink-500 px-3 font-heading font-bold text-white"
          >
            Instalar
          </button>
        ) : (
          <Link
            to="/instalar"
            className="flex min-h-11 items-center rounded-xl bg-pink-500 px-3 font-heading font-bold text-white"
          >
            Cómo
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            dismissInstall();
            setDismissed(true);
          }}
          className="min-h-11 text-xs font-bold text-gray-500"
        >
          Ahora no
        </button>
      </div>
    </aside>
  );
}
