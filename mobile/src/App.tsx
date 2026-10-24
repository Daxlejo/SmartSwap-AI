import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { router } from './router';

export const App = () => {
  useEffect(() => {
    const backListenerPromise = CapApp.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;
      const rootPaths = ['/home', '/login', '/splash', '/'];

      if (rootPaths.includes(currentPath)) {
        CapApp.exitApp();
      } else if (canGoBack || window.history.length > 1) {
        window.history.back();
      } else {
        router.navigate('/home');
      }
    });

    return () => {
      backListenerPromise.then((handler) => handler.remove()).catch(() => {});
    };
  }, []);

  return <RouterProvider router={router} />;
};
