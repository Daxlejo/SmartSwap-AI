import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { mockUsers } from '@/data/mockData';
import alexAvatar from '@/assets/avatar-alex.svg';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/services/http/apiClient';

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
  const {
    currentUser: appUser,
    myItems,
    isItemsLoading,
    refreshItems,
    deleteItemReal,
    updateProfileReal,
    logout,
  } = useApp();

  const currentUser =
    appUser || mockUsers.find((user) => user.id === 'user-alex') || mockUsers[0];

  const [activeTab, setActiveTab] = useState<'activos' | 'pausados' | 'historial'>('activos');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Edit profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? '');
  const [editLocation, setEditLocation] = useState(currentUser?.location ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    refreshItems().catch(() => {});
  }, [refreshItems]);

  const handleRefreshMyItems = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setErrorBanner(null);
    try {
      await refreshItems();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorBanner(err.message);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (deletingItemId) return;
    setDeletingItemId(itemId);
    setErrorBanner(null);
    try {
      await deleteItemReal(itemId);
      setActiveMenuId(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorBanner(err.message);
      } else {
        setErrorBanner('No se pudo eliminar el artículo.');
      }
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile || !editName.trim()) return;
    setIsSavingProfile(true);
    setErrorBanner(null);
    try {
      await updateProfileReal({
        name: editName.trim(),
        location: editLocation.trim() || undefined,
      });
      setIsEditOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorBanner(err.message);
      } else {
        setErrorBanner('No se pudo actualizar tu perfil.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const tradesCompleted = currentUser?.tradesCompleted ?? 23;
  const userRating = (currentUser?.rating ?? 4.9).toFixed(1);
  const co2SavedKg = currentUser?.co2SavedKg ?? 14.2;

  return (
    <div className="flex flex-col px-margin py-4 space-y-6">
      {/* Section 1: Profile hero */}
      <section className="flex flex-col items-center text-center pt-2">
        <Avatar
          src={currentUser?.avatarUrl || alexAvatar}
          alt={currentUser?.name ?? 'Alex Morales'}
          size="xl"
          verified={currentUser?.verified ?? true}
          className="mb-3"
        />
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          {currentUser?.name ?? 'Alex Morales'}
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 mb-1">
          {currentUser?.email ?? 'alex.morales@smartswap.io'}
        </p>
        {currentUser?.location && (
          <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mb-2.5">
            <Icon name="location_on" size="xs" className="text-primary" />
            <span>{currentUser.location}</span>
          </p>
        )}
        <Badge variant="secondary" icon="star" iconFilled className="mb-4">
          Nivel Oro
        </Badge>

        {/* Stats row (3 columns) */}
        <div className="w-full grid grid-cols-3 divide-x divide-surface-container-high/60 py-2">
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {tradesCompleted}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Canjes completados
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {userRating} ★
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Calificación
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {co2SavedKg} kg
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              CO₂ ahorrado
            </span>
          </div>
        </div>
      </section>

      {errorBanner && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-error-container/25 border border-error/40 text-error font-body-sm text-body-sm flex items-center justify-between"
        >
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Cerrar error"
            className="p-1"
          >
            <Icon name="close" size="xs" />
          </button>
        </div>
      )}

      {/* Section 2: Mis artículos publicados */}
      <section>
        <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Mis artículos ({myItems.length})
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshMyItems}
              disabled={isRefreshing || isItemsLoading}
              aria-label="Actualizar mis artículos"
              className="font-label-sm text-label-sm text-primary font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Icon
                name="refresh"
                size="xs"
                className={isRefreshing || isItemsLoading ? 'animate-spin' : undefined}
              />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="font-label-md text-label-md text-primary font-bold hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              Ver todos
            </button>
          </div>
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
            {myItems.length === 0 ? (
              <EmptyState
                iconName="inventory_2"
                title="Sin artículos publicados"
                description="Publica tu primer artículo para comenzar a recibir propuestas de intercambio."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon="add_a_photo"
                    onClick={() => navigate('/publish')}
                  >
                    Publicar artículo
                  </Button>
                }
              />
            ) : (
              myItems.map((item) => (
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

                  {/* Inline mini menu with real Delete */}
                  {activeMenuId === item.id && (
                    <div className="mt-3 pt-2.5 border-t border-surface-container-high/40 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          navigate('/swap/configure');
                        }}
                        className="px-2.5 py-1 font-label-sm text-label-sm text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1 transition-colors font-bold"
                      >
                        <Icon name="sync_alt" size="xs" />
                        <span>Buscar canje</span>
                      </button>
                      <span className="text-surface-container-high text-xs">•</span>
                      <button
                        type="button"
                        disabled={deletingItemId === item.id}
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-2.5 py-1 font-label-sm text-label-sm text-error hover:bg-error-container/20 rounded-lg flex items-center gap-1 transition-colors font-bold disabled:opacity-50"
                      >
                        <Icon
                          name={deletingItemId === item.id ? 'progress_activity' : 'delete'}
                          size="xs"
                          className={deletingItemId === item.id ? 'animate-spin' : undefined}
                        />
                        <span>
                          {deletingItemId === item.id ? 'Eliminando...' : 'Eliminar'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
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
            onClick={() => {
              setEditName(currentUser?.name ?? '');
              setEditLocation(currentUser?.location ?? '');
              setIsEditOpen(true);
            }}
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

          {/* Publicar nuevo artículo */}
          <button
            type="button"
            onClick={() => navigate('/publish')}
            className="w-full flex justify-between items-center py-3 text-left group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="add_a_photo" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                Publicar nuevo artículo
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

      {/* Section 5: Zona de peligro / Logout */}
      <section className="pt-2">
        <Button
          variant="outline"
          size="md"
          fullWidth
          leftIcon="logout"
          onClick={handleLogout}
        >
          Cerrar sesión
        </Button>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-3">
          SmartSwap v2.4 • Intercambio circular P2P
        </p>
      </section>

      {/* Edit Profile BottomSheet connected to PATCH /users/me */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar perfil"
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col space-y-4">
          <Input
            label="Nombre completo"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            leftIcon="person"
            required
          />
          <Input
            label="Ciudad / Ubicación"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            leftIcon="location_on"
          />
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setIsEditOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={isSavingProfile}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
