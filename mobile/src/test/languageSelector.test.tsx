import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '@/i18n';
import { LanguageSelector } from '@/components/LanguageSelector';

describe('LanguageSelector', () => {
  it('offers Español and English as a radio group with Spanish selected by default', () => {
    const html = renderToStaticMarkup(<LanguageSelector labelledBy="lang-label" />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="lang-label"');
    expect(html).toMatch(/aria-checked="true" lang="es"[^>]*>Español</);
    expect(html).toMatch(/aria-checked="false" lang="en"[^>]*>English</);
    expect(html).not.toContain('role="switch"');
  });
});
