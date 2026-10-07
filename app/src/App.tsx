import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { useLocalStorage, useHashLocation } from './services/hooks';
import { User } from './types';
import {
  normalizeUserStats,
  computeNextSkillLevel,
  computeEffectiveEfficiency,
  DIFFICULTY_CONFIG,
} from './services/difficultyService';

// Pages
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Game from './pages/Game';
import Practice from './pages/Practice';
import Achievements from './pages/Achievements';

export default function App() {
  const [users, setUsers] = useLocalStorage<User[]>('gg_users', []);
  const [currentUserEmail, setCurrentUserEmail] = useLocalStorage<string | null>(
    'gg_current_user',
    null,
  );
  const [location, navigate] = useHashLocation();

  useEffect(() => {
    const needsMigration = users.some(
      (u) =>
        u.stats.skillLevel === undefined ||
        u.stats.history.some((h) => h.targetLevel === undefined),
    );
    if (needsMigration) {
      setUsers(users.map((u) => ({ ...u, stats: normalizeUserStats(u.stats) })));
    }
  }, []);

  const rawUser = users.find((u) => u.email === currentUserEmail) || null;
  const currentUser = rawUser ? { ...rawUser, stats: normalizeUserStats(rawUser.stats) } : null;

  const handleLogin = (email: string) => {
    setCurrentUserEmail(email);
    navigate('/');
  };

  const handleRegister = (name: string, email: string) => {
    const newUser: User = {
      name,
      email,
      medals: [],
      stats: {
        totalRounds: 0,
        totalScore: 0,
        maxScore: 0,
        averageEfficiency: 0,
        averageLevel: 0,
        skillLevel: DIFFICULTY_CONFIG.default,
        history: [],
      },
    };
    setUsers([...users, newUser]);
    setCurrentUserEmail(email);
    navigate('/');
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    navigate('/');
  };

  const handleGameEnd = (
    score: number,
    efficiency: number,
    avgLevel: number,
    targetLevel: number,
  ) => {
    if (!currentUser) return;

    const updatedUser = { ...currentUser };
    updatedUser.stats.totalRounds += 1;
    updatedUser.stats.totalScore += score;
    updatedUser.stats.maxScore = Math.max(updatedUser.stats.maxScore, score);

    const newHistoryItem = {
      date: new Date().toISOString(),
      score,
      efficiency,
      targetLevel,
      averageLevel: avgLevel,
    };
    updatedUser.stats.history.push(newHistoryItem);

    const totalEfficiency = updatedUser.stats.history.reduce(
      (acc, curr) => acc + curr.efficiency,
      0,
    );
    updatedUser.stats.averageEfficiency = totalEfficiency / updatedUser.stats.history.length;

    const totalLevels = updatedUser.stats.history.reduce((acc, curr) => acc + curr.averageLevel, 0);
    updatedUser.stats.averageLevel = totalLevels / updatedUser.stats.history.length;

    const effectiveEfficiency = computeEffectiveEfficiency(currentUser.stats.history, efficiency);
    updatedUser.stats.skillLevel = computeNextSkillLevel(targetLevel, effectiveEfficiency);

    if (efficiency === 100 && !updatedUser.medals.includes('Gatito Perfecto')) {
      updatedUser.medals.push('Gatito Perfecto');
    }
    if (updatedUser.stats.totalRounds >= 5 && !updatedUser.medals.includes('Gatito Constante')) {
      updatedUser.medals.push('Gatito Constante');
    }

    if (efficiency >= 80) {
      for (let lvl = 5; lvl <= 10; lvl++) {
        const medalName = `Maestro Nivel ${lvl}`;
        if (targetLevel >= lvl && !updatedUser.medals.includes(medalName)) {
          updatedUser.medals.push(medalName);
        }
      }
    }

    const newUsers = users.map((u) => (u.email === currentUser.email ? updatedUser : u));
    setUsers(newUsers);
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} onRegister={handleRegister} existingUsers={users} />;
  }

  const renderPage = () => {
    if (location.startsWith('/game')) {
      return <Game user={currentUser} onEnd={handleGameEnd} onBack={() => navigate('/')} />;
    }
    switch (location) {
      case '/practice':
        return <Practice />;
      case '/achievements':
        return <Achievements user={currentUser} />;
      case '/':
      default:
        return <Dashboard user={currentUser} onStartGame={() => navigate('/game')} />;
    }
  };

  return (
    <Layout user={currentUser} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
}
