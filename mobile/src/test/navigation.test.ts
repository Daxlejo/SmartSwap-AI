import { describe, it, expect } from 'vitest';
import { backActionFor, isMainTab } from '@/layouts/navigation';

describe('main tabs', () => {
  it.each(['/home', '/explore', '/swaps', '/profile'])('%s is a main tab', (path) => {
    expect(isMainTab(path)).toBe(true);
  });

  it.each(['/publish', '/notifications', '/swap/configure', '/swap/route/r-1'])(
    '%s is a secondary screen with a back arrow',
    (path) => {
      expect(isMainTab(path)).toBe(false);
    },
  );
});

describe('Android back button', () => {
  it.each(['/home', '/login', '/splash', '/', '/index.html'])('closes the app on %s', (path) => {
    expect(backActionFor(path)).toBe('exit');
  });

  it.each(['/explore', '/swaps', '/profile'])('goes to Home from the %s tab', (path) => {
    expect(backActionFor(path)).toBe('home');
  });

  it('goes to Home after a proposal was sent, never back to the sent form', () => {
    expect(backActionFor('/swap/proposal/sent')).toBe('home');
  });

  it.each(['/publish', '/notifications', '/swap/results', '/swap/configure', '/item/i-1'])('goes back one step from %s', (path) => {
    expect(backActionFor(path)).toBe('back');
  });
});
