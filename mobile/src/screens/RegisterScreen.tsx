import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

export const RegisterScreen: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Validation rules
  const isNameValid = name.trim().length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 8;
  const isConfirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password;
  const areTermsAccepted = acceptTerms && acceptPrivacy;

  const isFormValid =
    isNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    areTermsAccepted;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/home');
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface px-margin py-6">
      {/* Top Bar with Back Arrow */}
      <div className="flex items-center justify-between mb-space-sm">
        <button
          type="button"
          onClick={() => navigate('/login')}
          aria-label="Volver al inicio de sesión"
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
        >
          <Icon name="arrow_back" size="md" />
        </button>
        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
          Registro
        </span>
        <div className="w-10" />
      </div>

      {/* Brand Identity & Header */}
      <div className="flex flex-col items-center text-center mb-space-md">
        <div className="relative mb-space-sm">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center p-space-xs relative overflow-hidden border border-surface-container-high/60">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-secondary-container/10" />
            <img
              src={logoImg}
              alt="Logotipo de SmartSwap"
              className="w-10 h-10 object-contain relative z-10"
            />
          </div>
          <div className="absolute -bottom-1 -right-2 bg-secondary-container text-on-primary-container text-[10px] font-label-sm font-bold px-1.5 py-0.2 rounded-full shadow-xs flex items-center gap-0.5">
            <Icon name="cyclone" size="xs" />
            <span>v2.4</span>
          </div>
        </div>

        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight mb-1 font-bold">
          Crea tu cuenta
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          Únete a la red de canje circular
        </p>
      </div>

      {/* Main Registration Form */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 mb-space-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
          {/* Nombre completo */}
          <Input
            label="Nombre completo"
            id="register-name"
            type="text"
            placeholder="Alex Morales"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon="person"
            required
          />

          {/* Correo electrónico */}
          <Input
            label="Correo electrónico"
            id="register-email"
            type="email"
            placeholder="tu.correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon="mail"
            required
            helperText={
              email && !isEmailValid ? 'Ingresa un correo electrónico válido' : undefined
            }
          />

          {/* Contraseña */}
          <Input
            label="Contraseña"
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility_off' : 'visibility'}
            onRightIconClick={() => setShowPassword(!showPassword)}
            required
            helperText={
              password && password.length < 8
                ? 'La contraseña debe tener al menos 8 caracteres'
                : undefined
            }
          />

          {/* Confirmar contraseña */}
          <Input
            label="Confirmar contraseña"
            id="register-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon="lock"
            rightIcon={showConfirmPassword ? 'visibility_off' : 'visibility'}
            onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
            required
            helperText={
              confirmPassword && confirmPassword !== password
                ? 'Las contraseñas no coinciden'
                : undefined
            }
          />

          {/* Ciudad (opcional) */}
          <Input
            label="Ciudad (opcional)"
            id="register-city"
            type="text"
            placeholder="Tu ciudad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            leftIcon="location_city"
          />

          {/* Checkboxes de Confianza */}
          <div className="flex flex-col gap-2.5 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 mt-0.5 rounded-md bg-surface-container flex items-center justify-center peer-checked:bg-primary shrink-0 transition-colors">
                {acceptTerms && <Icon name="check" size="xs" className="text-on-primary" />}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                Acepto los <span className="text-primary font-semibold">Términos de Servicio</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 mt-0.5 rounded-md bg-surface-container flex items-center justify-center peer-checked:bg-primary shrink-0 transition-colors">
                {acceptPrivacy && <Icon name="check" size="xs" className="text-on-primary" />}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                Acepto la <span className="text-primary font-semibold">Política de Privacidad</span>
              </span>
            </label>
          </div>

          {/* Botón de Enviar */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="arrow_forward"
              disabled={!isFormValid || isLoading}
              isLoading={isLoading}
            >
              Crear cuenta
            </Button>
          </div>
        </form>
      </div>

      {/* Link to Login */}
      <div className="text-center mb-space-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
          >
            Inicia sesión
          </button>
        </p>
      </div>

      {/* Trust micro-badges (same as login bottom) */}
      <div className="bg-surface-container rounded-2xl p-space-md mb-space-md border border-surface-container-high/40">
        <div className="grid grid-cols-3 gap-space-sm text-center">
          <div className="flex flex-col items-center">
            <Icon name="sync_saved_locally" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Depósito Escrow
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              100% Protegido
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Icon name="verified" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Identidad Biométrica
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              Verificada
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Icon name="eco" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              CO₂ Neutral
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              Huella Cero
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
