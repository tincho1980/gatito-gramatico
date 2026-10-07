import React from 'react';
import { useHashLocation } from '../services/hooks';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

interface NavItemProps {
  to: string;
  icon: string;
  label: string;
  active: boolean;
  onClick: (to: string) => void;
}

const NavItem = ({ to, icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={() => onClick(to)}
    className={`flex flex-col items-center justify-center w-full p-2 rounded-xl transition-colors ${
      active ? 'text-pink-600 bg-pink-100' : 'text-gray-500 hover:bg-white/50'
    }`}
  >
    <span className="text-xl mb-1">{icon}</span>
    <span className="text-xs font-bold">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [loc, navigate] = useHashLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 text-gray-800 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      {user && (
        <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-md border-r border-pink-100 p-6 sticky top-0 h-screen">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl">
              🐱
            </div>
            <h1 className="font-heading text-2xl text-pink-600">
              Gatito
              <br />
              Gramático
            </h1>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => navigate('/')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${loc === '/' || loc === '' ? 'bg-pink-100 text-pink-700' : 'hover:bg-pink-50 text-gray-600'}`}
            >
              🏠 Inicio
            </button>
            <button
              onClick={() => navigate('/practice')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${loc === '/practice' ? 'bg-pink-100 text-pink-700' : 'hover:bg-pink-50 text-gray-600'}`}
            >
              📚 Práctica Libre
            </button>
            <button
              onClick={() => navigate('/achievements')}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${loc === '/achievements' ? 'bg-pink-100 text-pink-700' : 'hover:bg-pink-50 text-gray-600'}`}
            >
              🏆 Logros
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-pink-100">
            <div className="text-sm font-semibold mb-2 text-gray-500">Hola, {user.name}</div>
            <button
              onClick={onLogout}
              className="text-sm text-red-400 hover:text-red-500 font-bold"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">{children}</main>

      {/* Mobile Bottom Nav */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-pink-200 p-2 flex justify-around shadow-lg z-50 pb-safe">
          <NavItem active={loc === '/'} onClick={navigate} to="/" icon="🏠" label="Inicio" />
          <NavItem
            active={loc === '/practice'}
            onClick={navigate}
            to="/practice"
            icon="📚"
            label="Práctica"
          />
          <NavItem
            active={loc === '/achievements'}
            onClick={navigate}
            to="/achievements"
            icon="🏆"
            label="Logros"
          />
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center w-full p-2 text-red-400"
          >
            <span className="text-xl mb-1">🚪</span>
            <span className="text-xs font-bold">Salir</span>
          </button>
        </div>
      )}
    </div>
  );
};
