import React, { useMemo } from 'react';
import { User } from '../types';
import { Button } from '../components/Button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
  user: User;
  onStartGame: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartGame }) => {
  
  // Prepare chart data
  const chartData = useMemo(() => {
    // Group by date, simple version (just take last 10 games)
    return user.stats.history.slice(-10).map((h, i) => ({
      name: `Juego ${i + 1}`,
      eficiencia: Math.round(h.efficiency),
      nivel: h.averageLevel
    }));
  }, [user.stats.history]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
        <div>
          <h2 className="text-3xl font-heading font-bold text-gray-800">
            ¡Hola, {user.name}! 🐾
          </h2>
          <p className="text-gray-500">¿Listo para practicar hoy?</p>
        </div>
        <Button onClick={onStartGame} size="lg" className="w-full md:w-auto">
          ▶ Jugar Ronda
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon="🎮" 
          value={user.stats.totalRounds} 
          label="Rondas Jugadas" 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          icon="⭐" 
          value={Math.round(user.stats.averageEfficiency) + '%'} 
          label="Efectividad Media" 
          color="bg-yellow-50 text-yellow-600" 
        />
        <StatCard 
          icon="📈" 
          value={user.stats.averageLevel.toFixed(1)} 
          label="Nivel Promedio" 
          color="bg-purple-50 text-purple-600" 
        />
        <StatCard 
          icon="🏅" 
          value={user.medals.length} 
          label="Medallas" 
          color="bg-green-50 text-green-600" 
        />
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          📊 Tu Progreso (Últimos juegos)
        </h3>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="eficiencia" stroke="#ec4899" strokeWidth={3} name="Efectividad %" dot={{r: 4, fill: '#ec4899'}} />
                <Line type="monotone" dataKey="nivel" stroke="#8b5cf6" strokeWidth={3} name="Nivel" dot={{r: 4, fill: '#8b5cf6'}} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Juega una ronda para ver tus estadísticas aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label, color }: any) => (
  <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center ${color}`}>
    <span className="text-3xl mb-1">{icon}</span>
    <span className="text-2xl font-bold">{value}</span>
    <span className="text-xs opacity-80 font-semibold">{label}</span>
  </div>
);

export default Dashboard;