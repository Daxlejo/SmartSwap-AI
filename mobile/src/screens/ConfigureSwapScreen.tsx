import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { getMyItems, getItems } from '@/services/swapService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

interface TargetPreset {
  id: string;
  name: string;
  title: string;
  matchRate: string;
  details: string;
  imageUrl: string;
  co2Saved: string;
  routesCount: number;
}

const itemIdMap: Record<string, string> = {
  fujifilm: 'item-camera',
  ipad: 'item-ipad',
  ps5: 'item-switch',
  sony: 'item-headphones',
};

export const ConfigureSwapScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const { searchRoutesReal } = useApp();
  const preselectedWant = location.state as { wantItemId?: string; wantItemName?: string } | null;

  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedOfferItem, setSelectedOfferItem] = useState<Item | null>(null);
  const [hasSecondaryItem, setHasSecondaryItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Search / Target item state
  const [searchQuery, setSearchQuery] = useState('Cámara Fujifilm X-T30 II');
  const [activeTag, setActiveTag] = useState<string>('fujifilm');
  const [targetPreset, setTargetPreset] = useState<TargetPreset | null>(null);

  // Filters state
  const [geoMode, setGeoMode] = useState<'local' | 'nationwide'>('local');
  const [swapMode, setSwapMode] = useState<'circular' | 'direct'>('circular');

  // Load items from service
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [userItems, allItems] = await Promise.all([getMyItems(), getItems()]);

        if (isMounted) {
          setMyItems(userItems);
          if (userItems.length > 0) {
            setSelectedOfferItem(userItems[0]);
          }

          if (preselectedWant && (preselectedWant.wantItemId || preselectedWant.wantItemName)) {
            if (preselectedWant.wantItemName) {
              setSearchQuery(preselectedWant.wantItemName);
            }

            const matchedItem = allItems.find(
              (i) =>
                (preselectedWant.wantItemId && i.id === preselectedWant.wantItemId) ||
                (preselectedWant.wantItemName &&
                  i.name.toLowerCase() === preselectedWant.wantItemName.toLowerCase()),
            );

            if (matchedItem) {
              const matchedTag = Object.keys(itemIdMap).find(
                (k) => itemIdMap[k] === matchedItem.id,
              );
              setActiveTag(matchedTag || 'custom');
              setTargetPreset({
                id: matchedTag || matchedItem.id,
                name: matchedItem.name,
                title: matchedItem.name,
                matchRate: t('configure.matchRate', { percent: 96 }),
                details:
                  matchedItem.description ||
                  t('configure.details.estimatedRange', { value: matchedItem.estimatedValue ?? 500 }),
                imageUrl: matchedItem.imageUrl,
                co2Saved: '38 kg',
                routesCount: 6,
              });
            } else if (preselectedWant.wantItemName) {
              setActiveTag('custom');
              setTargetPreset({
                id: preselectedWant.wantItemId || 'custom',
                name: preselectedWant.wantItemName,
                title: preselectedWant.wantItemName,
                matchRate: t('configure.matchRate', { percent: 90 }),
                details: t('configure.details.customSearch'),
                imageUrl: allItems[0]?.imageUrl || '',
                co2Saved: '35 kg',
                routesCount: 4,
              });
            }
          } else {
            const cameraItem = allItems.find((i) => i.id === 'item-camera');
            if (cameraItem) {
              setTargetPreset({
                id: 'fujifilm',
                name: 'Cámara Fujifilm X-T30 II',
                title: cameraItem.name + ' + 15-45mm',
                matchRate: t('configure.matchRate', { percent: 98 }),
                details: t('configure.details.cameraRange'),
                imageUrl: cameraItem.imageUrl,
                co2Saved: '42 kg',
                routesCount: 7,
              });
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [preselectedWant, t]);

  const handleSelectTag = async (key: string, name: string) => {
    setActiveTag(key);
    setSearchQuery(name);

    const allItems = await getItems();
    const targetId = itemIdMap[key] || 'item-camera';
    const foundItem = allItems.find((i) => i.id === targetId);

    if (foundItem) {
      setTargetPreset({
        id: key,
        name: foundItem.name,
        title: foundItem.name,
        matchRate: t('configure.matchRate', { percent: key === 'fujifilm' ? 98 : 92 }),
        details: foundItem.description || t('configure.details.adequateFit'),
        imageUrl: foundItem.imageUrl,
        co2Saved: '38 kg',
        routesCount: key === 'fujifilm' ? 7 : 4,
      });
    }
  };

  const handleToggleOfferItem = () => {
    if (myItems.length <= 1) return;
    const currentIndex = myItems.findIndex((i) => i.id === selectedOfferItem?.id);
    const nextIndex = (currentIndex + 1) % myItems.length;
    setSelectedOfferItem(myItems[nextIndex]);
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
        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          1,420 usuarios activos
        </span>
      </div>

      {isLoading ? (
        <div className="flex flex-col space-y-4">
          <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
          <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
        </div>
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
                    <img
                      src={selectedOfferItem.imageUrl}
                      alt={selectedOfferItem.name}
                      className="w-full h-full object-cover"
                    />
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
                          ${selectedOfferItem.estimatedValue ?? 780} USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasSecondaryItem(!hasSecondaryItem)}
                  className="w-full mt-3 py-2 bg-surface-container-low hover:bg-surface-container active:scale-[0.99] text-primary font-label-md text-label-md rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Icon name={hasSecondaryItem ? 'remove_circle' : 'add_circle'} size="sm" />
                  <span>
                    {hasSecondaryItem
                      ? t('configure.secondaryAdded')
                      : t('configure.addSecondary')}
                  </span>
                </button>
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
              <span className="font-body-sm text-body-sm text-secondary font-semibold flex items-center gap-0.5">
                <Icon name="auto_awesome" size="xs" />
                {t('configure.suggestions')}
              </span>
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

              {/* Wishlist quick tags */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('configure.savedWants')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip
                    active={activeTag === 'fujifilm'}
                    icon="photo_camera"
                    onClick={() => handleSelectTag('fujifilm', 'Cámara Fujifilm X-T30 II')}
                  >
                    Fujifilm X-T30 II
                  </Chip>
                  <Chip
                    active={activeTag === 'ipad'}
                    icon="tablet_mac"
                    onClick={() => handleSelectTag('ipad', 'iPad Air M2')}
                  >
                    iPad Air M2
                  </Chip>
                  <Chip
                    active={activeTag === 'ps5'}
                    icon="sports_esports"
                    onClick={() => handleSelectTag('ps5', 'PlayStation 5 Slim')}
                  >
                    PS5 Slim
                  </Chip>
                  <Chip
                    active={activeTag === 'sony'}
                    icon="headphones"
                    onClick={() => handleSelectTag('sony', 'Sony WH-1000XM5')}
                  >
                    Sony XM5
                  </Chip>
                </div>
              </div>

              {/* Target item preview */}
              {targetPreset && (
                <div className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded-xl">
                  <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                    <img
                      src={targetPreset.imageUrl}
                      alt={targetPreset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-headline-sm text-[14px] text-on-surface font-semibold truncate">
                        {targetPreset.title}
                      </p>
                      <Badge variant="primary-subtle" className="text-[10px] py-0">
                        {targetPreset.matchRate}
                      </Badge>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-[11px] truncate mt-0.5">
                      {targetPreset.details}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Geographic Radius Selector */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="near_me" size="sm" className="text-primary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {t('configure.radius')}
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {geoMode === 'local' ? t('configure.localArea') : t('configure.nationwideArea')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGeoMode('local')}
                className={`flex flex-col p-3 rounded-xl text-left transition-all border-2 active:scale-[0.98] ${
                  geoMode === 'local'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon
                    name="location_city"
                    size="sm"
                    className={geoMode === 'local' ? 'text-primary' : 'text-on-surface-variant'}
                  />
                  {geoMode === 'local' ? (
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-container-highest" />
                  )}
                </div>
                <span
                  className={`font-label-lg text-label-lg font-bold ${
                    geoMode === 'local' ? 'text-primary' : 'text-on-surface'
                  }`}
                >
                  {t('configure.inMyCity')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
                  {t('configure.upTo15km')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGeoMode('nationwide')}
                className={`flex flex-col p-3 rounded-xl text-left transition-all border-2 active:scale-[0.98] ${
                  geoMode === 'nationwide'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-transparent bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon
                    name="local_shipping"
                    size="sm"
                    className={
                      geoMode === 'nationwide' ? 'text-primary' : 'text-on-surface-variant'
                    }
                  />
                  {geoMode === 'nationwide' ? (
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">
                      ✓
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-container-highest" />
                  )}
                </div>
                <span
                  className={`font-label-lg text-label-lg font-bold ${
                    geoMode === 'nationwide' ? 'text-primary' : 'text-on-surface'
                  }`}
                >
                  {t('configure.nationwide')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-0.5">
                  {t('configure.secureShipping')}
                </span>
              </button>
            </div>
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
                    <strong className="text-secondary font-semibold ml-1">
                      {t('configure.moreLikely')}
                    </strong>{' '}
                    de concretar tu canje hoy.
                  </p>

                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 bg-surface-container-lowest/90 p-2 rounded-xl border border-surface-container-high/40">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-label-sm text-[10px] flex items-center justify-center font-bold">
                      {t('configure.you')}
                    </div>
                    <Icon name="arrow_forward" size="xs" className="text-on-surface-variant" />
                    <div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[10px] flex items-center justify-center font-bold">
                      C.R.
                    </div>
                    <Icon name="arrow_forward" size="xs" className="text-on-surface-variant" />
                    <div className="w-6 h-6 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-[10px] flex items-center justify-center font-bold">
                      S.V.
                    </div>
                    <Icon name="cached" size="xs" className="text-secondary" />
                    <span className="font-label-sm text-label-sm text-secondary font-bold ml-auto">
                      +4 circuitos activos
                    </span>
                  </div>
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
                {t('configure.impactDescription', { kg: targetPreset?.co2Saved || '42 kg' })}
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
          onClick={() => {
            const offerItemId = selectedOfferItem?.id || 'item-bike';
            const targetItemId =
              (targetPreset && (itemIdMap[targetPreset.id] || targetPreset.id)) || 'item-camera';
            const objectiveText =
              searchQuery.trim() || targetPreset?.name || 'Cámara Fujifilm X-T30 II';
            const maxSteps = swapMode === 'direct' ? 2 : 4;
            const valueTolerancePct = hasSecondaryItem ? 35 : 25;

            // Pre-trigger backend route discovery
            searchRoutesReal({
              offeredItemId: offerItemId,
              objectiveText,
              desiredCategory: selectedOfferItem?.category,
              maxSteps,
              valueTolerancePct,
            }).catch(() => {});

            const queryString = new URLSearchParams({
              have: offerItemId,
              want: targetItemId,
              q: objectiveText,
              maxSteps: String(maxSteps),
              tolerance: String(valueTolerancePct),
            }).toString();

            navigate(`/swap/searching?${queryString}`, {
              state: {
                offeredItemId: offerItemId,
                wantItemId: targetItemId,
                objectiveText,
                desiredCategory: selectedOfferItem?.category,
                maxSteps,
                valueTolerancePct,
              },
            });
          }}
        >
          <span>{t('configure.searchRoutes')}</span>
          <span className="w-5 h-5 rounded-full bg-on-primary/20 text-on-primary font-label-sm text-label-sm flex items-center justify-center ml-1">
            {targetPreset?.routesCount ?? 7}
          </span>
        </Button>
        <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
          {t('configure.custodyGuarantee')}
        </p>
      </div>
    </div>
  );
};
