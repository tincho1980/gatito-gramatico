// Rutas (arquitectura §2). En esta etapa: inicio, ronda y perfil.
import { createBrowserRouter, Navigate } from 'react-router';
import { Home } from './features/home/Home.tsx';
import { ProfilePage } from './features/profile/ProfilePage.tsx';
import { RoundPage } from './features/round/RoundPage.tsx';

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/ronda', element: <RoundPage /> },
  { path: '/perfil', element: <ProfilePage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
