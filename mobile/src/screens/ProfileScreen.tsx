import { useState, useEffect } from 'react';
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
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { ApiError } from '@/services/http/apiClient';
import { ItemImage } from '@/components/ui/ItemImage';
import { ProfilePhotoPicker } from '@/components/ProfilePhotoPicker';
import { LanguageSelector } from '@/components/LanguageSelector';

export const ProfileScreen = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { isDark } = useTheme();
  const { t } = useTranslation();
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
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    refreshItems().catch(() => {});
  }, [refreshItems]);

  // Opened from the "add your location" prompt: jump straight to the edit sheet
  useEffect(() => {
    if ((routerLocation.state as { editLocation?: boolean } | null)?.editLocation) {
      openEditSheet();
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

  const openEditSheet = () => {
    setEditName(currentUser?.name ?? '');
    setEditMunicipalityCode(currentUser?.municipalityCode ?? null);
    setNameError(undefined);
    setIsEditOpen(true);
  };

  const closeEditSheet = () => {
    setIsEditOpen(false);
    setPendingAvatar(null);
    setSheetError(null);
    setNameError(undefined);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    if (editName.trim().length < 2) {
      setNameError(t('auth.errors.nameTooShort'));
      return;
    }
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
      <ScreenHeader title={t('headers.profile.title')} />
      {/* Section 1: Profile hero */}
      <section className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <Avatar
            src={currentUser?.avatarUrl}
            alt={currentUser?.name ?? ''}
            seed={currentUser?.id}
            size="xl"
          />
          <button
            type="button"
            onClick={openEditSheet}
            aria-label={t('profile.editProfile')}
            data-testid="profile-edit-badge"
            className="absolute -bottom-1 -right-3 w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md ring-4 ring-surface active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-primary/40"
          >
            <Icon name="edit" size="sm" />
          </button>
        </div>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
          {currentUser?.name ?? ''}
        </h2>
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
                    <h3 className="min-w-0 font-headline-sm text-headline-sm text-on-surface break-words">
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
          <div className="flex flex-col gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Icon name="language" size="sm" />
              </div>
              <span
                id="profile-language-label"
                className="font-body-md text-body-md font-medium text-on-surface"
              >
                {t('profile.language')}
              </span>
            </div>
            <LanguageSelector labelledBy="profile-language-label" />
          </div>
        </div>
      </section>

      <DemoAccountSwitcher />

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
      </section>

      {/* Edit Profile BottomSheet connected to PATCH /users/me */}
      <BottomSheet
        isOpen={isEditOpen}
        onClose={closeEditSheet}
        title={t('profile.editProfile')}
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col space-y-4">
          <ProfilePhotoPicker
            savedSrc={currentUser?.avatarUrl}
            pendingSrc={pendingAvatar}
            onPicked={setPendingAvatar}
            name={editName || currentUser?.name || ''}
            seed={currentUser?.id}
          />
          <Input
            id="profile-name"
            label={t('profile.fullName')}
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              setNameError(undefined);
            }}
            error={nameError}
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
