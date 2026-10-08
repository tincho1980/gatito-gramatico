// Rutas (arquitectura §2).
import { createBrowserRouter, Navigate } from 'react-router';
import { AdultPage } from './features/adult/AdultPage.tsx';
import { DashboardPage } from './features/classroom/DashboardPage.tsx';
import { JoinPage } from './features/classroom/JoinPage.tsx';
import { CollectionPage } from './features/collection/CollectionPage.tsx';
import { Home } from './features/home/Home.tsx';
import { LessonPage } from './features/lesson/LessonPage.tsx';
import { MapPage } from './features/map/MapPage.tsx';
import { WorldPage } from './features/map/WorldPage.tsx';
import { NewProfilePage } from './features/profile/NewProfilePage.tsx';
import { ProfilePage } from './features/profile/ProfilePage.tsx';
import { InstallHelp } from './features/pwa/InstallHelp.tsx';
import { ProgressPage } from './features/progress/ProgressPage.tsx';
import { RoundPage } from './features/round/RoundPage.tsx';
import { ShopPage } from './features/shop/ShopPage.tsx';
import { Layout } from './Layout.tsx';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/mapa', element: <MapPage /> },
      { path: '/mundo/:id', element: <WorldPage /> },
      { path: '/mundo/:id/leccion', element: <LessonPage /> },
      { path: '/ronda', element: <RoundPage /> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '/tienda', element: <ShopPage /> },
      { path: '/coleccion', element: <CollectionPage /> },
      { path: '/progreso', element: <ProgressPage /> },
      { path: '/instalar', element: <InstallHelp /> },
      { path: '/nuevo-perfil', element: <NewProfilePage /> },
      { path: '/entrar-al-aula', element: <JoinPage /> },
      { path: '/adultos', element: <AdultPage /> },
      { path: '/aula/:id', element: <DashboardPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
