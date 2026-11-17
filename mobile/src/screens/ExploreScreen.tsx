import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { Item, User } from '@/types';
import { ObjectCard } from '@/components/ObjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/services/http/apiClient';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { LocationPrompt } from '@/components/LocationPrompt';
import { ExploreFiltersSheet, DEFAULT_ZONE } from '@/components/ExploreFiltersSheet';
import { itemsService } from '@/services/items/items.service';
import type { LocationScopePreference } from '@/services/storage/preferencesStorage';
import {
  DEFAULT_EXPLORE_FILTERS,
  activeFilterKeys,
  applyExploreFilters,
  clearFilter,
  type ActiveFilterKey,
  type ExploreFilters,
} from '@/utils/exploreFilters';
import { ScreenHeader } from '@/components/ScreenHeader';

export const ExploreScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    items,
    currentUser,
    isItemsLoading,
    loadStates,
    refreshItems,
    locationScope,
    setLocationScope,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_EXPLORE_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Items of another zone, loaded while the sheet is open so "Apply (N)" counts for real
  const [zonePreview, setZonePreview] = useState<{
    zone: LocationScopePreference;
    items: Item[] | null;
  } | null>(null);

  useEffect(() => {
    void refreshItems();
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

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
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
        avatarUrl: item.owner.avatarUrl,
        rating: item.owner.rating,
        location: item.owner.location,
        verified: item.owner.verified ?? false,
        co2SavedKg: item.owner.co2SavedKg ?? 0,
      };
    }
    return usersById.get(item.ownerId);
  };

  // Explore lists only what the user can ask for: the API already leaves out their own
  // items; this also covers a list loaded before the session was known
  const viewerId = currentUser?.id;
  const othersItems = useMemo(
    () => (viewerId ? items.filter((item) => item.ownerId !== viewerId) : items),
    [items, viewerId],
  );

  const filteredItems = useMemo(
    () => applyExploreFilters(othersItems, searchQuery, filters),
    [othersItems, searchQuery, filters],
  );

  const municipalityCode = currentUser?.municipalityCode;

  const handleDraftZoneChange = useCallback(
    (zone: LocationScopePreference) => {
      if (zone === locationScope || !municipalityCode) return;
      setZonePreview({ zone, items: null });
      itemsService
        .listItems({ scope: zone, municipalityCode, excludeOwnerId: viewerId })
        .then((list) =>
          setZonePreview((current) => (current?.zone === zone ? { zone, items: list } : current)),
        )
        .catch(() => {
          // Without the preview the button just says "Apply"; applying still loads the zone
        });
    },
    [locationScope, municipalityCode, viewerId],
  );

  const countFor = useCallback(
    (draft: ExploreFilters, zone: LocationScopePreference): number | null => {
      const source =
        zone === locationScope ? othersItems : zonePreview?.zone === zone ? zonePreview.items : null;
      return source ? applyExploreFilters(source, searchQuery, draft).length : null;
    },
    [othersItems, locationScope, zonePreview, searchQuery],
  );

  const handleApplyFilters = (next: ExploreFilters, zone: LocationScopePreference) => {
    setFilters(next);
    if (zone !== locationScope) setLocationScope(zone);
    setZonePreview(null);
    setIsFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters(DEFAULT_EXPLORE_FILTERS);
  };

  const activeKeys = activeFilterKeys(filters);
  const showZoneChip = Boolean(municipalityCode) && locationScope !== DEFAULT_ZONE;
  const activeFilterCount = activeKeys.length + (showZoneChip ? 1 : 0);

  const chipLabel = (key: ActiveFilterKey): string => {
    switch (key) {
      case 'category':
        return t(`catalog.categories.${filters.category}`, { defaultValue: filters.category ?? '' });
      case 'condition':
        return t(`catalog.conditions.${filters.condition}`, { defaultValue: filters.condition ?? '' });
      case 'price':
        if (filters.minPrice !== null && filters.maxPrice !== null) {
          return t('explore.filters.priceRange', {
            min: formatCop(filters.minPrice),
            max: formatCop(filters.maxPrice),
          });
        }
        return filters.minPrice !== null
          ? t('explore.filters.priceFrom', { min: formatCop(filters.minPrice) })
          : t('explore.filters.priceUpTo', { max: formatCop(filters.maxPrice) });
      case 'sort':
        return t(`explore.sortOptions.${filters.sort}`);
    }
  };

  const hasActiveFilters = searchQuery.trim() !== '' || activeKeys.length > 0;

  const showSkeleton = isItemsLoading && items.length === 0;
  const hasMunicipality = Boolean(currentUser?.municipalityCode);
  const widenTarget =
    hasMunicipality && locationScope === 'nearby'
      ? 'department'
      : hasMunicipality && locationScope === 'department'
        ? 'country'
        : null;

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="px-margin pt-4 space-y-3">
        <ScreenHeader title={t('headers.explore.title')} />
        <LocationPrompt />
      </div>
      {/* Sticky at the top (this tab has no TopBar): only the search and the Filters button, on
          an opaque background so the cards scrolling underneath never show through */}
      <div className="sticky top-safe z-30 bg-surface border-b border-surface-container-high px-margin pt-3 pb-3 space-y-3">
        {/* Section 1: Search Bar */}
        {/* With large system text the button drops under the search instead of squeezing it */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center flex-1 min-w-[11rem]">
            <span className="absolute left-4 text-on-surface-variant pointer-events-none flex items-center">
              <Icon name="search" size="md" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('explore.searchPlaceholder')}
              aria-label={t('explore.searchAria')}
              className={`w-full h-12 pl-11 ${searchQuery ? 'pr-11' : 'pr-3'} rounded-2xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-md text-body-md border border-surface-container-high/60 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all`}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('explore.clearSearch')}
                className="absolute right-0.5 w-11 h-11 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center active:scale-95 transition-all"
              >
                <Icon name="close" size="sm" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFiltersOpen(true)}
            data-testid="explore-filters-button"
            aria-haspopup="dialog"
            className={`shrink-0 inline-flex items-center gap-1.5 min-h-12 px-4 rounded-2xl font-label-lg text-label-lg font-bold border transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeFilterCount > 0
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest text-on-surface border-outline/60 hover:bg-surface-container-low'
            }`}
          >
            <Icon name="tune" size="sm" />
            <span>
              {activeFilterCount > 0
                ? t('explore.filters.buttonCount', { count: activeFilterCount })
                : t('explore.filters.button')}
            </span>
          </button>
        </div>

        {/* Active filters: each chip removes its own filter right away */}
        {(showZoneChip || activeKeys.length > 0) && (
          <ul aria-label={t('explore.filters.activeAria')} className="flex flex-wrap gap-2">
            {showZoneChip && (
              <li>
                <button
                  type="button"
                  onClick={() => setLocationScope(DEFAULT_ZONE)}
                  aria-label={t('explore.filters.remove', { label: t(`location.scope.${locationScope}`) })}
                  className="inline-flex items-center gap-1 min-h-11 pl-3 pr-2 rounded-full bg-primary/10 text-primary border border-primary/30 font-label-md text-label-md font-bold"
                >
                  <span>{t(`location.scope.${locationScope}`)}</span>
                  <Icon name="close" size="xs" />
                </button>
              </li>
            )}
            {activeKeys.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  data-testid={`explore-chip-${key}`}
                  onClick={() => setFilters((current) => clearFilter(current, key))}
                  aria-label={t('explore.filters.remove', { label: chipLabel(key) })}
                  className="inline-flex items-center gap-1 min-h-11 pl-3 pr-2 rounded-full bg-primary/10 text-primary border border-primary/30 font-label-md text-label-md font-bold"
                >
                  <span>{chipLabel(key)}</span>
                  <Icon name="close" size="xs" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters and result count (not sticky: they scroll away with the list) */}
      <div className="px-margin pt-3 pb-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {showSkeleton ? t('explore.loadingCatalog') : t('explore.itemsFound', { count: filteredItems.length })}
          </span>
          <div className="flex flex-wrap items-center">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-11 px-2 font-label-md text-label-md text-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                <Icon name="restart_alt" size="sm" />
                <span>{t('explore.clearFilters')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isItemsLoading}
              aria-label={t('explore.refreshAria')}
              className="min-h-11 px-2 font-label-md text-label-md text-primary font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Icon name="refresh" size="sm" className={isRefreshing || isItemsLoading ? 'animate-spin' : undefined} />
              <span>{isRefreshing ? t('explore.refreshing') : t('explore.refresh')}</span>
            </button>
          </div>
        </div>
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
        ) : loadStates.items === 'error' && items.length === 0 ? (
          <ErrorState onRetry={() => void refreshItems()} />
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-[45vh]">
            <EmptyState
              illustration="search"
              title={
                hasActiveFilters
                  ? t('states.explore')
                  : widenTarget
                    ? t('location.empty.title')
                    : t('states.explore')
              }
              action={
                !hasActiveFilters && widenTarget ? (
                  <Button
                    variant="tonal"
                    size="sm"
                    leftIcon={widenTarget === 'department' ? 'map' : 'public'}
                    onClick={() => setLocationScope(widenTarget)}
                  >
                    {widenTarget === 'department'
                      ? t('location.empty.widenDepartment')
                      : t('location.empty.widenCountry')}
                  </Button>
                ) : hasActiveFilters ? (
                  <Button
                    variant="tonal"
                    size="sm"
                    leftIcon="restart_alt"
                    onClick={handleResetFilters}
                  >
                    {t('explore.resetFilters')}
                  </Button>
                ) : (
                  <Button variant="primary" size="md" onClick={() => navigate('/publish')}>
                    {t('states.exploreCta')}
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            {filteredItems.map((item) => (
              <ObjectCard
                key={item.id}
                item={item}
                owner={resolveOwner(item)}
                onOpen={() => navigate(`/item/${item.id}`, { state: { item } })}
              />
            ))}
          </div>
        )}
      </div>

      <ExploreFiltersSheet
        isOpen={isFiltersOpen}
        onClose={() => {
          setIsFiltersOpen(false);
          setZonePreview(null);
        }}
        filters={filters}
        zone={locationScope}
        showZone={Boolean(municipalityCode)}
        countFor={countFor}
        onDraftZoneChange={handleDraftZoneChange}
        onApply={handleApplyFilters}
      />

    </div>
  );
};
