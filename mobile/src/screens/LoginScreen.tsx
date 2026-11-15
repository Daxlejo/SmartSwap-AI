import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { ApiError } from '@/services/http/apiClient';
import { useTranslation } from '@/hooks/useTranslation';
import { DemoAccountSwitcher } from '@/components/DemoAccountSwitcher';
import { LocationPicker } from '@/components/LocationPicker';
import { FormErrorAlert } from '@/components/ui/FormErrorAlert';
import { useRevealOnError } from '@/hooks/useRevealOnError';

type AuthMode = 'login' | 'register';

interface AuthFieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

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
  const [municipalityCode, setMunicipalityCode] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);

  // Async & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  // Bumped on every failed submit so the alert scrolls into view and takes focus again
  const [errorAttempt, setErrorAttempt] = useState(0);
  const errorAlertRef = useRevealOnError<HTMLDivElement>(errorAttempt);

  const clearErrors = () => {
    setErrorMessage(null);
    setErrorDetails([]);
    setFieldErrors({});
    setLocationError(undefined);
  };

  const showError = (message: string, fields: AuthFieldErrors = {}) => {
    setErrorMessage(message);
    setFieldErrors(fields);
    setErrorAttempt((prev) => prev + 1);
  };

  const handleModeSwitch = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    clearErrors();

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (mode === 'register' && trimmedName.length < 2) {
      showError(t('auth.errors.nameTooShort'), { name: t('auth.errors.nameTooShort') });
      return;
    }

    if (!trimmedEmail || !password) {
      showError(t('auth.errors.missingCredentials'), {
        email: trimmedEmail ? undefined : t('auth.errors.emailRequired'),
        password: password ? undefined : t('auth.errors.passwordRequired'),
      });
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        showError(t('auth.errors.passwordTooShort'), {
          password: t('auth.errors.passwordTooShort'),
        });
        return;
      }
      if (!municipalityCode) {
        showError(t('auth.errors.locationRequiredSummary'));
        setLocationError(t('location.required'));
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
          municipalityCode: municipalityCode as string,
        });
      }
      navigate('/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          showError(t('auth.errors.invalidCredentials'), {
            email: t('auth.errors.invalidCredentialsField'),
            password: t('auth.errors.invalidCredentialsField'),
          });
        } else if (err.statusCode === 409) {
          showError(t('auth.errors.emailTaken'), { email: t('auth.errors.emailTakenField') });
        } else if (err.statusCode === 0) {
          showError(t('auth.errors.serverUnreachable'));
        } else {
          showError(err.message);
        }
        if (err.details && err.details.length > 1) {
          setErrorDetails(err.details);
        }
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError(t('auth.errors.unexpected'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-surface px-margin py-8">
      {/* Brand Identity & Header */}
      <div className="flex flex-col items-center text-center mb-space-lg">
        <div className="relative mb-space-md">
          <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center p-space-sm relative overflow-hidden border border-surface-container-high/60">
            <img
              src={logoImg}
              alt={t('auth.logoAlt')}
              className="w-12 h-12 object-contain relative z-10"
            />
          </div>
        </div>

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

      {/* Form error: scrolls into view and takes focus; each field repeats its own cause */}
      {errorMessage && (
        <FormErrorAlert
          ref={errorAlertRef}
          testId="auth-error-alert"
          className="mb-space-md"
          message={errorMessage}
          details={errorDetails}
          onDismiss={() => {
            setErrorMessage(null);
            setErrorDetails([]);
          }}
          dismissLabel={t('auth.errors.dismiss')}
        />
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
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              error={fieldErrors.name}
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
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
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
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
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
            <div className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface">
                {t('location.title')}
              </span>
              <LocationPicker
                municipalityCode={municipalityCode}
                onChange={(municipality) => {
                  setMunicipalityCode(municipality?.code ?? null);
                  setLocationError(undefined);
                }}
                error={locationError}
              />
            </div>
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

      <div className="mt-space-lg">
        <DemoAccountSwitcher />
      </div>

    </div>
  );
};
