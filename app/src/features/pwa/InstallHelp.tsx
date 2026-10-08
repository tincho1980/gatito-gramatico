// Ayuda para instalar en iPhone y iPad: Safari no tiene botón de instalar.
import { PageHeader } from '../../components/PageHeader.tsx';

const STEPS = [
  { icon: '🧭', text: 'Abrí la gatita en Safari.' },
  { icon: '⬆️', text: 'Tocá el botón Compartir (el cuadrado con la flecha para arriba).' },
  { icon: '➕', text: 'Elegí "Agregar a inicio". Si no lo ves, deslizá la lista hacia abajo.' },
  { icon: '✅', text: 'Tocá "Agregar". La gatita queda en tu pantalla, como cualquier app.' },
];

export function InstallHelp() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PageHeader title="Instalar la gatita" />
      <ol className="grid gap-3">
        {STEPS.map((s, i) => (
          <li
            key={s.icon}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-3xl" aria-hidden>
              {s.icon}
            </span>
            <span className="text-gray-700">
              <strong>{i + 1}.</strong> {s.text}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-gray-600">
        Una vez instalada, podés jugar aunque no haya internet. Tu progreso queda guardado en este
        dispositivo.
      </p>
    </main>
  );
}
