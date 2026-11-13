import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DemoAccountSwitcher } from '@/components/DemoAccountSwitcher';
import { LocationPicker } from '@/components/LocationPicker';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { ApiError } from '@/services/http/apiClient';
import { ItemImage } from '@/components/ui/ItemImage';
import { compressImageToDataUrl } from '@/utils/imageCompressor';

const ToggleSwitch = ({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    className={`relative inline-flex h-11 w-[4.5rem] shrink-0 items-center rounded-full p-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      enabled ? 'bg-primary' : 'bg-surface-container-highest'
    }`}
  >
    <span
      className={`h-8 w-8 rounded-full bg-surface-container-lowest shadow transition-transform duration-200 ${
        enabled ? 'translate-x-7' : 'translate-x-0'
      }`}
    />
  </button>
);
export const ProfileScreen = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { isDark } = useTheme();
  const { t, language, changeLanguage } = useTranslation();
  const {
    currentUser: appUser,
    myItems,
    isItemsLoading,
    refreshItems,
    deleteItemReal,
    updateProfileReal,
    uploadAvatarReal,
    logout,
  } = useApp();

  const currentUser = appUser;

  const [activeTab, setActiveTab] = useState<'activos' | 'pausados' | 'historial'>('activos');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Edit profile modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? '');
  const [editMunicipalityCode, setEditMunicipalityCode] = useState<string | null>(
    currentUser?.municipalityCode ?? null,
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  // Profile photo picked in the sheet but not uploaded yet (compressed square JPEG data URL)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshItems().catch(() => {});
  }, [refreshItems]);

  // Opened from the "add your location" prompt: jump straight to the edit sheet
  useEffect(() => {
    if ((routerLocation.state as { editLocation?: boolean } | null)?.editLocation) {
      setEditMunicipalityCode(currentUser?.municipalityCode ?? null);
      setIsEditOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.state]);

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
        setErrorBanner(t('profile.deleteError'));
      }
    } finally {
      setDeletingItemId(null);
    }
  };

  const closeEditSheet = () => {
    setIsEditOpen(false);
    setPendingAvatar(null);
    setSheetError(null);
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsProcessingPhoto(true);
    setSheetError(null);
    try {
      setPendingAvatar(
        await compressImageToDataUrl(file, { maxDimension: 512, quality: 0.85, square: true }),
      );
    } catch {
      setSheetError(t('profile.photoReadError'));
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile || !editName.trim()) return;
    setIsSavingProfile(true);
    setErrorBanner(null);
    setSheetError(null);
    if (pendingAvatar) {
      try {
        await uploadAvatarReal(pendingAvatar);
        setPendingAvatar(null);
      } catch (err) {
        setSheetError(
          err instanceof ApiError && err.message ? err.message : t('profile.photoUploadError'),
        );
        setIsSavingProfile(false);
        return;
      }
    }
    try {
      await updateProfileReal({
        name: editName.trim(),
        ...(editMunicipalityCode && editMunicipalityCode !== currentUser?.municipalityCode
          ? { municipalityCode: editMunicipalityCode }
          : {}),
      });
      closeEditSheet();
    } catch (err) {
      setSheetError(err instanceof ApiError && err.message ? err.message : t('profile.updateError'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const tradesCompleted = currentUser?.tradesCompleted ?? 0;

  return (
    <div className="flex flex-col px-margin py-4 space-y-6">
      {/* Section 1: Profile hero */}
      <section className="flex flex-col items-center text-center pt-2">
        <Avatar
          src={currentUser?.avatarUrl}
          alt={currentUser?.name ?? ''}
          size="xl"
          className="mb-3"
        />
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          {currentUser?.name ?? ''}
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 mb-1">
          {currentUser?.email ?? ''}
        </p>
        {currentUser?.location && (
          <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mb-2.5">
            <Icon name="location_on" size="xs" className="text-primary" />
            <span>{currentUser.location}</span>
          </p>
        )}
        {/* Only figures the app really tracks */}
        <div className="w-full grid grid-cols-2 divide-x divide-surface-container-high py-2 mt-2">
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">{tradesCompleted}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t('profile.tradesCompleted')}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">{myItems.length}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t('profile.itemsPublished')}</span>
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
            aria-label={t('profile.closeError')}
            className="w-11 h-11 -m-2 shrink-0 flex items-center justify-center rounded-full"
          >
            <Icon name="close" size="xs" />
          </button>
        </div>
      )}

      {/* Section 2: Mis artículos publicados */}
      <section>
        <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {t('profile.myItems', { count: myItems.length })}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshMyItems}
              disabled={isRefreshing || isItemsLoading}
              aria-label={t('profile.refreshAria')}
              className="min-h-11 px-2 font-label-md text-label-md text-primary font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Icon
                name="refresh"
                size="sm"
                className={isRefreshing || isItemsLoading ? 'animate-spin' : undefined}
              />
              <span>{t('profile.refresh')}</span>
            </button>

          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-space-sm">
          <Chip
            active={activeTab === 'activos'}
            onClick={() => setActiveTab('activos')}
          >
            {t('profile.tabs.active')}
          </Chip>
          <Chip
            active={activeTab === 'pausados'}
            onClick={() => setActiveTab('pausados')}
          >
            {t('profile.tabs.paused')}
          </Chip>
          <Chip
            active={activeTab === 'historial'}
            onClick={() => setActiveTab('historial')}
          >
            {t('profile.tabs.history')}
          </Chip>
        </div>

        {/* Tab content */}
        {activeTab === 'activos' && (
          <div className="flex flex-col gap-3">
            {myItems.length === 0 ? (
              <EmptyState
                iconName="inventory_2"
                title={t('profile.emptyActiveTitle')}
                description={t('profile.emptyActiveDescription')}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon="add_a_photo"
                    onClick={() => navigate('/publish')}
                  >
                    {t('profile.publishItem')}
                  </Button>
                }
              />
            ) : (
              myItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 font-headline-sm text-headline-sm text-on-surface line-clamp-2 break-words">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      aria-label={t('profile.itemOptions', { name: item.name })}
                      aria-expanded={activeMenuId === item.id}
                      onClick={() => setActiveMenuId((prev) => (prev === item.id ? null : item.id))}
                      className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container transition-colors shrink-0"
                    >
                      <Icon name="more_vert" size="md" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <ItemImage src={item.imageUrl} alt={item.name} category={item.category} className="w-14 h-14 rounded-xl shrink-0 bg-surface-container-high" />
                    <p className="min-w-0 font-body-sm text-body-sm text-on-surface-variant break-words">
                      {[
                        t(`catalog.conditions.${item.condition}`, { defaultValue: item.condition }),
                        item.estimatedValue !== undefined ? formatCop(item.estimatedValue) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
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
                        className="min-h-11 px-3 font-label-md text-label-md text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1 transition-colors font-bold"
                      >
                        <Icon name="sync_alt" size="xs" />
                        <span>{t('profile.findSwap')}</span>
                      </button>
                      <button
                        type="button"
                        disabled={deletingItemId === item.id}
                        onClick={() => handleDeleteItem(item.id)}
                        className="min-h-11 px-3 font-label-md text-label-md text-error hover:bg-error-container/20 rounded-lg flex items-center gap-1 transition-colors font-bold disabled:opacity-50"
                      >
                        <Icon
                          name={deletingItemId === item.id ? 'progress_activity' : 'delete'}
                          size="xs"
                          className={deletingItemId === item.id ? 'animate-spin' : undefined}
                        />
                        <span>
                          {deletingItemId === item.id ? t('profile.deleting') : t('profile.delete')}
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
            title={t('profile.emptyPausedTitle')}
            description={t('profile.emptyPausedDescription')}
          />
        )}

        {activeTab === 'historial' && (
          <EmptyState
            iconName="history"
            title={t('profile.emptyHistoryTitle')}
            description={t('profile.emptyHistoryDescription')}
          />
        )}
      </section>

      {/* Section 3: Preferencias */}
      <section className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">
          {t('profile.preferences')}
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
                  {t('profile.appTheme')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {isDark ? t('profile.dark') : t('profile.light')}
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
                  {t('profile.language')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {language === 'es' ? 'Español' : 'English'}
                </span>
              </div>
            </div>
            <ToggleSwitch
              label={t('profile.languageSwitch')}
              enabled={language === 'en'}
              onToggle={() => void changeLanguage(language === 'es' ? 'en' : 'es')}
            />
          </div>

        </div>
      </section>

      <DemoAccountSwitcher />

      {/* Section 4: Cuenta */}
      <section className="rounded-2xl border border-surface-container-high/60 shadow-sm bg-surface-container-lowest p-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-sm">
          {t('profile.account')}
        </h2>
        <div className="divide-y divide-surface-container-high/40">
          {/* Editar perfil */}
          <button
            type="button"
            onClick={() => {
              setEditName(currentUser?.name ?? '');
              setEditMunicipalityCode(currentUser?.municipalityCode ?? null);
              setIsEditOpen(true);
            }}
            className="w-full flex justify-between items-center py-3 text-left group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="person" size="sm" />
              </div>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                {t('profile.editProfile')}
              </span>
            </div>
            <Icon
              name="chevron_right"
              size="sm"
              className="text-on-surface-variant group-hover:translate-x-0.5 transition-transform"
            />
          </button>

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
                {t('profile.swapHistory')}
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
                {t('profile.publishNewItem')}
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
          {t('profile.logout')}
        </Button>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-3">
          {t('profile.version')}
        </p>
      </section>

      {/* Edit Profile BottomSheet connected to PATCH /users/me */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={closeEditSheet}
        title={t('profile.editProfile')}
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col space-y-4">
          <div className="flex flex-col items-center gap-3">
            <Avatar
              src={pendingAvatar ?? currentUser?.avatarUrl}
              alt={editName || currentUser?.name || ''}
              size="xl"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isProcessingPhoto}
                onClick={() => cameraInputRef.current?.click()}
              >
                {t('profile.takePhoto')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isProcessingPhoto}
                onClick={() => galleryInputRef.current?.click()}
              >
                {t('profile.chooseFromGallery')}
              </Button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
              {t('profile.photoHint')}
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoSelected}
              data-testid="avatar-camera-input"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelected}
              data-testid="avatar-gallery-input"
            />
          </div>
          <Input
            label={t('profile.fullName')}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            leftIcon="person"
            required
          />
          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface">{t('profile.location')}</span>
            <LocationPicker
              municipalityCode={editMunicipalityCode}
              departmentCode={currentUser?.departmentCode}
              onChange={(municipality) => setEditMunicipalityCode(municipality?.code ?? null)}
            />
          </div>
          {sheetError && (
            <p role="alert" className="font-body-sm text-body-sm text-error">
              {sheetError}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={closeEditSheet}
            >
              {t('profile.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={isSavingProfile}
            >
              {t('profile.saveChanges')}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
