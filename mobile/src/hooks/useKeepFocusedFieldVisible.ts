import { useEffect } from 'react';

/** Time the soft keyboard needs to finish opening and resize the WebView. */
export const KEYBOARD_SETTLE_MS = 300;

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** Whether an element opens the soft keyboard: text-like inputs, textareas, selects and contenteditable. */
export const opensKeyboard = (field: {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
}): boolean => {
  const tag = field.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUT_TYPES.has((field.type ?? 'text').toLowerCase());
  return field.isContentEditable === true;
};

const asKeyboardField = (target: EventTarget | Element | null): HTMLElement | null =>
  target instanceof HTMLElement && opensKeyboard(target) ? target : null;

/**
 * Keeps the focused text field above the soft keyboard: when a field gains focus, and whenever the
 * visual viewport shrinks while one is focused, it is scrolled to the middle of the screen once the
 * keyboard has settled, so neither the keyboard nor the sticky bottom bars cover it.
 */
export function useKeepFocusedFieldVisible(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const revealActiveField = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        asKeyboardField(document.activeElement)?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
      }, KEYBOARD_SETTLE_MS);
    };

    // Only a shrinking viewport means the keyboard opened; growing back (keyboard closed) must not jump.
    let lastViewportHeight = window.visualViewport?.height ?? 0;
    const onViewportResize = () => {
      const height = window.visualViewport?.height ?? 0;
      const shrank = height < lastViewportHeight;
      lastViewportHeight = height;
      if (shrank) revealActiveField();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (asKeyboardField(event.target)) revealActiveField();
    };

    document.addEventListener('focusin', onFocusIn);
    window.visualViewport?.addEventListener('resize', onViewportResize);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);
}
