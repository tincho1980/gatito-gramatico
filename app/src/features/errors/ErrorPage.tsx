// Si una pantalla falla: un mensaje amable en lugar del error de React Router, y el aviso al
// Worker (plan, etapa 9). El progreso no se pierde: está guardado en el dispositivo.
import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { Button } from '../../components/Button.tsx';
import { Gatita } from '../../components/Gatita.tsx';
import { reportError } from '../../lib/errors.ts';

export function ErrorPage() {
  const error = useRouteError();
  useEffect(() => reportError(error, 'render'), [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 pt-6 pb-safe text-center">
      <Gatita mood="error" className="h-28 w-28" />
      <h1 className="font-heading text-2xl font-bold text-gray-800">¡Uy! Algo se trabó</h1>
      <p className="text-gray-700">
        Ya nos llegó el aviso. Tu progreso está guardado: volvé a empezar y seguí jugando.
      </p>
      <Button size="lg" className="min-h-14 w-full" onClick={() => window.location.assign('/')}>
        Volver al inicio
      </Button>
    </main>
  );
}
