export function Stars({ count, className = 'text-base' }: { count: number; className?: string }) {
  return (
    <span
      className={`whitespace-nowrap ${className}`}
      aria-label={`${count} de 3 estrellas`}
      role="img"
    >
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'text-amber-400' : 'text-gray-300'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}
