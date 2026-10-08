// Accesorios de la colección (§8.3), dibujados sobre la gatita en su viewBox de 100 × 100.
// La cabeza es un círculo en (50, 45) de radio 28; las orejas llegan hasta y = 5.
import type { ReactNode } from 'react';

export const ACCESSORY_SHAPES: Readonly<Record<string, ReactNode>> = {
  'mono-rosa': (
    <g transform="translate(66 22) rotate(20)">
      <path d="M0 0 L-10 -7 L-10 7 Z" fill="#ec4899" />
      <path d="M0 0 L10 -7 L10 7 Z" fill="#ec4899" />
      <circle r="3" fill="#be185d" />
    </g>
  ),
  flor: (
    <g transform="translate(31 24)">
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={5 * Math.cos((a * Math.PI) / 180)}
          cy={5 * Math.sin((a * Math.PI) / 180)}
          r="4"
          fill="#f9a8d4"
        />
      ))}
      <circle r="3" fill="#facc15" />
    </g>
  ),
  'collar-cascabel': (
    <g>
      <path d="M31 66 Q50 76 69 66" fill="none" stroke="#dc2626" strokeWidth="5" />
      <circle cx="50" cy="75" r="5" fill="#facc15" stroke="#a16207" strokeWidth="1" />
      <line x1="50" y1="76" x2="50" y2="79" stroke="#a16207" strokeWidth="1.2" />
    </g>
  ),
  pajarita: (
    <g transform="translate(50 72)">
      <path d="M0 0 L-11 -6 L-11 6 Z" fill="#2563eb" />
      <path d="M0 0 L11 -6 L11 6 Z" fill="#2563eb" />
      <rect x="-3" y="-3" width="6" height="6" rx="1.5" fill="#1e3a8a" />
    </g>
  ),
  lentes: (
    <g fill="none" stroke="#1f2937" strokeWidth="2">
      <circle cx="40" cy="42" r="9" fill="#e0f2fe" fillOpacity="0.35" />
      <circle cx="60" cy="42" r="9" fill="#e0f2fe" fillOpacity="0.35" />
      <path d="M49 42 Q50 39 51 42" />
    </g>
  ),
  bufanda: (
    <g>
      <path d="M28 64 Q50 78 72 64 L72 71 Q50 85 28 71 Z" fill="#16a34a" />
      <path d="M60 72 L66 92 L58 92 L54 74 Z" fill="#15803d" />
      <path d="M36 68 L36 75 M44 71 L44 78 M52 72 L52 79" stroke="#bbf7d0" strokeWidth="2" />
    </g>
  ),
  galera: (
    <g>
      <rect x="38" y="2" width="24" height="18" rx="2" fill="#111827" />
      <rect x="38" y="14" width="24" height="4" fill="#be185d" />
      <ellipse cx="50" cy="20" rx="19" ry="3.5" fill="#111827" />
    </g>
  ),
  'gorro-mago': (
    <g>
      <path d="M36 21 L52 -6 L64 21 Z" fill="#6d28d9" />
      <ellipse cx="50" cy="21" rx="18" ry="3.5" fill="#5b21b6" />
      <circle cx="49" cy="10" r="1.8" fill="#fde047" />
      <circle cx="56" cy="15" r="1.4" fill="#fde047" />
      <circle cx="45" cy="17" r="1.2" fill="#fde047" />
    </g>
  ),
  'corona-gata-sabia': (
    <g>
      <path
        d="M35 21 L37 6 L44 14 L50 3 L56 14 L63 6 L65 21 Z"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1"
      />
      <circle cx="50" cy="15" r="2.2" fill="#ec4899" />
      <circle cx="41" cy="17" r="1.6" fill="#38bdf8" />
      <circle cx="59" cy="17" r="1.6" fill="#38bdf8" />
    </g>
  ),
};
