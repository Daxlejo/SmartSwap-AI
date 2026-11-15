import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '@/i18n';
import { Input } from '@/components/ui/Input';
import { FormErrorAlert } from '@/components/ui/FormErrorAlert';

describe('form errors', () => {
  it('marks a field with an error as invalid and links the message under it', () => {
    const html = renderToStaticMarkup(
      <Input id="auth-email" label="Correo" error="Este correo ya está registrado." />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="auth-email-message"');
    expect(html).toMatch(/id="auth-email-message"[^>]*>Este correo ya está registrado\./);
  });

  it('leaves a valid field without aria-invalid', () => {
    const html = renderToStaticMarkup(<Input id="auth-email" label="Correo" />);
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('aria-describedby');
  });

  it('renders the form alert as an assertive, focusable live region', () => {
    const html = renderToStaticMarkup(<FormErrorAlert message="Revisa los campos marcados." />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Revisa los campos marcados.');
  });
});
