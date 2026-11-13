import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { router } from './router';
import { backActionFor } from './layouts/navigation';

export const App = () => {
  useEffect(() => {
    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      switch (backActionFor(window.location.pathname)) {
        case 'exit':
          void CapApp.exitApp();
          break;
        case 'home':
          // Tabs are siblings: back from any of them returns to Home, not to the previous tab
          void router.navigate('/home', { replace: true });
          break;
        default:
          if (canGoBack || window.history.length > 1) window.history.back();
          else void router.navigate('/home', { replace: true });
      }
    });

    return () => {
      backListenerPromise.then((handler) => handler.remove()).catch(() => {});
    };
  }, []);

  return <RouterProvider router={router} />;
};
