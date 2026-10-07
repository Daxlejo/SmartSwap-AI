import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.svg';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('alex.morales@correo.com');
  const [password, setPassword] = useState('CircularEconomy2025!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/home');
    }, 600);
  };

  const handleDemoLogin = () => {
    setEmail('alex.morales@smartswap.io');
    setPassword('CircularSwap2025Demo!');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/home');
    }, 600);
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
              alt="Logotipo de SmartSwap"
              className="w-12 h-12 object-contain relative z-10"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-primary-container text-[11px] font-label-sm font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
            <Icon name="cyclone" size="xs" />
            <span>v2.4</span>
          </div>
        </div>

        <Badge variant="surface" icon="verified_user" iconFilled className="mb-space-sm">
          Red de Canje P2P Segura
        </Badge>

        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight mb-space-xs font-bold">
          Bienvenido de nuevo
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          Descubre intercambios circulares inteligentes y continúa tus canjes activos.
        </p>
      </div>

      {/* Quick Demo Mode Card */}
      <section
        aria-label="Acceso Rápido de Prueba"
        className="mb-space-lg bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-secondary-container/10 pointer-events-none" />
        <div className="flex items-start gap-space-sm mb-space-sm">
          <div className="w-8 h-8 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="bolt" size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                Acceso Rápido Demo
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">Prototipo</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface font-semibold truncate">
              Alex Morales (Nivel Oro)
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-snug">
              2 canjes activos: Bicicleta ↔ Cámara Fujifilm
            </p>
          </div>
        </div>

        <Button
          variant="tonal"
          fullWidth
          rightIcon="arrow_forward"
          onClick={handleDemoLogin}
          isLoading={isLoading}
        >
          Entrar de inmediato como Alex
        </Button>
      </section>

      {/* Main Authentication Form */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 mb-space-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Email */}
          <Input
            label="Correo Electrónico"
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon="mail"
            rightIcon="verified"
            required
            subLabel={
              <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5 font-bold">
                <Icon name="check_circle" size="xs" />
                Verificado
              </span>
            }
          />

          {/* Password */}
          <Input
            label="Contraseña"
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon="lock"
            rightIcon={showPassword ? 'visibility_off' : 'visibility'}
            onRightIconClick={() => setShowPassword(!showPassword)}
            required
          />

          {/* Utilities: Remember & Forgot */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md bg-surface-container flex items-center justify-center peer-checked:bg-primary transition-colors">
                {rememberMe && <Icon name="check" size="xs" className="text-on-primary" />}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Recordar dispositivo
              </span>
            </label>

            <button
              type="button"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* CTA */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon="login"
            isLoading={isLoading}
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>

      {/* Social Logins */}
      <div className="flex items-center gap-space-md mb-space-md px-space-xs">
        <div className="flex-1 h-px bg-surface-container-highest" />
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[11px]">
          o continúa con
        </span>
        <div className="flex-1 h-px bg-surface-container-highest" />
      </div>

      <div className="grid grid-cols-2 gap-space-sm mb-space-lg">
        <button
          type="button"
          onClick={handleDemoLogin}
          className="h-[50px] bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-2xl shadow-xs border border-surface-container-high/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all px-space-sm font-label-md text-label-md"
        >
          <Icon name="mail" size="sm" className="text-secondary" />
          <span>Google</span>
        </button>
        <button
          type="button"
          onClick={handleDemoLogin}
          className="h-[50px] bg-inverse-surface hover:bg-on-background text-inverse-on-surface rounded-2xl shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all px-space-sm font-label-md text-label-md"
        >
          <Icon name="phone_iphone" size="sm" />
          <span>Apple</span>
        </button>
      </div>

      {/* Trust micro-badges */}
      <div className="bg-surface-container rounded-2xl p-space-md mb-space-lg border border-surface-container-high/40">
        <div className="grid grid-cols-3 gap-space-sm text-center">
          <div className="flex flex-col items-center">
            <Icon name="sync_saved_locally" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Depósito Seguro
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[10px]">
              100% Protegido
            </span>
          </div>
          <div className="flex flex-col items-center">
            <Icon name="verified" size="md" className="text-primary mb-1" />
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Identidad
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

      {/* Legal Footer */}
      <footer className="text-center px-space-md pb-safe">
        <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] leading-relaxed">
          Al continuar, aceptas nuestros Términos de Intercambio Circular y las Políticas de
          Depósito en Custodia.
        </p>
      </footer>
    </div>
  );
};
