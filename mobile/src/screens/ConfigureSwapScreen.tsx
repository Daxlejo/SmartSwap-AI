import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ItemImage } from '@/components/ui/ItemImage';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { LocationPrompt } from '@/components/LocationPrompt';
import { LocationScopeSelector } from '@/components/LocationScopeSelector';
import { buildSwapSearchNavigation, getSwapSearchBlocker, isOfferableItem } from '@/utils/swapSearch';

const MAX_SAVED_WANT_CHIPS = 6;

export const ConfigureSwapScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { myItems, items, isItemsLoading, loadStates, refreshItems } = useApp();
  const preselectedWant = location.state as { wantItemId?: string; wantItemName?: string } | null;

  const [offerIndex, setOfferIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(preselectedWant?.wantItemName ?? '');
  const [swapMode, setSwapMode] = useState<'circular' | 'direct'>('circular');

  // Only published items can be offered; reserved, traded or paused ones cannot enter a route.
  const offerableItems = useMemo(() => myItems.filter(isOfferableItem), [myItems]);
  const selectedOfferItem: Item | undefined =
    offerableItems[offerIndex % Math.max(1, offerableItems.length)];
  const trimmedQuery = searchQuery.trim();

  // The catalog item the objective points at: the one chosen in Explore, or the first name match.
  const targetItem = useMemo(() => {
    if (preselectedWant?.wantItemId) {
      const chosen = items.find((item) => item.id === preselectedWant.wantItemId);
      if (chosen && chosen.name.toLowerCase() === trimmedQuery.toLowerCase()) return chosen;
    }
    if (trimmedQuery.length < 2) return undefined;
    const query = trimmedQuery.toLowerCase();
    return items.find((item) => item.ownerId !== selectedOfferItem?.ownerId && item.name.toLowerCase().includes(query));
  }, [items, preselectedWant?.wantItemId, trimmedQuery, selectedOfferItem?.ownerId]);

  const savedWants = useMemo(
    () =>
      Array.from(new Set(myItems.flatMap((item) => item.wants.map((want) => want.trim())))).filter(
        (want) => want.length > 0,
      ).slice(0, MAX_SAVED_WANT_CHIPS),
    [myItems],
  );

  const handleToggleOfferItem = () => {
    if (offerableItems.length > 1) setOfferIndex((index) => (index + 1) % offerableItems.length);
  };

  const searchBlocker = getSwapSearchBlocker(
    { loaded: !isItemsLoading && loadStates.items === 'ready', publishedCount: offerableItems.length },
    trimmedQuery,
  );
  const searchNavigation = buildSwapSearchNavigation({
    blocker: searchBlocker,
    offeredItemId: selectedOfferItem?.id,
    objectiveText: trimmedQuery,
    mode: swapMode,
    target: targetItem,
  });

  const handleSearch = () => {
    // Blocked (no published item or no objective): never reach the engine or the AI.
    if (!searchNavigation) return;
    navigate(searchNavigation.path, { state: searchNavigation.state });
  };

  return (
    <div className="flex flex-col w-full px-margin pt-2">
      {/* Network Header Pill */}
      <div className="flex items-center justify-between gap-space-sm mb-space-md">
        <div className="flex items-center gap-space-xs bg-surface-container-high px-3 py-1.5 rounded-full">
          <Icon name="hub" size="sm" filled className="text-primary" />
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">
            {t('configure.badge')}
          </span>
        </div>
      </div>

      {isItemsLoading && myItems.length === 0 ? (
        <div className="flex flex-col space-y-4">
          <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
          <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
        </div>
      ) : loadStates.items === 'error' && myItems.length === 0 ? (
        <ErrorState onRetry={() => void refreshItems()} />
      ) : offerableItems.length === 0 ? (
        <EmptyState
          illustration="routes"
          title={t('configure.noItemsTitle')}
          description={t('configure.noItemsDescription')}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/publish')}>
              {t('configure.publishItem')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-space-md">
          {/* STEP 1: Lo que ofreces ("I have") */}
          <section className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                  1
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t('configure.youOffer')}
                </h2>
              </div>
              {offerableItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleOfferItem}
                  className="min-h-11 px-2 -mr-2 text-primary font-label-md text-label-md font-bold flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
                >
                  <span>{t('configure.change')}</span>
                  <Icon name="swap_horiz" size="sm" />
                </button>
              )}
            </div>

            {selectedOfferItem && (
              <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high flex flex-col gap-3">
                <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 break-words">
                  {selectedOfferItem.name}
                </h3>
                <div className="flex items-center gap-3">
                  <ItemImage
                    src={selectedOfferItem.imageUrl}
                    alt={selectedOfferItem.name}
                    category={selectedOfferItem.category}
                    className="w-16 h-16 rounded-xl bg-surface-container-high shrink-0"
                  />
                  <p className="min-w-0 font-body-sm text-body-sm text-on-surface-variant break-words">
                    {[
                      t(`catalog.conditions.${selectedOfferItem.condition}`, { defaultValue: selectedOfferItem.condition }),
                      selectedOfferItem.estimatedValue !== undefined ? formatCop(selectedOfferItem.estimatedValue) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Animated Circular Connector Node */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-0.5 h-full bg-gradient-to-b from-primary via-secondary-container to-primary opacity-30" />
            </div>
            <div className="relative z-10 flex items-center gap-2 bg-surface-container-lowest border border-surface-container-high/60 px-4 py-2 rounded-full shadow-sm">
              <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary shadow-xs">
                <Icon name="sync" size="sm" className="animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                  {t('configure.smartSwap')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-caption">
                  {t('configure.noMoney')}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 2: Lo que deseas recibir ("I want") */}
          <section className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">
                  2
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t('configure.youWant')}
                </h2>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
              {/* Search input */}
              <div className="relative flex items-center">
                <div className="absolute left-4 text-on-surface-variant pointer-events-none">
                  <Icon name="search" size="md" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('configure.searchPlaceholder')}
                  className="w-full h-12 pl-12 pr-11 py-2 bg-surface-container-low rounded-2xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label={t('configure.clearSearch')}
                    className="absolute right-3.5 w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface active:scale-90 transition-all"
                  >
                    <Icon name="close" size="xs" />
                  </button>
                )}
              </div>

              {/* Wants saved on the user's own items */}
              {savedWants.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('configure.savedWants')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {savedWants.map((want) => (
                      <Chip
                        key={want}
                        active={trimmedQuery.toLowerCase() === want.toLowerCase()}
                        onClick={() => setSearchQuery(want)}
                      >
                        {want}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Target item preview: a real catalog match, with its own value */}
              {targetItem && (
                <div className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    <ItemImage src={targetItem.imageUrl} alt={targetItem.name} category={targetItem.category} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline-sm text-[14px] text-on-surface font-semibold line-clamp-2">
                      {targetItem.name}
                    </p>
                    {targetItem.estimatedValue !== undefined && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {formatCop(targetItem.estimatedValue)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Search area: nearby, department or the whole country */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
            <div className="flex items-center gap-2">
              <Icon name="near_me" size="sm" className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {t('configure.radius')}
              </h3>
            </div>
            <LocationPrompt />
            <LocationScopeSelector layout="cards" />
          </section>

          {/* Match Routing Modes */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="alt_route" size="sm" className="text-secondary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t('configure.matchMode')}
                </h3>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Circular Loop Option */}
              <label
                className={`flex items-start gap-3 min-h-12 p-3.5 rounded-2xl cursor-pointer transition-all border-2 select-none active:scale-[0.99] ${
                  swapMode === 'circular'
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapMode === 'circular'}
                  onChange={() => setSwapMode('circular')}
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
                    swapMode === 'circular' ? 'border-primary' : 'border-outline'
                  }`}
                >
                  {swapMode === 'circular' && <span className="w-3 h-3 rounded-full bg-primary" />}
                </span>
                <span className="flex flex-col flex-1">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">{t('configure.circularTitle')}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t('configure.circularDescription')}</span>
                </span>
              </label>

              {/* Direct Swap Option */}
              <label
                className={`flex items-start gap-3 min-h-12 p-3.5 rounded-2xl cursor-pointer transition-all border-2 select-none active:scale-[0.99] ${
                  swapMode === 'direct'
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapMode === 'direct'}
                  onChange={() => setSwapMode('direct')}
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
                    swapMode === 'direct' ? 'border-primary' : 'border-outline'
                  }`}
                >
                  {swapMode === 'direct' && <span className="w-3 h-3 rounded-full bg-primary" />}
                </span>
                <span className="flex flex-col flex-1">
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">{t('configure.directTitle')}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{t('configure.directDescription')}</span>
                </span>
              </label>
            </div>
          </section>

        </div>
      )}

      {/* Fixed Bottom Floating CTA - End of ConfigureSwap flow */}
      <div className="fixed bottom-0 inset-x-0 px-margin pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high z-40 flex flex-col gap-2 max-w-[390px] mx-auto">
        <Button
          data-testid="configure-search-button"
          size="lg"
          variant="primary"
          fullWidth
          rightIcon="explore"
          disabled={searchNavigation === null}
          onClick={handleSearch}
        >
          <span>{t('configure.searchRoutes')}</span>
        </Button>
        <p
          data-testid="configure-search-hint"
          className="text-center font-label-sm text-label-sm text-on-surface-variant"
        >
          {searchBlocker === 'noItems'
            ? t('configure.needItemHint')
            : searchBlocker === 'noWant'
              ? t('configure.needWantHint')
              : t('configure.custodyGuarantee')}
        </p>
      </div>
    </div>
  );
};
