import { Outlet } from 'react-router';
import { Toaster } from './features/notify/Toaster.tsx';

/** Marco de todas las pantallas: la página y los avisos encima. */
export function Layout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
