import { Outlet } from 'react-router';
import { Toaster } from './features/notify/Toaster.tsx';
import { TextSize } from './features/profile/TextSize.tsx';
import { UpdatePrompt } from './features/pwa/UpdatePrompt.tsx';
import { SyncManager } from './sync/SyncManager.tsx';

/** Marco de todas las pantallas: la página, los avisos encima y el de versión nueva. */
export function Layout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <UpdatePrompt />
      <SyncManager />
      <TextSize />
    </>
  );
}
