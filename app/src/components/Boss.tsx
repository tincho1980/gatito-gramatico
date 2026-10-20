// §7.3 Los jefes de cada mundo, en el mismo estilo que la gatita (viewBox 100 × 100).
// Cada jefe tiene su cuerpo; la cara es común y cambia con el momento:
// `idle` desafía, `gloat` se ríe (el chico perdió) y `friend` se hace amigo cuando le ganan.
import type { ReactNode } from 'react';
import { bossOf } from '@gatita/shared';

export type BossMood = 'idle' | 'gloat' | 'friend';

interface FaceSpec {
  /** Centro de cada ojo. */
  eyes: [number, number, number, number];
  r: number;
  /** Centro y medio ancho de la boca; sin boca si el jefe tiene pico o dientes. */
  mouth?: [number, number, number];
  ink: string;
  /** Altura de la cabeza, para los corazones del amigo. */
  top: number;
}

interface BossLook {
  body: ReactNode;
  face: FaceSpec;
  /** Lo que va delante de la cara (pinzas, objetos en la mano). */
  front?: ReactNode;
}

/** Espejo horizontal sobre x = 50, para dibujar una sola vez lo que va a los dos lados. */
const mirror = 'translate(100 0) scale(-1 1)';

const LOOKS: Record<number, BossLook> = {
  // Habla todas las sílabas igual: un ratón gris, sin gracia, de orejas enormes.
  1: {
    body: (
      <g>
        <path
          d="M70 82 Q94 86 88 66 Q84 54 94 48"
          fill="none"
          stroke="#a8a29e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="50" cy="75" rx="24" ry="20" fill="#a8a29e" />
        <ellipse cx="38" cy="94" rx="7" ry="4" fill="#78716c" />
        <ellipse cx="62" cy="94" rx="7" ry="4" fill="#78716c" />
        <circle cx="28" cy="26" r="14" fill="#a8a29e" />
        <circle cx="28" cy="26" r="9" fill="#f9a8d4" />
        <circle cx="72" cy="26" r="14" fill="#a8a29e" />
        <circle cx="72" cy="26" r="9" fill="#f9a8d4" />
        <ellipse cx="50" cy="48" rx="24" ry="21" fill="#a8a29e" />
        <circle cx="50" cy="57" r="3.5" fill="#ec4899" />
        <g stroke="#57534e" strokeWidth="1" opacity="0.6">
          <line x1="40" y1="58" x2="22" y2="55" />
          <line x1="40" y1="61" x2="22" y2="63" />
          <line x1="60" y1="58" x2="78" y2="55" />
          <line x1="60" y1="61" x2="78" y2="63" />
        </g>
      </g>
    ),
    face: { eyes: [41, 45, 59, 45], r: 5, mouth: [50, 65, 5], ink: '#292524', top: 12 },
  },
  // Agudas: la fuerza al final, en punta, como su pico y su copete.
  2: {
    body: (
      <g>
        <path d="M22 76 L4 68 L8 86 Z" fill="#64748b" />
        <ellipse cx="48" cy="70" rx="30" ry="24" fill="#94a3b8" />
        <ellipse cx="54" cy="77" rx="17" ry="14" fill="#cbd5e1" />
        <path d="M30 62 Q20 80 44 88 Q40 70 30 62 Z" fill="#64748b" />
        <ellipse cx="54" cy="53" rx="16" ry="6" fill="#a78bfa" opacity="0.7" />
        <path d="M46 24 L43 8 L51 19 L55 4 L58 19 L66 9 L63 24 Z" fill="#64748b" />
        <circle cx="54" cy="38" r="18" fill="#94a3b8" />
        <path d="M70 37 L90 43 L70 48 Z" fill="#f97316" />
        <g stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
          <line x1="42" y1="92" x2="40" y2="98" />
          <line x1="56" y1="92" x2="58" y2="98" />
        </g>
      </g>
    ),
    face: { eyes: [47, 35, 61, 35], r: 4.5, ink: '#1e293b', top: 4 },
  },
  // Graves: tranquilas, pesadas, de siesta. Un sapo con gorro de dormir.
  3: {
    body: (
      <g>
        <ellipse cx="20" cy="88" rx="13" ry="6" fill="#4d7c0f" />
        <ellipse cx="80" cy="88" rx="13" ry="6" fill="#4d7c0f" />
        <ellipse cx="50" cy="68" rx="38" ry="26" fill="#65a30d" />
        <ellipse cx="50" cy="77" rx="24" ry="15" fill="#d9f99d" />
        <path d="M38 34 Q46 8 74 14 Q62 22 62 34 Z" fill="#3b82f6" />
        <path d="M38 34 L62 34" stroke="#bfdbfe" strokeWidth="3" />
        <circle cx="75" cy="14" r="4.5" fill="#fff" />
        <circle cx="34" cy="42" r="12" fill="#65a30d" />
        <circle cx="66" cy="42" r="12" fill="#65a30d" />
        <circle cx="24" cy="62" r="4" fill="#f9a8d4" opacity="0.6" />
        <circle cx="76" cy="62" r="4" fill="#f9a8d4" opacity="0.6" />
      </g>
    ),
    face: { eyes: [34, 42, 66, 42], r: 6, mouth: [50, 61, 14], ink: '#1a2e05', top: 8 },
  },
  // Esdrújulas: la fuerza bien atrás y arriba, como la ardilla que trepa con su bellota.
  4: {
    body: (
      <g>
        <path d="M60 92 Q100 88 94 50 Q90 16 64 20 Q80 34 76 52 Q72 72 56 80 Z" fill="#ea580c" />
        <path d="M70 30 Q84 36 82 52" fill="none" stroke="#fdba74" strokeWidth="2" />
        <ellipse cx="44" cy="74" rx="20" ry="20" fill="#c2410c" />
        <ellipse cx="44" cy="78" rx="12" ry="13" fill="#fed7aa" />
        <path d="M30 34 L27 14 L41 28 Z" fill="#c2410c" />
        <path d="M58 34 L62 14 L48 28 Z" fill="#c2410c" />
        <circle cx="44" cy="45" r="20" fill="#c2410c" />
        <ellipse cx="44" cy="54" rx="9" ry="6" fill="#fed7aa" />
        <circle cx="44" cy="51" r="2.2" fill="#431407" />
      </g>
    ),
    face: { eyes: [37, 42, 51, 42], r: 4.5, mouth: [44, 57, 4], ink: '#431407', top: 6 },
    front: (
      <g>
        <ellipse cx="44" cy="82" rx="6" ry="7" fill="#a16207" />
        <path d="M37 78 Q44 70 51 78 Z" fill="#713f12" />
        <line x1="44" y1="73" x2="45" y2="69" stroke="#713f12" strokeWidth="2" />
      </g>
    ),
  },
  // Las tres mezcladas: un pulpo que enreda ovillos con sus brazos.
  5: {
    body: (
      <g>
        <g fill="none" stroke="#c026d3" strokeWidth="8" strokeLinecap="round">
          <path d="M24 60 Q14 78 22 94" />
          <path d="M37 64 Q42 82 34 96" />
          <path d="M50 64 Q44 82 52 97" />
          <path d="M63 64 Q70 82 64 96" />
          <path d="M76 60 Q88 76 78 94" />
        </g>
        <ellipse cx="50" cy="42" rx="30" ry="28" fill="#c026d3" />
        <circle cx="33" cy="26" r="3" fill="#e879f9" />
        <circle cx="64" cy="22" r="4" fill="#e879f9" />
        <circle cx="72" cy="38" r="2.5" fill="#e879f9" />
      </g>
    ),
    face: { eyes: [40, 44, 60, 44], r: 6, mouth: [50, 58, 5], ink: '#4a044e', top: 12 },
    front: (
      <g>
        <path d="M22 94 Q8 96 12 86" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <circle cx="12" cy="80" r="8" fill="#38bdf8" />
        <path d="M6 76 Q12 82 18 76 M5 82 Q12 88 19 82" fill="none" stroke="#0369a1" />
        <path d="M78 94 Q92 98 88 84" fill="none" stroke="#facc15" strokeWidth="1.5" />
        <circle cx="88" cy="78" r="8" fill="#facc15" />
        <path d="M82 74 Q88 80 94 74 M81 80 Q88 86 95 80" fill="none" stroke="#a16207" />
      </g>
    ),
  },
  // Diptongos: vocales abrazadas. Un cangrejo que abraza todo con sus pinzas.
  6: {
    body: (
      <g>
        {[0, 1].map((side) => (
          <g key={side} transform={side ? mirror : undefined}>
            <g stroke="#b91c1c" strokeWidth="4" strokeLinecap="round">
              <line x1="28" y1="70" x2="10" y2="78" />
              <line x1="28" y1="76" x2="10" y2="88" />
              <line x1="30" y1="82" x2="16" y2="96" />
            </g>
            <path
              d="M30 62 Q14 52 17 36"
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line x1="44" y1="54" x2="40" y2="36" stroke="#b91c1c" strokeWidth="3" />
          </g>
        ))}
        <ellipse cx="50" cy="68" rx="30" ry="20" fill="#ef4444" />
        <circle cx="38" cy="62" r="3" fill="#fca5a5" />
        <circle cx="62" cy="62" r="3" fill="#fca5a5" />
      </g>
    ),
    face: { eyes: [40, 32, 60, 32], r: 6, mouth: [50, 74, 6], ink: '#450a0a', top: 18 },
    front: (
      <g>
        {[0, 1].map((side) => (
          <path
            key={side}
            transform={side ? mirror : undefined}
            d="M18 12 Q4 14 6 30 Q10 42 22 38 L15 29 L27 24 Q29 12 18 12 Z"
            fill="#ef4444"
            stroke="#b91c1c"
            strokeWidth="1.5"
          />
        ))}
      </g>
    ),
  },
  // Hiatos: vocales separadas. Un castor que muerde el puente con sus dientes.
  7: {
    body: (
      <g>
        <g transform="rotate(-20 78 86)">
          <ellipse cx="78" cy="86" rx="18" ry="8" fill="#57534e" />
          <path
            d="M66 82 L90 90 M66 90 L90 82 M72 80 L72 92 M84 80 L84 92"
            stroke="#44403c"
            strokeWidth="1"
          />
        </g>
        <ellipse cx="46" cy="72" rx="24" ry="22" fill="#92400e" />
        <ellipse cx="46" cy="77" rx="14" ry="14" fill="#d6a76a" />
        <circle cx="30" cy="28" r="5" fill="#78350f" />
        <circle cx="62" cy="28" r="5" fill="#78350f" />
        <circle cx="46" cy="44" r="20" fill="#92400e" />
        <ellipse cx="46" cy="54" rx="10" ry="7" fill="#d6a76a" />
        <ellipse cx="46" cy="49" rx="4" ry="3" fill="#1c0a00" />
        <rect x="41.5" y="57" width="9" height="9" rx="1.5" fill="#fff" stroke="#1c0a00" />
        <line x1="46" y1="57" x2="46" y2="66" stroke="#1c0a00" />
      </g>
    ),
    face: { eyes: [38, 40, 54, 40], r: 4.5, ink: '#1c0a00', top: 18 },
    front: (
      <g transform="rotate(-15 28 82)">
        <path d="M10 78 L44 78 L44 86 L36 84 L40 88 L10 86 Z" fill="#a16207" />
        <line x1="12" y1="82" x2="34" y2="82" stroke="#713f12" strokeWidth="1" />
      </g>
    ),
  },
  // Tú / tu, él / el: palabras gemelas. Un loro que copia todo lo que oye.
  8: {
    body: (
      <g>
        <line
          x1="22"
          y1="93"
          x2="78"
          y2="93"
          stroke="#78350f"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M44 84 L36 99 L48 92 L52 99 L56 84 Z" fill="#2563eb" />
        <ellipse cx="50" cy="68" rx="20" ry="24" fill="#16a34a" />
        <ellipse cx="50" cy="74" rx="11" ry="14" fill="#86efac" />
        {[0, 1].map((side) => (
          <path
            key={side}
            transform={side ? mirror : undefined}
            d="M31 56 Q20 76 38 90 Q36 70 31 56 Z"
            fill="#15803d"
          />
        ))}
        <path d="M44 24 Q38 8 50 3 Q46 14 52 20 Q56 6 66 8 Q57 15 58 24 Z" fill="#dc2626" />
        <circle cx="50" cy="38" r="18" fill="#16a34a" />
        <path d="M49 41 Q63 38 61 55 Q57 48 49 50 Z" fill="#fbbf24" />
        <g stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
          <line x1="44" y1="90" x2="44" y2="95" />
          <line x1="56" y1="90" x2="56" y2="95" />
        </g>
      </g>
    ),
    face: { eyes: [42, 34, 58, 34], r: 4.5, ink: '#052e16', top: 2 },
  },
  // Qué, cómo: las preguntas. Un búho que pregunta todo.
  9: {
    body: (
      <g>
        <ellipse cx="50" cy="66" rx="28" ry="28" fill="#78716c" />
        {[0, 1].map((side) => (
          <path
            key={side}
            transform={side ? mirror : undefined}
            d="M24 54 Q12 76 30 92 Q28 72 24 54 Z"
            fill="#57534e"
          />
        ))}
        <ellipse cx="50" cy="72" rx="16" ry="18" fill="#e7e5e4" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fontFamily="sans-serif"
          fill="#0d9488"
        >
          ?
        </text>
        <path d="M27 22 L23 4 L39 16 Z" fill="#57534e" />
        <path d="M73 22 L77 4 L61 16 Z" fill="#57534e" />
        <ellipse cx="50" cy="34" rx="27" ry="20" fill="#78716c" />
        <circle cx="39" cy="34" r="11" fill="#d6d3d1" />
        <circle cx="61" cy="34" r="11" fill="#d6d3d1" />
        <path d="M46 43 L54 43 L50 51 Z" fill="#f59e0b" />
        <g stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
          <line x1="42" y1="93" x2="40" y2="98" />
          <line x1="58" y1="93" x2="60" y2="98" />
        </g>
      </g>
    ),
    face: { eyes: [39, 34, 61, 34], r: 7.5, ink: '#1c1917', top: 2 },
  },
  // Casos especiales: el último jefe. Un dragón que borra tildes con su goma.
  10: {
    body: (
      <g>
        <path
          d="M68 84 Q92 92 90 70"
          fill="none"
          stroke="#7c3aed"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M84 70 L96 58 L95 74 Z" fill="#fde68a" />
        {[0, 1].map((side) => (
          <path
            key={side}
            transform={side ? mirror : undefined}
            d="M32 54 Q4 30 6 62 Q14 56 18 66 Q22 58 30 64 Z"
            fill="#6d28d9"
          />
        ))}
        <ellipse cx="50" cy="73" rx="24" ry="22" fill="#7c3aed" />
        <ellipse cx="50" cy="77" rx="14" ry="15" fill="#c4b5fd" />
        <g stroke="#a78bfa" strokeWidth="1.5">
          <line x1="40" y1="70" x2="60" y2="70" />
          <line x1="38" y1="77" x2="62" y2="77" />
          <line x1="40" y1="84" x2="60" y2="84" />
        </g>
        <path d="M34 26 L28 4 L45 20 Z" fill="#fde68a" />
        <path d="M66 26 L72 4 L55 20 Z" fill="#fde68a" />
        <ellipse cx="50" cy="40" rx="24" ry="20" fill="#7c3aed" />
        <path d="M44 22 L47 15 L50 22 L53 15 L56 22" fill="#a78bfa" />
        <ellipse cx="50" cy="50" rx="12" ry="8" fill="#8b5cf6" />
        <circle cx="46" cy="48" r="1.5" fill="#1e1b4b" />
        <circle cx="54" cy="48" r="1.5" fill="#1e1b4b" />
      </g>
    ),
    face: { eyes: [40, 36, 60, 36], r: 5.5, mouth: [50, 56, 6], ink: '#1e1b4b', top: 4 },
    front: (
      <g>
        <g transform="rotate(-20 72 78)">
          <rect x="62" y="72" width="11" height="12" rx="2" fill="#f472b6" />
          <rect x="73" y="72" width="11" height="12" rx="2" fill="#60a5fa" />
        </g>
        <g stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
          <line x1="86" y1="64" x2="89" y2="59" />
          <line x1="80" y1="58" x2="83" y2="53" />
          <line x1="92" y1="70" x2="95" y2="65" />
        </g>
      </g>
    ),
  },
};

function Face({ face, mood }: { face: FaceSpec; mood: BossMood }) {
  const { eyes, r, mouth, ink, top } = face;
  const [lx, ly, rx, ry] = eyes;
  const pairs: [number, number, 1 | -1][] = [
    [lx, ly, 1],
    [rx, ry, -1],
  ];
  const line = { fill: 'none', stroke: ink, strokeWidth: 2, strokeLinecap: 'round' } as const;

  if (mood === 'friend') {
    return (
      <g>
        {pairs.map(([x, y, side]) => (
          <g key={x}>
            <circle cx={x} cy={y} r={r} fill={ink} />
            <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#fff" />
            <circle cx={x + r * 0.3} cy={y + r * 0.3} r={r * 0.15} fill="#fff" />
            {/* Cejas suaves, levantadas: ya no frunce. */}
            <path
              d={`M${x - r * 0.8} ${y - r - 2} Q${x} ${y - r - 4.5} ${x + r * 0.8} ${y - r - 2}`}
              {...line}
              strokeWidth={1.5}
            />
            <circle
              cx={x - side * r * 0.9}
              cy={y + r + 2.5}
              r={r * 0.6}
              fill="#f9a8d4"
              opacity="0.8"
            />
          </g>
        ))}
        {mouth && (
          <g>
            <path
              d={`M${mouth[0] - mouth[2]} ${mouth[1] - 1} Q${mouth[0]} ${mouth[1] + mouth[2] * 1.2} ${mouth[0] + mouth[2]} ${mouth[1] - 1} Z`}
              fill={ink}
            />
            <ellipse
              cx={mouth[0]}
              cy={mouth[1] + mouth[2] * 0.35}
              rx={mouth[2] * 0.45}
              ry={mouth[2] * 0.2}
              fill="#f472b6"
            />
          </g>
        )}
        <g className="animate-pulse">
          {[
            [32, top + 2, 1],
            [68, top - 2, 1.2],
          ].map(([x, y, k]) => (
            <path
              key={x}
              transform={`translate(${x} ${y}) scale(${k})`}
              d="M0 3 C-6 -2 -3 -7 0 -3 C3 -7 6 -2 0 3 Z"
              fill="#f472b6"
            />
          ))}
        </g>
      </g>
    );
  }

  // Cejas de pícaro: más bajas del lado de la nariz.
  const brows = pairs.map(([x, y, side]) => (
    <line
      key={x}
      x1={x - r * side}
      y1={y - r - 3}
      x2={x + r * side}
      y2={y - r - (mood === 'gloat' ? 1.5 : 0.5)}
      {...line}
    />
  ));

  if (mood === 'gloat') {
    return (
      <g>
        {pairs.map(([x, y]) => (
          <path key={x} d={`M${x - r} ${y + 1} Q${x} ${y - r * 1.1} ${x + r} ${y + 1}`} {...line} />
        ))}
        {brows}
        {mouth && (
          <path
            d={`M${mouth[0] - mouth[2]} ${mouth[1] - 1} Q${mouth[0]} ${mouth[1] + mouth[2] * 1.3} ${mouth[0] + mouth[2]} ${mouth[1] - 1} Z`}
            fill={ink}
          />
        )}
      </g>
    );
  }

  return (
    <g>
      {pairs.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill="#fff" stroke={ink} strokeWidth="0.8" />
          <circle cx={x + r * 0.2} cy={y + r * 0.15} r={r * 0.5} fill={ink} />
        </g>
      ))}
      {brows}
      {mouth && (
        <path
          d={`M${mouth[0] - mouth[2]} ${mouth[1]} Q${mouth[0]} ${mouth[1] + mouth[2] * 0.6} ${mouth[0] + mouth[2]} ${mouth[1] - mouth[2] * 0.4}`}
          {...line}
        />
      )}
    </g>
  );
}

interface BossProps {
  world: number;
  mood?: BossMood;
  className?: string;
  /** Texto para lectores de pantalla; vacío si es decorativo. Por omisión, el nombre. */
  label?: string;
}

export function Boss({ world, mood = 'idle', className = 'h-32 w-32', label }: BossProps) {
  const look = LOOKS[world];
  if (!look) return null;
  const name = label ?? bossOf(world).name;
  return (
    <div
      className={`relative ${className}`}
      {...(name === '' ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-xl">
        {look.body}
        <Face face={look.face} mood={mood} />
        {look.front}
      </svg>
    </div>
  );
}
