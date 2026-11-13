import { Outlet, ScrollRestoration } from 'react-router-dom';
import { ServerStatusBanner } from '@/components/ServerStatusBanner';

/**
 * The document is the only scroll container (see `index.css`): no inner element
 * with `overflow: auto`, so a finger drag anywhere scrolls the page on Android.
 */
export const AuthLayout = () => {
  return (
    <div className="min-h-[100dvh] w-full bg-surface sm:bg-surface-container-low flex justify-center">
      <div className="w-full max-w-[390px] min-h-[100dvh] bg-surface flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-surface-container-high/20 relative overflow-x-clip">
        <ServerStatusBanner />
        <main className="flex-1 flex flex-col w-full pt-safe pb-safe">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  );
};
