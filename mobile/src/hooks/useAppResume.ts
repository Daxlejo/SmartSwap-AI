import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Runs `onResume` when the Android app comes back to the foreground, e.g. after
 * the person went to Settings to grant a permission or turn on location.
 */
export const useAppResume = (onResume: () => void): void => {
  const latest = useRef(onResume);
  useEffect(() => {
    latest.current = onResume;
  }, [onResume]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const listener = App.addListener('resume', () => latest.current());
    return () => {
      listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);
};
