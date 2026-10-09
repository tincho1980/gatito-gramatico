import { Link } from 'react-router';

/** Enlaces a la política de privacidad y los términos, al pie de las pantallas de entrada. */
export function LegalLinks() {
  return (
    <p className="flex justify-center gap-4 text-sm">
      <Link to="/privacidad" className="inline-flex min-h-11 items-center text-gray-500 underline">
        Privacidad
      </Link>
      <Link to="/terminos" className="inline-flex min-h-11 items-center text-gray-500 underline">
        Términos
      </Link>
    </p>
  );
}
