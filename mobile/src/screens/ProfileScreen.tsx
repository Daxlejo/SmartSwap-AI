import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockUsers, mockItems } from '@/data/mockData';
import alexAvatar from '@/assets/avatar-alex.svg';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';

const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={onToggle}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary ${
      enabled ? 'bg-primary' : 'bg-surface-container-highest'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface-container-lowest shadow transition-transform duration-200 ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const currentUser = mockUsers.find((user) => user.id === 'user-alex') || mockUsers[0];
  const myItems = mockItems.filter((item) => item.ownerId === 'user-alex');

  const [activeTab, setActiveTab] = useState<'activos' | 'pausados' | 'historial'>('activos');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="flex flex-col px-margin py-4 space-y-6">
      {/* Section 1: Profile hero */}
      <section className="flex flex-col items-center text-center pt-2">
        <Avatar
          src={alexAvatar}
          alt={currentUser?.name ?? 'Alex Morales'}
          size="xl"
          verified
          className="mb-3"
        />
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          {currentUser?.name ?? 'Alex Morales'}
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 mb-2.5">
          {currentUser?.email ?? 'alex.morales@smartswap.io'}
        </p>
        <Badge variant="secondary" icon="star" iconFilled className="mb-4">
          Nivel Oro
        </Badge>

        {/* Stats row (3 columns) */}
        <div className="w-full grid grid-cols-3 divide-x divide-surface-container-high/60 py-2">
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              23
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Canjes completados
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              4.9 ★
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Calificación
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              14.2 kg
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              CO₂ ahorrado
            </span>
          </div>
        </div>
      </section>

      {/* Section 2: Mis artículos publicados */}
      <section>
        <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Mis artículos
          </h2>
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="font-label-md text-label-md text-primary font-bold hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            Ver todos
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-space-sm">
          <Chip
            active={activeTab === 'activos'}
            onClick={() => setActiveTab('activos')}
          >
            Activos
          </Chip>
          <Chip
            active={activeTab === 'pausados'}
            onClick={() => setActiveTab('pausados')}
          >
            Pausados
          </Chip>
          <Chip
            active={activeTab === 'historial'}
            onClick={() => setActiveTab('historial')}
          >
            Historial
          </Chip>
        </div>

        {/* Tab content */}
        {activeTab === 'activos' && (
          <div className="flex flex-col gap-3">
            {myItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 bg-surface-container-high"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                        {item.name}
                      </h3>
                      <button
                        type="button"
                        aria-label={`Opciones de ${item.name}`}
                        onClick={() =>
                          setActiveMenuId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors shrink-0 -mr-1 -mt-1"
                      >
                        <Icon name="more_vert" size="sm" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="surface" className="text-[10px]">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {item.condition}
                      </Badge>
                    </div>

                    {item.estimatedValue !== undefined && (
                      <p className="font-label-md text-label-md font-bold text-primary mt-2">
                        Valor est. {item.estimatedValue} €
                      </p>
                    )}
                  </div>
                </div>

                {/* Inline mini menu */}
                {activeMenuId === item.id && (
                  <div className="mt-3 pt-2.5 border-t border-surface-container-high/40 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(null)}
                      className="px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Icon name="edit" size="xs" />
                      <span>Editar</span>
                    </button>
                    <span className="text-surface-container-high text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(null)}
                      className="px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Icon name="pause" size="xs" />
                      <span>Pausar</span>
                    </button>
                    <span className="text-surface-container-high text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(null)}
                      className="px-2.5 py-1 font-label-sm text-label-sm text-error hover:bg-error-container/20 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Icon name="delete" size="xs" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pausados' && (
          <EmptyState
            iconName="pause_circle"
            title="Sin artículos pausados"
            description="Los artículos que pauses temporalmente aparecerán aquí."
          />
        )}

        {activeTab === 'historial' && (
          <EmptyState
            iconName="history"
            title="Sin historial"
            description="Aquí verás los artículos que hayas intercambiado con éxito."
          />
        )}
      </section>

      {/* Section 3: Preferencias */}
      <section className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">
          Preferencias
        </h2>
        <div className="divide-y divide-surface-container-high/40">
          {/* Row 1: Tema de la app */}
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name={isDark ? 'dark_mode' : 'light_mode'} size="sm" filled />
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-medium text-on-surface">
                  Tema de la app
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {isDark ? 'Oscuro' : 'Claro'}
                </span>
              </div>
            </div>
            <ThemeToggle variant="switch" />
          </div>

          {/* Row 2: Idioma */}
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="language" size="sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-medium text-on-surface">
                  Idioma
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {language === 'es' ? 'Español' : 'English'}
                </span>
              </div>
            </div>
            <ToggleSwitch
              enabled={language === 'en'}
              onToggle={() => setLanguage((prev) => (prev === 'es' ? 'en' : 'es'))}
            />
          </div>

          {/* Row 3: Notificaciones */}
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="notifications" size="sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-body-md text-body-md font-medium text-on-surface">
                  Notificaciones
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                </span>
              </div>
            </div>
            <ToggleSwitch
              enabled={notificationsEnabled}
              onToggle={() => setNotificationsEnabled((prev) => !prev)}
            />
          </div>
        </div>
      </section>

      {/* Section 4: Cuenta */}
      <section className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">
          Cuenta
        </h2>
        <div className="divide-y divide-surface-container-high/40">
          {/* Editar perfil */}
          <button
            type="button"
            className="w-full flex justify-between items-center py-3 text-left group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="person" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                Editar perfil
              </span>
            </div>
            <Icon
              name="chevron_right"
              size="sm"
              className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform"
            />
          </button>

          {/* Verificación de identidad */}
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="verified_user" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                Verificación de identidad
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Verificado</Badge>
              <Icon name="chevron_right" size="sm" className="text-on-surface-variant" />
            </div>
          </div>

          {/* Historial de canjes */}
          <button
            type="button"
            onClick={() => navigate('/swaps')}
            className="w-full flex justify-between items-center py-3 text-left group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="swap_horiz" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                Historial de canjes
              </span>
            </div>
            <Icon
              name="chevron_right"
              size="sm"
              className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform"
            />
          </button>

          {/* Centro de ayuda */}
          <button
            type="button"
            className="w-full flex justify-between items-center py-3 text-left group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="help" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                Centro de ayuda
              </span>
            </div>
            <Icon
              name="chevron_right"
              size="sm"
              className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform"
            />
          </button>
        </div>
      </section>

      {/* Section 5: Zona de peligro */}
      <section className="pt-2">
        <Button
          variant="outline"
          size="md"
          fullWidth
          leftIcon="logout"
          onClick={() => navigate('/login')}
        >
          Cerrar sesión
        </Button>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-3">
          SmartSwap v2.4 • Intercambio circular P2P
        </p>
      </section>
    </div>
  );
};
