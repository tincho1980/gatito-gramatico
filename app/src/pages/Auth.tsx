import React, { useState } from 'react';
import { User } from '../types';
import { Button } from '../components/Button';
import { playSound } from '../services/soundService';

interface AuthProps {
  onLogin: (email: string) => void;
  onRegister: (name: string, email: string) => void;
  existingUsers: User[];
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, existingUsers }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSound('click');
    setError('');

    if (!email) {
      setError('Por favor ingresa un email.');
      return;
    }

    if (isLogin) {
      const user = existingUsers.find((u) => u.email === email);
      if (user) {
        onLogin(email);
      } else {
        setError('Usuario no encontrado. ¿Quieres registrarte?');
      }
    } else {
      if (!name) {
        setError('Por favor ingresa tu nombre.');
        return;
      }
      if (existingUsers.find((u) => u.email === email)) {
        setError('Este email ya está registrado.');
        return;
      }
      onRegister(name, email);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-pink-100">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐱</div>
          <h1 className="text-3xl font-heading font-bold text-pink-600">Gatito Gramático</h1>
          <p className="text-gray-500 mt-2">¡Aprende acentuación jugando!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tu Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-100 focus:border-pink-400 outline-none transition"
                placeholder="Ej. Michi"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-pink-100 focus:border-pink-400 outline-none transition"
              placeholder="nombre@ejemplo.com"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg">
            {isLogin ? 'Entrar' : 'Registrarse'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-pink-500 font-bold hover:underline text-sm"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
