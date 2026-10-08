// Avisos arriba de la pantalla, sobre cualquier página.
import { useNotices } from './store.ts';

export function Toaster() {
  const { notices, dismiss } = useNotices();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto flex max-w-md flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      role="status"
      aria-label="Avisos"
      aria-live="polite"
    >
      {notices.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => dismiss(n.id)}
          className="pointer-events-auto flex min-h-12 animate-toast-in items-center gap-3 rounded-2xl border-2 border-pink-200 bg-white px-4 py-2 text-left font-bold text-gray-800 shadow-lg"
        >
          <span className="text-2xl" aria-hidden>
            {n.icon}
          </span>
          <span>{n.text}</span>
        </button>
      ))}
    </div>
  );
}
