import { Outlet } from 'react-router';
import { Toaster } from './features/notify/Toaster.tsx';
import { UpdatePrompt } from './features/pwa/UpdatePrompt.tsx';

/** Marco de todas las pantallas: la página, los avisos encima y el de versión nueva. */
export function Layout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <UpdatePrompt />
    </>
  );
}
