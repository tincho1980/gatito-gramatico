// Rutas (arquitectura §2).
import { createBrowserRouter, Navigate } from 'react-router';
import { Home } from './features/home/Home.tsx';
import { LessonPage } from './features/lesson/LessonPage.tsx';
import { MapPage } from './features/map/MapPage.tsx';
import { WorldPage } from './features/map/WorldPage.tsx';
import { ProfilePage } from './features/profile/ProfilePage.tsx';
import { RoundPage } from './features/round/RoundPage.tsx';

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/mapa', element: <MapPage /> },
  { path: '/mundo/:id', element: <WorldPage /> },
  { path: '/mundo/:id/leccion', element: <LessonPage /> },
  { path: '/ronda', element: <RoundPage /> },
  { path: '/perfil', element: <ProfilePage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
