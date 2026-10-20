// Panel de depuración: carga estados de prueba (ver presets.ts).
import { useState } from 'react';
import { WORLDS } from '@gatita/shared';
import { Boss } from '../../components/Boss.tsx';
import { db } from '../../db/db.ts';
import { useWords } from '../../words/words.ts';
import { PRESETS } from './presets.ts';

export function DebugPanel({ profileId }: { profileId: string }) {
  const { words } = useWords();
  // Avisa cuando terminó de guardar: los e2e esperan esto antes de navegar.
  const [loaded, setLoaded] = useState<string | null>(null);
  if (!words) return null;
  return (
    <>
      <details className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-bold text-gray-600">Debug: cargar estado</summary>
        <div className="mt-2 grid gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="min-h-11 rounded-xl bg-gray-100 px-3 text-left font-semibold text-gray-700"
              onClick={() => {
                setLoaded(null);
                void db.profileState
                  .put({
                    profileId,
                    state: p.build(words.index),
                    updatedAt: new Date().toISOString(),
                  })
                  .then(() => setLoaded(p.name));
              }}
            >
              {p.name}
            </button>
          ))}
          {loaded && (
            <p role="status" className="font-semibold text-gray-600">
              Cargado: {loaded}
            </p>
          )}
        </div>
      </details>
      <BossGallery />
    </>
  );
}

/** Los 10 jefes en sus tres momentos, para revisar los dibujos. */
function BossGallery() {
  return (
    <details className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-bold text-gray-600">Debug: jefes</summary>
      <ul className="mt-2 grid gap-3">
        {WORLDS.map((w) => (
          <li key={w.id}>
            <p className="font-semibold text-gray-700">
              {w.id}. {w.boss.name}
            </p>
            <div className="flex gap-2">
              <Boss world={w.id} className="h-24 w-24" />
              <Boss world={w.id} mood="gloat" className="h-24 w-24" />
              <Boss world={w.id} mood="friend" className="h-24 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
