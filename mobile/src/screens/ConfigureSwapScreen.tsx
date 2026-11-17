import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { useItem } from '@/hooks/useItem';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ItemImage } from '@/components/ui/ItemImage';
import { LocationScopeSelector } from '@/components/LocationScopeSelector';
import { formatCop } from '@/utils/currency';
import {
  buildCircularSearch,
  findWantedCandidates,
  isOfferableItem,
  parseSwapDraft,
  reachableStep,
  swapDraftPath,
  type DirectProposalDraft,
  type SwapDraft,
  type SwapMode,
} from '@/utils/swapSearch';

const MAX_SAVED_WANT_CHIPS = 6;
const TOTAL_STEPS = 3;

/** One selectable item: photo, full name and one support line. */
const ItemOption = ({
  item,
  selected,
  name,
  onSelect,
  testId,
}: {
  item: Item;
  selected: boolean;
  name: string;
  onSelect: () => void;
  testId?: string;
}) => {
  const { t } = useTranslation();
  const support = [
    t(`catalog.conditions.${item.condition}`, { defaultValue: item.condition }),
    item.estimatedValue !== undefined ? formatCop(item.estimatedValue) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <label
      data-testid={testId}
      className={`flex items-center gap-3 min-h-12 p-3 rounded-2xl cursor-pointer border-2 transition-colors select-none ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low'
      }`}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only peer" />
      <ItemImage
        src={item.imageUrl}
        alt=""
        category={item.category}
        className="w-16 h-16 rounded-xl bg-surface-container-high shrink-0"
      />
      <span className="flex flex-col min-w-0 flex-1">
        <span className="font-label-lg text-label-lg font-bold text-on-surface break-words">{item.name}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant break-words">{support}</span>
      </span>
      <span
        aria-hidden="true"
        className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
          selected ? 'border-primary' : 'border-outline'
        }`}
      >
        {selected && <span className="w-3 h-3 rounded-full bg-primary" />}
      </span>
    </label>
  );
};

/** Small summary row of a choice made in an earlier step. */
const ChoiceSummary = ({ label, item }: { label: string; item: Item }) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
    <ItemImage
      src={item.imageUrl}
      alt=""
      category={item.category}
      className="w-12 h-12 rounded-xl bg-surface-container-high shrink-0"
    />
    <span className="flex flex-col min-w-0">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className="font-label-lg text-label-lg font-bold text-on-surface break-words">{item.name}</span>
    </span>
  </div>
);

/** A swap type: title, one plain sentence and a small picture of who takes part. */
const ModeOption = ({
  mode,
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  mode: SwapMode;
  selected: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  description: string;
}) => (
  <label
    data-testid={`swap-mode-${mode}`}
    className={`flex items-start gap-3 min-h-12 p-4 rounded-2xl cursor-pointer border-2 transition-colors select-none ${
      selected
        ? 'border-primary bg-primary/10'
        : 'border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low'
    }`}
  >
    <input type="radio" name="swapMode" checked={selected} onChange={onSelect} className="sr-only peer" />
    <span
      aria-hidden="true"
      className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center ${
        selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
      }`}
    >
      <Icon name={icon} size="md" />
    </span>
    <span className="flex flex-col flex-1 min-w-0">
      <span className="font-label-lg text-label-lg text-on-surface font-bold">{title}</span>
      <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{description}</span>
    </span>
    <span
      aria-hidden="true"
      className={`mt-2.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
        selected ? 'border-primary' : 'border-outline'
      }`}
    >
      {selected && <span className="w-3 h-3 rounded-full bg-primary" />}
    </span>
  </label>
);

/**
 * New swap in three steps: (1) what you offer, (2) what you receive, (3) the type of
 * swap. Each step is its own history entry (`?step=`), so Android's back button and
 * the arrow go back one step with the earlier choices kept in the URL.
 */
export const ConfigureSwapScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { currentUser, myItems, items, isItemsLoading, loadStates, refreshItems } = useApp();

  const draft = parseSwapDraft(searchParams);
  const step = reachableStep(draft);

  const offerableItems = useMemo(() => myItems.filter(isOfferableItem), [myItems]);
  // With a single published item it comes chosen
  const offeredItemId =
    draft.offeredItemId ?? (offerableItems.length === 1 ? offerableItems[0].id : undefined);
  const offeredItem = offerableItems.find((item) => item.id === offeredItemId);
  const { item: wantedItem, status: wantedStatus } = useItem(draft.wantedItemId);

  const [query, setQuery] = useState('');
  const mode: SwapMode = draft.mode ?? 'direct';

  const goTo = (next: Partial<SwapDraft>, replace = false) =>
    navigate(swapDraftPath({ ...draft, offeredItemId, ...next }), { replace, state: location.state });

  const savedWants = useMemo(
    () =>
      Array.from(new Set(myItems.flatMap((item) => item.wants.map((want) => want.trim()))))
        .filter((want) => want.length > 0)
        .slice(0, MAX_SAVED_WANT_CHIPS),
    [myItems],
  );
  const candidates = useMemo(
    () => findWantedCandidates(items, query, currentUser?.id),
    [items, query, currentUser?.id],
  );
  // The chosen item stays on the list while the user types something else
  const shownCandidates =
    wantedItem && !draft.wantFixed && !candidates.some((item) => item.id === wantedItem.id)
      ? [wantedItem, ...candidates]
      : candidates;

  const handleContinue = () => {
    if (step === 1 && offeredItem) {
      goTo({ step: 2 });
    } else if (step === 2 && wantedItem) {
      goTo({ step: 3 });
    } else if (step === 3 && offeredItem && wantedItem) {
      if (mode === 'direct') {
        const direct: DirectProposalDraft = { offeredItem, wantedItem };
        navigate('/swap/proposal/confirm', { state: { direct } });
      } else {
        const search = buildCircularSearch(offeredItem, wantedItem);
        navigate(search.path, { state: search.state });
      }
    }
  };

  const canContinue =
    (step === 1 && Boolean(offeredItem)) ||
    (step === 2 && Boolean(wantedItem)) ||
    (step === 3 && Boolean(offeredItem && wantedItem));

  const continueLabel =
    step < 3
      ? t('configure.next')
      : mode === 'direct'
        ? t('configure.reviewDirect')
        : t('configure.searchRings');

  const titles: Record<1 | 2 | 3, string> = {
    1: t('configure.offerTitle'),
    2: t('configure.receiveTitle'),
    3: t('configure.typeTitle'),
  };

  let body: ReactNode;
  if (isItemsLoading && myItems.length === 0) {
    body = (
      <div aria-busy="true" className="flex flex-col gap-3">
        <div className="h-24 rounded-2xl bg-surface-container-low animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface-container-low animate-pulse" />
      </div>
    );
  } else if (loadStates.items === 'error' && myItems.length === 0) {
    body = <ErrorState onRetry={() => void refreshItems()} />;
  } else if (offerableItems.length === 0) {
    body = (
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
    );
  } else if (step === 1) {
    body = (
      <div role="radiogroup" aria-label={titles[1]} className="flex flex-col gap-2.5">
        <p className="font-body-md text-body-md text-on-surface-variant">{t('configure.offerHint')}</p>
        {offerableItems.map((item) => (
          <ItemOption
            key={item.id}
            item={item}
            name="offeredItem"
            testId={`offer-option-${item.id}`}
            selected={item.id === offeredItemId}
            onSelect={() => goTo({ offeredItemId: item.id }, true)}
          />
        ))}
      </div>
    );
  } else if (step === 2) {
    body = draft.wantFixed ? (
      <div className="flex flex-col gap-3">
        <p className="font-body-md text-body-md text-on-surface-variant">{t('configure.receiveFixedHint')}</p>
        {wantedItem ? (
          <ChoiceSummary label={t('configure.youReceive')} item={wantedItem} />
        ) : wantedStatus === 'loading' ? (
          <div className="h-20 rounded-2xl bg-surface-container-low animate-pulse" />
        ) : (
          <EmptyState iconName="inventory_2" title={t('itemDetail.missingTitle')} />
        )}
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <p className="font-body-md text-body-md text-on-surface-variant">{t('configure.receiveHint')}</p>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-on-surface-variant pointer-events-none flex items-center">
            <Icon name="search" size="md" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('configure.searchPlaceholder')}
            aria-label={t('configure.searchAria')}
            data-testid="configure-want-search"
            className={`w-full h-12 pl-12 ${query ? 'pr-12' : 'pr-4'} bg-surface-container-low rounded-2xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant border border-surface-container-high/60 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary`}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('configure.clearSearch')}
              className="absolute right-0.5 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>

        {savedWants.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-body-sm text-body-sm text-on-surface-variant">{t('configure.savedWants')}</span>
            <div className="flex flex-wrap gap-1.5">
              {savedWants.map((want) => (
                <Chip
                  key={want}
                  active={query.trim().toLowerCase() === want.toLowerCase()}
                  onClick={() => setQuery(want)}
                >
                  {want}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {shownCandidates.length > 0 ? (
          <div role="radiogroup" aria-label={titles[2]} className="flex flex-col gap-2.5">
            {shownCandidates.map((item) => (
              <ItemOption
                key={item.id}
                item={item}
                name="wantedItem"
                testId={`want-option-${item.id}`}
                selected={item.id === wantedItem?.id}
                onSelect={() => goTo({ wantedItemId: item.id }, true)}
              />
            ))}
          </div>
        ) : query.trim().length >= 2 ? (
          <p className="p-4 rounded-2xl bg-surface-container-low font-body-md text-body-md text-on-surface-variant text-center">
            {t('configure.noMatches')}
          </p>
        ) : null}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {offeredItem && <ChoiceSummary label={t('configure.youOffer')} item={offeredItem} />}
        {wantedItem && <ChoiceSummary label={t('configure.youReceive')} item={wantedItem} />}
        <div role="radiogroup" aria-label={titles[3]} className="flex flex-col gap-2.5 pt-2">
          <ModeOption
            mode="direct"
            selected={mode === 'direct'}
            onSelect={() => goTo({ mode: 'direct' }, true)}
            icon="sync_alt"
            title={t('configure.directTitle')}
            description={t('configure.directDescription', {
              name: wantedItem?.owner?.name ?? t('configure.theOwner'),
            })}
          />
          <ModeOption
            mode="circular"
            selected={mode === 'circular'}
            onSelect={() => goTo({ mode: 'circular' }, true)}
            icon="cycle"
            title={t('configure.circularTitle')}
            description={t('configure.circularDescription')}
          />
        </div>
        {mode === 'circular' && (
          <section className="flex flex-col gap-2 pt-1" aria-label={t('configure.radius')}>
            <span className="font-label-lg text-label-lg font-bold text-on-surface">{t('configure.radius')}</span>
            <LocationScopeSelector layout="chips" />
          </section>
        )}
      </div>
    );
  }

  const showSteps = offerableItems.length > 0 && !(isItemsLoading && myItems.length === 0);

  return (
    <div className="flex flex-col flex-1 w-full px-margin pt-4">
      {showSteps && (
        <header className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index < step ? 'bg-primary' : 'bg-surface-container-high'}`}
              />
            ))}
          </div>
          <p className="font-label-md text-label-md font-bold text-primary">
            {t('configure.stepOf', { step, total: TOTAL_STEPS })}
          </p>
          <h2 data-testid="configure-step-title" className="font-headline-md text-headline-md font-bold text-on-surface">
            {titles[step]}
          </h2>
        </header>
      )}

      {body}

      {showSteps && (
        <>
          <div aria-hidden="true" className="h-6 shrink-0" />
          <div className="sticky bottom-0 mt-auto -mx-margin px-margin pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high z-40">
            <Button
              data-testid="configure-continue-button"
              size="lg"
              variant="primary"
              fullWidth
              rightIcon={step < 3 ? 'arrow_forward' : mode === 'direct' ? 'send' : 'cycle'}
              disabled={!canContinue}
              onClick={handleContinue}
            >
              {continueLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
