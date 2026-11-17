import { describe, expect, it } from 'vitest';
import { opensKeyboard } from '@/hooks/useKeepFocusedFieldVisible';

describe('opensKeyboard', () => {
  it('accepts text-like inputs, textareas and selects', () => {
    expect(opensKeyboard({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(opensKeyboard({ tagName: 'input', type: 'email' })).toBe(true);
    expect(opensKeyboard({ tagName: 'INPUT', type: 'search' })).toBe(true);
    expect(opensKeyboard({ tagName: 'INPUT' })).toBe(true);
    expect(opensKeyboard({ tagName: 'TEXTAREA' })).toBe(true);
    expect(opensKeyboard({ tagName: 'SELECT' })).toBe(true);
  });

  it('rejects inputs that never open the keyboard', () => {
    for (const type of ['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'hidden']) {
      expect(opensKeyboard({ tagName: 'INPUT', type })).toBe(false);
    }
  });

  it('only accepts other elements when they are contenteditable', () => {
    expect(opensKeyboard({ tagName: 'BUTTON' })).toBe(false);
    expect(opensKeyboard({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(opensKeyboard({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
});
