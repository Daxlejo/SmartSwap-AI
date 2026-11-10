import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ItemImage } from '@/components/ui/ItemImage';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCop } from '@/utils/currency';
import { LocationPrompt } from '@/components/LocationPrompt';
import { LocationScopeSelector } from '@/components/LocationScopeSelector';

const VALUE_TOLERANCE_PCT = 25;
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

  const selectedOfferItem: Item | undefined = myItems[offerIndex % Math.max(1, myItems.length)];
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
    if (myItems.length > 1) setOfferIndex((index) => (index + 1) % myItems.length);
  };

  const canSearch = Boolean(selectedOfferItem) && trimmedQuery.length >= 2;

  const handleSearch = () => {
    if (!selectedOfferItem || !canSearch) return;
    const maxSteps = swapMode === 'direct' ? 2 : 4;
    const wantItemId = targetItem?.id ?? '';
    const params = new URLSearchParams({
      have: selectedOfferItem.id,
      q: trimmedQuery,
      maxSteps: String(maxSteps),
      tolerance: String(VALUE_TOLERANCE_PCT),
    });
    if (wantItemId) params.set('want', wantItemId);

    navigate(`/swap/searching?${params.toString()}`, {
      state: {
        offeredItemId: selectedOfferItem.id,
        wantItemId,
        objectiveText: trimmedQuery,
        desiredCategory: targetItem?.category,
        maxSteps,
        valueTolerancePct: VALUE_TOLERANCE_PCT,
      },
    });
  };

  return (
    <div className="flex flex-col w-full px-margin pt-2 pb-28">
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
      ) : myItems.length === 0 ? (
        <EmptyState
          illustration="routes"
          title={t('states.homeNoItems')}
          action={
            <Button variant="primary" size="md" onClick={() => navigate('/publish')}>
              {t('states.homeNoItemsCta')}
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
              {myItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleOfferItem}
                  className="text-primary font-label-md text-label-md flex items-center gap-0.5 hover:opacity-80 active:scale-95 transition-all"
                >
                  <span>{t('configure.change')}</span>
                  <Icon name="swap_horiz" size="sm" />
                </button>
              )}
            </div>

            {selectedOfferItem && (
              <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 relative overflow-hidden transition-all duration-300">
                <div className="flex items-start gap-space-md">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-surface-container shrink-0">
                    <ItemImage src={selectedOfferItem.imageUrl} alt={selectedOfferItem.name} category={selectedOfferItem.category} className="w-full h-full" />
                    <span className="absolute bottom-1.5 left-1.5 bg-surface/90 backdrop-blur-md px-1.5 py-0.5 rounded-md font-label-sm text-[10px] text-primary font-bold flex items-center gap-0.5">
                      <Icon name="verified" size="xs" filled />
                      {t('configure.verified')}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full font-label-sm text-[11px]">
                          {t('configure.inInventory')}
                        </span>
                        <span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold">
                          {selectedOfferItem.condition}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                        {selectedOfferItem.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                        {selectedOfferItem.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 bg-surface-container-low/60 -mx-2 -mb-2 px-2.5 py-1.5 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <Icon name="currency_exchange" size="sm" className="text-primary" />
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {t('configure.estimatedValue')}
                        </span>
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          {formatCop(selectedOfferItem.estimatedValue)}
                        </span>
                      </div>
                    </div>
                  </div>
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
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
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
              <div
                onClick={() => setSwapMode('circular')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSwapMode('circular');
                }}
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border-2 select-none active:scale-[0.99] ${
                  swapMode === 'circular'
                    ? 'border-secondary-container/60 bg-secondary-container/10'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapMode === 'circular'}
                  onChange={() => setSwapMode('circular')}
                  className="mt-1 accent-secondary"
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">
                      {t('configure.circularTitle')}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0">
                      {t('configure.recommended')}
                    </Badge>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                    {t('configure.circularDescription')}
                  </p>
                </div>
              </div>

              {/* Direct Swap Option */}
              <div
                onClick={() => setSwapMode('direct')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSwapMode('direct');
                }}
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border-2 select-none active:scale-[0.99] ${
                  swapMode === 'direct'
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="swapMode"
                  checked={swapMode === 'direct'}
                  onChange={() => setSwapMode('direct')}
                  className="mt-1 accent-primary"
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {t('configure.directTitle')}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                    {t('configure.directDescription')}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Trust & Circular Impact Teaser */}
          <div className="bg-gradient-to-r from-primary/10 via-surface-container-low to-tertiary/10 p-space-md rounded-2xl border border-surface-container-high/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
              <Icon name="eco" size="md" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="font-label-md text-label-md text-on-surface font-bold">
                {t('configure.impactTitle')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('configure.impactDescription')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Floating CTA - End of ConfigureSwap flow */}
      <div className="fixed bottom-0 inset-x-0 p-space-md bg-surface/90 backdrop-blur-xl border-t border-surface-container-high/60 z-40 flex flex-col gap-2 max-w-[390px] mx-auto">
        <Button
          size="lg"
          variant="primary"
          fullWidth
          rightIcon="explore"
          disabled={!canSearch}
          onClick={handleSearch}
        >
          <span>{t('configure.searchRoutes')}</span>
        </Button>
        <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
          {t('configure.custodyGuarantee')}
        </p>
      </div>
    </div>
  );
};
