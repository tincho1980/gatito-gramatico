import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router.tsx';
import './index.css';

// El juego viejo guardaba usuarios con email en localStorage: se borra.
try {
  localStorage.removeItem('gg_users');
  localStorage.removeItem('gg_current_user');
  sessionStorage.removeItem('gg_recent_words');
} catch {
  // sin acceso al storage no hay nada que limpiar
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
