import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/services/http/apiClient';
import { useTranslation } from '@/hooks/useTranslation';

type AuthMode = 'login' | 'register';

export interface LoginScreenProps {
  initialMode?: AuthMode;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail } = useApp();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Async & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const handleModeSwitch = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setErrorDetails([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setErrorDetails([]);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage(t('auth.errors.missingCredentials'));
      return;
    }

    if (mode === 'register') {
      if (trimmedName.length < 2) {
        setErrorMessage(t('auth.errors.nameTooShort'));
        return;
      }
      if (password.length < 8) {
        setErrorMessage(t('auth.errors.passwordTooShort'));
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(trimmedEmail, password);
      } else {
        await registerWithEmail({
          name: trimmedName,
          email: trimmedEmail,
          password,
          location: trimmedLocation || t('auth.defaultLocation'),
        });
      }
      navigate('/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          setErrorMessage(t('auth.errors.invalidCredentials'));
        } else if (err.statusCode === 409) {
          setErrorMessage(t('auth.errors.emailTaken'));
        } else if (err.statusCode === 0) {
          setErrorMessage(t('auth.errors.serverUnreachable'));
        } else {
          setErrorMessage(err.message);
        }
        if (err.details && err.details.length > 1) {
          setErrorDetails(err.details);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(t('auth.errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface px-margin py-8">
      {/* Brand Identity & Header */}
      <div className="flex flex-col items-center text-center mb-space-lg">
        <div className="relative mb-space-md">
          <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center p-space-sm relative overflow-hidden border border-surface-container-high/60">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary-container/10" />
            <img
              src={logoImg}
              alt={t('auth.logoAlt')}
              className="w-12 h-12 object-contain relative z-10"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-primary-container text-[11px] font-label-sm font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
            <Icon name="cyclone" size="xs" />
            <span>v2.4</span>
          </div>
        </div>

        <Badge variant="surface" icon="verified_user" iconFilled className="mb-space-sm">
          {t('auth.badgeNetwork')}
        </Badge>

        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight mb-space-xs font-bold">
          {mode === 'login' ? t('auth.welcomeTitle') : t('auth.registerTitle')}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          {mode === 'login'
            ? t('auth.welcomeSubtitle')
            : t('auth.registerSubtitle')}
        </p>
      </div>

      {/* Mode Toggle: Iniciar sesión / Crear cuenta */}
      <div
        role="tablist"
        aria-label={t('auth.modeAria')}
        className="grid grid-cols-2 p-1 rounded-2xl bg-surface-container-low border border-surface-container-high/60 mb-space-md"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => handleModeSwitch('login')}
          className={`h-11 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'login'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="login" size="xs" />
          <span>{t('auth.login')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => handleModeSwitch('register')}
          className={`h-11 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'register'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="person_add" size="xs" />
          <span>{t('auth.register')}</span>
        </button>
      </div>

      {/* Inline Error Banner from ApiError */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-space-md p-3.5 rounded-2xl bg-error-container/25 border border-error/40 text-error flex items-start gap-2.5 shadow-2xs"
        >
          <Icon name="error" size="sm" className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md font-bold">{errorMessage}</p>
            {errorDetails.length > 0 && (
              <ul className="mt-1 list-disc list-inside font-body-sm text-body-sm space-y-0.5">
                {errorDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setErrorDetails([]);
            }}
            aria-label={t('auth.errors.dismiss')}
            className="text-error/80 hover:text-error p-0.5 rounded-full"
          >
            <Icon name="close" size="xs" />
          </button>
        </div>
      )}

      {/* Main Authentication Form */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 mb-space-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" noValidate>
          {mode === 'register' && (
            <Input
              label={t('auth.fullName')}
              id="auth-name"
              type="text"
              placeholder={t('auth.fullNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon="person"
              required
              autoComplete="name"
            />
          )}

          {/* Email */}
          <Input
            label={t('auth.email')}
            id="auth-email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon="mail"
            required
            autoComplete="email"
          />

          {/* Password */}
          <Input
            label={t('auth.password')}
            id="auth-password"
            type={showPassword ? 'text' : 'password'}
            placeholder={mode === 'register' ? t('auth.passwordPlaceholderRegister') : t('auth.passwordPlaceholderLogin')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility_off' : 'visibility'}
            onRightIconClick={() => setShowPassword(!showPassword)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            helperText={
              mode === 'register'
                ? t('auth.passwordHelper')
                : undefined
            }
          />

          {mode === 'register' && (
            <Input
              label={t('auth.location')}
              id="auth-location"
              type="text"
              placeholder={t('auth.locationPlaceholder')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              leftIcon="location_on"
              required
              autoComplete="address-level2"
            />
          )}

          {/* Primary Submit CTA */}
          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={mode === 'login' ? 'login' : 'arrow_forward'}
              isLoading={isLoading}
            >
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>
          </div>
        </form>
      </div>

      {/* Mode Switch Link */}
      <div className="text-center mb-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            type="button"
            onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
            className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
          >
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
        </p>
      </div>

      {/* Trust micro-badges */}
      <div className="bg-surface-container rounded-2xl p-space-md mb-space-lg border border-surface-container-high/40 mt-auto">
        <div className="grid grid-cols-3 gap-space-sm text-center">
          <div className="flex flex-col items-center">
            <Icon name="sync_saved_locally" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {t('auth.secureDeposit')}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              {t('auth.protected')}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Icon name="verified" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {t('auth.identity')}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              {t('auth.verified')}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Icon name="eco" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              {t('auth.co2Neutral')}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              {t('auth.zeroFootprint')}
            </span>
          </div>
        </div>
      </div>

      {/* Legal Footer */}
      <footer className="text-center px-space-md pb-safe">
        <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-relaxed">
          {t('auth.termsNotice')}
        </p>
      </footer>
    </div>
  );
};
