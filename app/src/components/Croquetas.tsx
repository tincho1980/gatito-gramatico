/** Cantidad de croquetas con su ícono. */
export function Croquetas({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-heading font-bold ${className}`}
      role="img"
      aria-label={`${value} ${value === 1 ? 'croqueta' : 'croquetas'}`}
    >
      <span aria-hidden>🐟</span>
      <span aria-hidden>{value}</span>
    </span>
  );
}
