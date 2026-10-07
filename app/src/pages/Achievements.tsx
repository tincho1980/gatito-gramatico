import React from 'react';
import { User } from '../types';

interface AchievementsProps {
  user: User;
}

const Achievements: React.FC<AchievementsProps> = ({ user }) => {
  const allMedals = [
    { id: 'Gatito Perfecto', icon: '👑', desc: 'Consigue 100% de eficiencia en una ronda.' },
    { id: 'Gatito Constante', icon: '📅', desc: 'Juega 5 rondas en total.' },
    // Level Medals
    {
      id: 'Maestro Nivel 5',
      icon: '🥉',
      desc: 'Logra +80% eficiencia en dificultad 5 o superior.',
    },
    {
      id: 'Maestro Nivel 6',
      icon: '🥈',
      desc: 'Logra +80% eficiencia en dificultad 6 o superior.',
    },
    {
      id: 'Maestro Nivel 7',
      icon: '🥇',
      desc: 'Logra +80% eficiencia en dificultad 7 o superior.',
    },
    {
      id: 'Maestro Nivel 8',
      icon: '💎',
      desc: 'Logra +80% eficiencia en dificultad 8 o superior.',
    },
    {
      id: 'Maestro Nivel 9',
      icon: '🚀',
      desc: 'Logra +80% eficiencia en dificultad 9 o superior.',
    },
    {
      id: 'Maestro Nivel 10',
      icon: '🪐',
      desc: 'Logra +80% eficiencia en dificultad 10 o superior.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <h1 className="text-3xl font-heading font-bold text-pink-600 text-center mb-2">
        Sala de Trofeos
      </h1>
      <p className="text-center text-gray-500 mb-8">
        ¡Colecciona todas las medallas demostrando tu ortografía!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allMedals.map((medal) => {
          const isUnlocked = user.medals.includes(medal.id);
          return (
            <div
              key={medal.id}
              className={`p-6 rounded-3xl flex items-center gap-4 border-b-4 transition-all ${
                isUnlocked
                  ? 'bg-white border-yellow-400 shadow-lg transform hover:-translate-y-1'
                  : 'bg-gray-50 border-gray-200 opacity-60 grayscale'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner ${isUnlocked ? 'bg-yellow-50' : 'bg-gray-200'}`}
              >
                {medal.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">{medal.id}</h3>
                <p className="text-sm text-gray-500">{medal.desc}</p>
                {isUnlocked ? (
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full mt-2 inline-block shadow-sm">
                    ¡Conseguido!
                  </span>
                ) : (
                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full mt-2 inline-block">
                    Bloqueado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
