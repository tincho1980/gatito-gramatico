import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useLocalStorage, useHashLocation } from './services/hooks';
import { User } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Game from './pages/Game';
import Practice from './pages/Practice';
import Achievements from './pages/Achievements';

export default function App() {
  const [users, setUsers] = useLocalStorage<User[]>('gg_users', []);
  const [currentUserEmail, setCurrentUserEmail] = useLocalStorage<string | null>('gg_current_user', null);
  const [location, navigate] = useHashLocation();

  const currentUser = users.find(u => u.email === currentUserEmail) || null;

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
        history: []
      }
    };
    setUsers([...users, newUser]);
    setCurrentUserEmail(email);
    navigate('/');
  };

  const handleLogout = () => {
    setCurrentUserEmail(null);
    navigate('/');
  };

  const handleGameEnd = (score: number, efficiency: number, avgLevel: number) => {
    if (!currentUser) return;

    const newHistoryItem = {
      date: new Date().toISOString(),
      score,
      efficiency,
      averageLevel: avgLevel
    };

    const updatedUser = { ...currentUser };
    updatedUser.stats.totalRounds += 1;
    updatedUser.stats.totalScore += score;
    updatedUser.stats.maxScore = Math.max(updatedUser.stats.maxScore, score);
    updatedUser.stats.history.push(newHistoryItem);
    
    // Recalculate averages
    const totalEfficiency = updatedUser.stats.history.reduce((acc, curr) => acc + curr.efficiency, 0);
    updatedUser.stats.averageEfficiency = totalEfficiency / updatedUser.stats.history.length;
    
    const totalLevels = updatedUser.stats.history.reduce((acc, curr) => acc + curr.averageLevel, 0);
    updatedUser.stats.averageLevel = totalLevels / updatedUser.stats.history.length;

    // Check General Medals
    if (efficiency === 100 && !updatedUser.medals.includes('Gatito Perfecto')) {
      updatedUser.medals.push('Gatito Perfecto');
    }
    if (updatedUser.stats.totalRounds >= 5 && !updatedUser.medals.includes('Gatito Constante')) {
      updatedUser.medals.push('Gatito Constante');
    }

    // New Level Mastery Medals (Level 5 to 10 with >= 80% efficiency)
    // We check against the level played in this specific round
    if (efficiency >= 80) {
        // Check for specific level mastery based on the rounded average level of the game played
        const levelPlayed = Math.round(avgLevel);
        
        // If they played at level 5 or higher with good efficiency, grant all badges up to that level
        // e.g. Playing level 7 well grants level 7 badge (and potentially lower ones if we wanted, but let's stick to strict level matching or threshold)
        // User asked: "Agregá un logo por llegar a una efectividad del 80% con un nivel promedio de 5, de 6..."
        
        for (let lvl = 5; lvl <= 10; lvl++) {
            const medalName = `Maestro Nivel ${lvl}`;
            // Logic: If the game's average level was at least 'lvl', and they got >= 80%, award it.
            if (avgLevel >= lvl && !updatedUser.medals.includes(medalName)) {
                updatedUser.medals.push(medalName);
            }
        }
    }

    const newUsers = users.map(u => u.email === currentUser.email ? updatedUser : u);
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
