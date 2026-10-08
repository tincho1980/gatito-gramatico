import { useEffect, useState } from 'react';
import type { Avatar } from '@gatita/shared';
import { ACCESSORY_SHAPES } from '../content/accessories.tsx';

export type GatitaMood = 'idle' | 'success' | 'error';

interface Palette {
  fur: string;
  /** Orejas, cola y patas (siamés). */
  points: string;
  /** Rayas (atigrado). */
  stripes?: string;
  outline?: string;
}

const PALETTES: Record<Avatar, Palette> = {
  negro: { fur: '#2d2d2d', points: '#2d2d2d' },
  naranja: { fur: '#f59e0b', points: '#f59e0b' },
  gris: { fur: '#9ca3af', points: '#9ca3af' },
  blanco: { fur: '#fafafa', points: '#fafafa', outline: '#d4d4d8' },
  siames: { fur: '#f5e6d3', points: '#5b4636' },
  atigrado: { fur: '#d97706', points: '#d97706', stripes: '#92400e' },
};

interface GatitaProps {
  mood?: GatitaMood;
  avatar?: Avatar;
  className?: string;
  /** Texto para lectores de pantalla; vacío si es decorativa. */
  label?: string;
  /** Accesorio puesto (id de la colección, §8.3). */
  accessory?: string;
}

export function Gatita({
  mood = 'idle',
  avatar = 'negro',
  className = 'w-32 h-32',
  label,
  accessory,
}: GatitaProps) {
  const [blink, setBlink] = useState(false);
  const p = PALETTES[avatar];
  const stroke = p.outline ?? 'none';

  useEffect(() => {
    if (mood !== 'idle') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [mood]);

  return (
    <div
      className={`relative ${className}`}
      {...(label === ''
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label ?? 'La gatita' })}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-xl">
        <path
          d="M80 80 Q95 60 85 50 Q75 40 85 30"
          fill="none"
          stroke={p.points}
          strokeWidth="8"
          strokeLinecap="round"
          className={mood === 'success' ? 'animate-pulse' : ''}
        />
        <ellipse cx="50" cy="70" rx="30" ry="25" fill={p.fur} stroke={stroke} />
        <circle cx="50" cy="45" r="28" fill={p.fur} stroke={stroke} />
        <path d="M28 30 L22 5 L45 25 Z" fill={p.points} stroke={stroke} />
        <path d="M72 30 L78 5 L55 25 Z" fill={p.points} stroke={stroke} />
        <path d="M30 25 L26 10 L40 25 Z" fill="#ec4899" opacity="0.6" />
        <path d="M70 25 L74 10 L60 25 Z" fill="#ec4899" opacity="0.6" />
        {p.stripes && (
          <g stroke={p.stripes} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M42 20 Q50 24 58 20" />
            <path d="M40 27 Q50 31 60 27" />
            <path d="M30 66 Q34 72 30 78" />
            <path d="M70 66 Q66 72 70 78" />
          </g>
        )}
        {mood === 'idle' && (
          <g>
            <ellipse cx="40" cy="42" rx="6" ry={blink ? 0.5 : 7} fill="#fbbf24" />
            <ellipse cx="60" cy="42" rx="6" ry={blink ? 0.5 : 7} fill="#fbbf24" />
            <circle cx="40" cy="42" r={blink ? 0 : 2} fill="black" />
            <circle cx="60" cy="42" r={blink ? 0 : 2} fill="black" />
            <path
              d="M45 55 Q50 58 55 55"
              fill="none"
              stroke="#ec4899"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="35" cy="52" r="3" fill="#ec4899" opacity="0.2" />
            <circle cx="65" cy="52" r="3" fill="#ec4899" opacity="0.2" />
          </g>
        )}
        {mood === 'success' && (
          <g>
            <path
              d="M34 42 Q40 35 46 42"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M54 42 Q60 35 66 42"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M45 52 Q50 62 55 52 Z" fill="#ec4899" />
            <circle cx="32" cy="52" r="4" fill="#ec4899" opacity="0.5" />
            <circle cx="68" cy="52" r="4" fill="#ec4899" opacity="0.5" />
            <circle cx="20" cy="20" r="2" fill="#fbbf24" className="animate-ping" />
            <circle
              cx="80"
              cy="20"
              r="2"
              fill="#fbbf24"
              className="animate-ping"
              style={{ animationDelay: '0.2s' }}
            />
          </g>
        )}
        {mood === 'error' && (
          <g>
            <path
              d="M35 40 Q40 44 45 40"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M55 40 Q60 44 65 40"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M45 58 Q50 53 55 58"
              fill="none"
              stroke="#ec4899"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}
        <circle cx="50" cy="50" r="3" fill="#ec4899" />
        <g stroke="#9ca3af" strokeWidth="1" opacity="0.5">
          <line x1="30" y1="52" x2="10" y2="48" />
          <line x1="30" y1="55" x2="10" y2="55" />
          <line x1="70" y1="52" x2="90" y2="48" />
          <line x1="70" y1="55" x2="90" y2="55" />
        </g>
        {accessory && ACCESSORY_SHAPES[accessory]}
      </svg>
    </div>
  );
}
