import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Encabezado de las pantallas secundarias: volver, título y algo a la derecha. */
export function PageHeader({
  title,
  back = '/',
  children,
}: {
  title: string;
  back?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2">
      <Link
        to={back}
        aria-label="Volver"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-pink-600"
      >
        ←
      </Link>
      <h1 className="flex-1 font-heading text-2xl font-bold text-gray-800">{title}</h1>
      {children}
    </header>
  );
}
