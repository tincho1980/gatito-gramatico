import React, { useEffect, useState } from 'react';

type CatMood = 'idle' | 'success' | 'error';

interface BlackCatProps {
  mood: CatMood;
  className?: string;
  size?: string;
}

export const BlackCat: React.FC<BlackCatProps> = ({ mood, className = '', size = 'w-40 h-40' }) => {
  const [blink, setBlink] = useState(false);

  // Blink effect for idle state
  useEffect(() => {
    if (mood !== 'idle') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [mood]);

  return (
    <div className={`relative ${size} ${className} transition-transform duration-500`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl filter">
        {/* Tail (Background) */}
        <path d="M80 80 Q95 60 85 50 Q75 40 85 30" fill="none" stroke="#2d2d2d" strokeWidth="8" strokeLinecap="round" className={mood === 'success' ? 'animate-pulse' : ''} />

        {/* Body */}
        <ellipse cx="50" cy="70" rx="30" ry="25" fill="#2d2d2d" />
        
        {/* Head */}
        <circle cx="50" cy="45" r="28" fill="#2d2d2d" />
        
        {/* Ears */}
        <path d="M28 30 L22 5 L45 25 Z" fill="#2d2d2d" />
        <path d="M72 30 L78 5 L55 25 Z" fill="#2d2d2d" />
        <path d="M30 25 L26 10 L40 25 Z" fill="#ec4899" opacity="0.6" /> {/* Pink inner ear */}
        <path d="M70 25 L74 10 L60 25 Z" fill="#ec4899" opacity="0.6" />

        {/* Face Content based on Mood */}
        {mood === 'idle' && (
          <g>
            {/* Eyes Open */}
            <ellipse cx="40" cy="42" rx="6" ry={blink ? 0.5 : 7} fill="#fbbf24" />
            <ellipse cx="60" cy="42" rx="6" ry={blink ? 0.5 : 7} fill="#fbbf24" />
            <circle cx="40" cy="42" r={blink ? 0 : 2} fill="black" />
            <circle cx="60" cy="42" r={blink ? 0 : 2} fill="black" />
            {/* Mouth */}
            <path d="M45 55 Q50 58 55 55" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="35" cy="52" r="3" fill="#ec4899" opacity="0.2" />
            <circle cx="65" cy="52" r="3" fill="#ec4899" opacity="0.2" />
          </g>
        )}

        {mood === 'success' && (
          <g className="animate-bounce origin-center">
            {/* Eyes Happy (Inverted U) */}
            <path d="M34 42 Q40 35 46 42" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 42 Q60 35 66 42" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            {/* Mouth Open Happy */}
            <path d="M45 52 Q50 62 55 52 Z" fill="#ec4899" />
            {/* Cheeks */}
            <circle cx="32" cy="52" r="4" fill="#ec4899" opacity="0.5" />
            <circle cx="68" cy="52" r="4" fill="#ec4899" opacity="0.5" />
            {/* Sparkles */}
            <circle cx="20" cy="20" r="2" fill="#fbbf24" className="animate-ping" />
            <circle cx="80" cy="20" r="2" fill="#fbbf24" className="animate-ping" style={{animationDelay: '0.2s'}} />
          </g>
        )}

        {mood === 'error' && (
          <g>
            {/* Eyes Sad (X or Lines) */}
            <path d="M35 38 L45 44" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M45 38 L35 44" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M55 38 L65 44" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            <path d="M65 38 L55 44" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            {/* Mouth Sad */}
            <path d="M45 58 Q50 50 55 58" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
            {/* Tear */}
            <path d="M65 48 Q70 55 65 60 Q60 55 65 48" fill="#60a5fa" className="animate-pulse" />
          </g>
        )}

        {/* Nose (Always there) */}
        <circle cx="50" cy="50" r="3" fill="#ec4899" />
        
        {/* Whiskers */}
        <g stroke="#9ca3af" strokeWidth="1" opacity="0.5">
           <line x1="30" y1="52" x2="10" y2="48" />
           <line x1="30" y1="55" x2="10" y2="55" />
           <line x1="70" y1="52" x2="90" y2="48" />
           <line x1="70" y1="55" x2="90" y2="55" />
        </g>
      </svg>
    </div>
  );
};
