import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { mockUsers } from '@/data/mockData';
import type { Item, User } from '@/types';
import { ObjectCard } from '@/components/ObjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ApiError } from '@/services/http/apiClient';
import alexAvatar from '@/assets/avatar-alex.svg';
import { useTranslation } from '@/hooks/useTranslation';

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'Todos', label: 'Todos', icon: 'category_search' },
  { id: 'Tecnología', label: 'Tecnología', icon: 'computer' },
  { id: 'Deportes', label: 'Deportes', icon: 'sports_soccer' },
  { id: 'Fotografía', label: 'Fotografía', icon: 'photo_camera' },
  { id: 'Videojuegos', label: 'Videojuegos', icon: 'sports_esports' },
  { id: 'Música', label: 'Música', icon: 'music_note' },
  { id: 'Hogar', label: 'Hogar', icon: 'home' },
  { id: 'Otros', label: 'Otros', icon: 'category' },
];

const KNOWN_CATEGORY_IDS = new Set([
  'Tecnología',
  'Deportes',
  'Fotografía',
  'Videojuegos',
  'Música',
  'Hogar',
]);

const CONDITION_OPTIONS = [
  'Todos',
  'Como nuevo',
  'Excelente estado',
  'Buen estado',
] as const;

const SORT_OPTIONS = [
  'Relevancia',
  'Menor valor',
  'Mayor valor',
  'Más recientes',
] as const;

export const ExploreScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, currentUser, isItemsLoading, refreshItems, deleteItemReal } = useApp();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [conditionIndex, setConditionIndex] = useState<number>(0);
  const [sortIndex, setSortIndex] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const selectedCondition = CONDITION_OPTIONS[conditionIndex];
  const selectedSort = SORT_OPTIONS[sortIndex];
  const conditionLabel = t(`catalog.conditions.${selectedCondition}`);
  const sortLabel = t(`explore.sortOptions.${selectedSort}`);

  useEffect(() => {
    refreshItems().catch(() => {});
  }, [refreshItems]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setActionError(null);
    try {
      await refreshItems();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteOwnItem = async (itemId: string) => {
    if (isDeletingId) return;
    setIsDeletingId(itemId);
    setActionError(null);
    try {
      await deleteItemReal(itemId);
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError(t('explore.deleteError'));
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const user of mockUsers) {
      map.set(user.id, user);
    }
    if (currentUser) {
      map.set(currentUser.id, currentUser);
    }
    return map;
  }, [currentUser]);

  const resolveOwner = (item: Item): User | undefined => {
    if (item.owner) {
      return {
        id: item.owner.id,
        name: item.owner.name,
        email: item.owner.email || '',
        avatarUrl: item.owner.avatarUrl || alexAvatar,
        rating: item.owner.rating,
        location: item.owner.location,
        verified: item.owner.verified ?? true,
        co2SavedKg: item.owner.co2SavedKg ?? 14.2,
      };
    }
    return usersById.get(item.ownerId);
  };

  const filteredItems = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    const filtered = items.filter((item) => {
      // 1. Search query filter (by name or category)
      const matchesSearch =
        trimmedQuery === '' ||
        item.name.toLowerCase().includes(trimmedQuery) ||
        item.category.toLowerCase().includes(trimmedQuery);

      if (!matchesSearch) return false;

      // 2. Category chip filter
      const matchesCategory =
        selectedCategory === 'Todos'
          ? true
          : selectedCategory === 'Otros'
            ? item.category === 'Otros' || !KNOWN_CATEGORY_IDS.has(item.category)
            : item.category === selectedCategory;

      if (!matchesCategory) return false;

      // 3. Condition filter
      const matchesCondition =
        selectedCondition === 'Todos' ||
        item.condition.toLowerCase() === selectedCondition.toLowerCase();

      return matchesCondition;
    });

    // 4. Sort options
    if (selectedSort === 'Menor valor') {
      return [...filtered].sort((a, b) => (a.estimatedValue ?? 0) - (b.estimatedValue ?? 0));
    }
    if (selectedSort === 'Mayor valor') {
      return [...filtered].sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0));
    }
    if (selectedSort === 'Más recientes') {
      return [...filtered].reverse();
    }

    return filtered;
  }, [items, searchQuery, selectedCategory, selectedCondition, selectedSort]);

  const handleCycleCondition = () => {
    setConditionIndex((prev) => (prev + 1) % CONDITION_OPTIONS.length);
  };

  const handleCycleSort = () => {
    setSortIndex((prev) => (prev + 1) % SORT_OPTIONS.length);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setConditionIndex(0);
    setSortIndex(0);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'Todos' ||
    selectedCondition !== 'Todos' ||
    selectedSort !== 'Relevancia';

  const selectedItemOwner = selectedItem ? resolveOwner(selectedItem) : undefined;
  const isSelectedItemMine =
    Boolean(selectedItem && currentUser && selectedItem.ownerId === currentUser.id);
  const showSkeleton = isItemsLoading && items.length === 0;

  return (
    <div className="flex flex-col flex-1 w-full pb-6">
      {/* Sticky Header: Search Bar + Category Chips */}
      <div className="sticky top-16 z-30 bg-surface/90 backdrop-blur-xl border-b border-surface-container-high/50 px-margin pt-3 pb-3 space-y-3 transition-colors">
        {/* Section 1: Search Bar */}
        <div className="space-y-1.5">
          <div className="relative flex items-center w-full">
            <span className="absolute left-4 text-on-surface-variant pointer-events-none flex items-center">
              <Icon name="search" size="md" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('explore.searchPlaceholder')}
              aria-label={t('explore.searchAria')}
              className="w-full h-12 pl-11 pr-11 rounded-2xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('explore.clearSearch')}
                className="absolute right-3 w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center active:scale-95 transition-all"
              >
                <Icon name="close" size="xs" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              {showSkeleton
                ? t('explore.loadingCatalog')
                : t('explore.itemsFound', { count: filteredItems.length })}
            </span>

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="font-label-sm text-label-sm text-primary font-bold hover:underline flex items-center gap-0.5"
                >
                  <Icon name="restart_alt" size="xs" />
                  <span>{t('explore.clearFilters')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isItemsLoading}
                aria-label={t('explore.refreshAria')}
                className="font-label-sm text-label-sm text-primary font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Icon
                  name="refresh"
                  size="xs"
                  className={isRefreshing || isItemsLoading ? 'animate-spin' : undefined}
                />
                <span>{isRefreshing ? t('explore.refreshing') : t('explore.refresh')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Category Chips (Horizontal scroll, no scrollbar) */}
        <div
          role="tablist"
          aria-label={t('explore.categoriesAria')}
          className="flex items-center gap-space-xs overflow-x-auto -mx-margin px-margin py-0.5 [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <Chip
                key={category.id}
                role="tab"
                aria-selected={isActive}
                active={isActive}
                icon={category.icon}
                iconFilled={isActive}
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0"
              >
                {t(`catalog.categories.${category.id}`, { defaultValue: category.label })}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Section 3: Filter Row */}
      <div className="px-margin pt-3 pb-2 flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-xs overflow-x-auto [scrollbar-width:none]">
          {/* Condition Cycle Toggle */}
          <button
            type="button"
            onClick={handleCycleCondition}
            aria-label={t('explore.filterByCondition', { value: conditionLabel })}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-label-sm text-label-sm transition-all active:scale-95 shrink-0 border ${
              selectedCondition !== 'Todos'
                ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary/30 font-bold'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container-low font-semibold'
            }`}
          >
            <Icon name="tune" size="xs" />
            <span>{t('explore.condition', { value: conditionLabel })}</span>
            <Icon name="expand_more" size="xs" />
          </button>

          {/* Sort Cycle Toggle */}
          <button
            type="button"
            onClick={handleCycleSort}
            aria-label={t('explore.sortBy', { value: sortLabel })}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-label-sm text-label-sm transition-all active:scale-95 shrink-0 border ${
              selectedSort !== 'Relevancia'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/30 font-bold'
                : 'bg-surface-container-lowest text-on-surface-variant border-surface-container-high hover:bg-surface-container-low font-semibold'
            }`}
          >
            <Icon name="swap_vert" size="xs" />
            <span>{t('explore.sort', { value: sortLabel })}</span>
            <Icon name="expand_more" size="xs" />
          </button>
        </div>

        <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold shrink-0">
          {t('explore.itemsCount', { count: filteredItems.length })}
        </span>
      </div>

      {actionError && (
        <div className="px-margin pb-2">
          <div
            role="alert"
            className="p-3 rounded-xl bg-error-container/25 border border-error/40 text-error font-body-sm text-body-sm flex items-center justify-between"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label={t('explore.closeError')}
              className="p-1"
            >
              <Icon name="close" size="xs" />
            </button>
          </div>
        </div>
      )}

      {/* Section 4: Results */}
      <div className="flex-1 flex flex-col px-margin pt-2">
        {showSkeleton ? (
          <div className="flex flex-col space-y-3" aria-label={t('explore.loadingItems')}>
            {[1, 2, 3, 4].map((skeletonId) => (
              <div
                key={skeletonId}
                className="h-36 w-full rounded-2xl bg-surface-container-low animate-pulse border border-surface-container-high/60 p-3.5 flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-24 h-24 rounded-xl bg-surface-container-high shrink-0" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-4 w-3/4 rounded-md bg-surface-container-high" />
                    <div className="h-3 w-1/2 rounded-md bg-surface-container-high" />
                    <div className="h-6 w-full rounded-lg bg-surface-container-high mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-[45vh]">
            <EmptyState
              iconName="search_off"
              title={t('explore.emptyTitle')}
              description={t('explore.emptyDescription')}
              action={
                hasActiveFilters ? (
                  <Button
                    variant="tonal"
                    size="sm"
                    leftIcon="restart_alt"
                    onClick={handleResetFilters}
                  >
                    {t('explore.resetFilters')}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {filteredItems.map((item) => {
              const owner = resolveOwner(item);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t('explore.viewDetails', { name: item.name })}
                  onClick={(e) => {
                    // If user clicked the "Proponer" button inside ObjectCard, let onOfferSwap handle navigation
                    if ((e.target as HTMLElement).closest('button')) {
                      return;
                    }
                    setSelectedItem(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedItem(item);
                    }
                  }}
                  className="relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                >
                  <ObjectCard
                    item={item}
                    owner={owner}
                    onOfferSwap={() =>
                      navigate('/swap/configure', {
                        state: { wantItemId: item.id, wantItemName: item.name },
                      })
                    }
                  />

                  {/* Estimated Value Overlay Pill on Item Thumbnail */}
                  {item.estimatedValue !== undefined && (
                    <span className="pointer-events-none absolute top-[84px] left-5 px-1.5 py-0.5 rounded-md bg-inverse-surface/85 backdrop-blur-xs font-label-sm text-[10px] text-inverse-on-surface font-bold shadow-xs">
                      {t('explore.estimatedShort', { value: item.estimatedValue })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 5: Item Detail Bottom Sheet */}
      <BottomSheet
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={t('explore.detailTitle')}
      >
        {selectedItem && (
          <div className="flex flex-col space-y-4">
            {/* Full Item Image */}
            <div className="relative w-full h-56 rounded-2xl bg-surface-container-low border border-surface-container-high/60 overflow-hidden flex items-center justify-center">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                <Badge variant="primary" icon="category">
                  {t(`catalog.categories.${selectedItem.category}`, { defaultValue: selectedItem.category })}
                </Badge>
                <Badge variant="surface" icon="verified">
                  {t(`catalog.conditions.${selectedItem.condition}`, { defaultValue: selectedItem.condition })}
                </Badge>
              </div>
              {selectedItem.estimatedValue !== undefined && (
                <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-surface/90 backdrop-blur-md border border-surface-container-high shadow-xs">
                  <span className="font-label-md text-label-md text-primary font-bold">
                    {t('explore.estimatedValue', { value: selectedItem.estimatedValue })}
                  </span>
                </div>
              )}
            </div>

            {/* Item Title & Description */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  {selectedItem.name}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {selectedItem.description ||
                  t('explore.defaultDescription')}
              </p>
            </div>

            {/* Owner Profile Card */}
            {selectedItemOwner && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={selectedItemOwner.avatarUrl}
                    alt={selectedItemOwner.name}
                    size="md"
                    verified={selectedItemOwner.verified}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-[14px] font-bold text-on-surface truncate">
                      {selectedItemOwner.name}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 truncate">
                      <Icon name="location_on" size="xs" />
                      <span className="truncate">{selectedItemOwner.location}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest border border-surface-container-high/60">
                    <Icon name="star" size="xs" filled className="text-secondary" />
                    <span className="font-label-md text-label-md font-bold text-on-surface">
                      {selectedItemOwner.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="font-label-sm text-[10px] text-primary font-semibold mt-1">
                    {t('explore.co2Saved', { kg: selectedItemOwner.co2SavedKg })}
                  </span>
                </div>
              </div>
            )}

            {/* Environmental & Verification Info */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
              <div className="flex items-center gap-2 text-primary">
                <Icon name="eco" size="sm" filled />
                <span className="font-label-sm text-label-sm font-bold">
                  {t('explore.cashFree')}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('explore.protectedCustody')}
              </span>
            </div>

            {/* Primary CTA or Own Item Delete */}
            {isSelectedItemMine ? (
              <Button
                variant="outline"
                size="lg"
                fullWidth
                leftIcon="delete"
                isLoading={isDeletingId === selectedItem.id}
                onClick={() => handleDeleteOwnItem(selectedItem.id)}
                className="text-error border-error/40 hover:bg-error-container/20"
              >
                {t('explore.deleteMine')}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                rightIcon="send"
                onClick={() => {
                  navigate('/swap/configure', {
                    state: { wantItemId: selectedItem.id, wantItemName: selectedItem.name },
                  });
                  setSelectedItem(null);
                }}
              >
                {t('explore.proposeSwap')}
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
