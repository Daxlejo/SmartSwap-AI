import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { LocationScopePreference } from '@/services/storage/preferencesStorage';
import { formatCopDigits, sanitizeCopDigits } from '@/utils/currency';
import {
  DEFAULT_EXPLORE_FILTERS,
  EXPLORE_CATEGORIES,
  EXPLORE_CONDITIONS,
  EXPLORE_SORTS,
  isPriceRangeValid,
  type ExploreFilters,
} from '@/utils/exploreFilters';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';

const ZONES: ReadonlyArray<{ id: LocationScopePreference; icon: string }> = [
  { id: 'nearby', icon: 'near_me' },
  { id: 'department', icon: 'map' },
  { id: 'country', icon: 'public' },
];

export const DEFAULT_ZONE: LocationScopePreference = 'nearby';

export interface ExploreFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** What the list shows now; the sheet starts from it every time it opens. */
  filters: ExploreFilters;
  zone: LocationScopePreference;
  /** Zone choices need a municipality; without one the section is hidden. */
  showZone: boolean;
  /** How many results the draft would give, or null while that zone is still loading. */
  countFor: (filters: ExploreFilters, zone: LocationScopePreference) => number | null;
  /** Lets the screen preload another zone so the count on "Apply" is real. */
  onDraftZoneChange: (zone: LocationScopePreference) => void;
  onApply: (filters: ExploreFilters, zone: LocationScopePreference) => void;
}

const toDigits = (value: number | null): string => (value === null ? '' : String(value));
const toPrice = (digits: string): number | null => (digits ? Number(digits) : null);

/**
 * Marketplace-style filters: zone, category, condition, price range in COP and order.
 * Everything is a draft until "Apply (N results)"; "Clear" only resets the draft.
 */
export const ExploreFiltersSheet = ({
  isOpen,
  onClose,
  filters,
  zone,
  showZone,
  countFor,
  onDraftZoneChange,
  onApply,
}: ExploreFiltersSheetProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ExploreFilters>(filters);
  const [draftZone, setDraftZone] = useState<LocationScopePreference>(zone);
  const [minDigits, setMinDigits] = useState(toDigits(filters.minPrice));
  const [maxDigits, setMaxDigits] = useState(toDigits(filters.maxPrice));

  // Every opening starts from what is applied, so closing without "Apply" discards the draft
  useEffect(() => {
    if (!isOpen) return;
    setDraft(filters);
    setDraftZone(zone);
    setMinDigits(toDigits(filters.minPrice));
    setMaxDigits(toDigits(filters.maxPrice));
  }, [isOpen, filters, zone]);

  const draftWithPrice: ExploreFilters = { ...draft, minPrice: toPrice(minDigits), maxPrice: toPrice(maxDigits) };
  const priceValid = isPriceRangeValid(draftWithPrice);
  const count = priceValid ? countFor(draftWithPrice, draftZone) : null;

  const chooseZone = (next: LocationScopePreference) => {
    setDraftZone(next);
    onDraftZoneChange(next);
  };

  const clearDraft = () => {
    setDraft(DEFAULT_EXPLORE_FILTERS);
    setMinDigits('');
    setMaxDigits('');
    if (showZone) chooseZone(DEFAULT_ZONE);
  };

  const priceInputClass =
    'w-full h-12 pl-8 pr-3 rounded-2xl bg-surface-container-lowest text-on-surface border border-outline/60 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('explore.filters.title')}>
      <div className="flex flex-col gap-6 pt-4" data-testid="explore-filters-sheet">
        {showZone && (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-label-lg text-label-lg font-bold text-on-surface mb-2">
              {t('explore.filters.zone')}
            </legend>
            <div role="radiogroup" aria-label={t('explore.filters.zone')} className="flex flex-wrap gap-2">
              {ZONES.map((option) => (
                <Chip
                  key={option.id}
                  role="radio"
                  aria-checked={draftZone === option.id}
                  active={draftZone === option.id}
                  icon={option.icon}
                  onClick={() => chooseZone(option.id)}
                >
                  {t(`location.scope.${option.id}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-lg text-label-lg font-bold text-on-surface mb-2">
            {t('explore.filters.category')}
          </legend>
          <div role="radiogroup" aria-label={t('explore.filters.category')} className="flex flex-wrap gap-2">
            <Chip
              role="radio"
              aria-checked={draft.category === null}
              active={draft.category === null}
              onClick={() => setDraft({ ...draft, category: null })}
            >
              {t('explore.filters.all')}
            </Chip>
            {EXPLORE_CATEGORIES.map((category) => (
              <Chip
                key={category}
                role="radio"
                aria-checked={draft.category === category}
                active={draft.category === category}
                onClick={() => setDraft({ ...draft, category })}
              >
                {t(`catalog.categories.${category}`, { defaultValue: category })}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-lg text-label-lg font-bold text-on-surface mb-2">
            {t('explore.filters.condition')}
          </legend>
          <div role="radiogroup" aria-label={t('explore.filters.condition')} className="flex flex-wrap gap-2">
            <Chip
              role="radio"
              aria-checked={draft.condition === null}
              active={draft.condition === null}
              onClick={() => setDraft({ ...draft, condition: null })}
            >
              {t('explore.filters.all')}
            </Chip>
            {EXPLORE_CONDITIONS.map((condition) => (
              <Chip
                key={condition}
                role="radio"
                aria-checked={draft.condition === condition}
                active={draft.condition === condition}
                onClick={() => setDraft({ ...draft, condition })}
              >
                {t(`catalog.conditions.${condition}`, { defaultValue: condition })}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-lg text-label-lg font-bold text-on-surface mb-2">
            {t('explore.filters.price')}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['min', minDigits, setMinDigits, t('explore.filters.minPrice')],
                ['max', maxDigits, setMaxDigits, t('explore.filters.maxPrice')],
              ] as const
            ).map(([id, value, setValue, label]) => (
              <label key={id} className="flex flex-col gap-1.5 min-w-0">
                <span className="font-label-md text-label-md text-on-surface">{label}</span>
                <span className="relative flex items-center">
                  <span aria-hidden="true" className="absolute left-3 font-body-md text-body-md text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    data-testid={`explore-price-${id}`}
                    value={formatCopDigits(value)}
                    onChange={(e) => setValue(sanitizeCopDigits(e.target.value))}
                    aria-invalid={id === 'max' && !priceValid ? true : undefined}
                    aria-describedby={!priceValid ? 'explore-price-error' : undefined}
                    className={priceInputClass}
                  />
                </span>
              </label>
            ))}
          </div>
          {!priceValid && (
            <span id="explore-price-error" role="alert" className="font-body-sm text-body-sm text-error">
              {t('explore.filters.priceInvalid')}
            </span>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-label-lg text-label-lg font-bold text-on-surface mb-2">
            {t('explore.filters.sort')}
          </legend>
          <div role="radiogroup" aria-label={t('explore.filters.sort')} className="flex flex-wrap gap-2">
            {EXPLORE_SORTS.map((sort) => (
              <Chip
                key={sort}
                role="radio"
                aria-checked={draft.sort === sort}
                active={draft.sort === sort}
                onClick={() => setDraft({ ...draft, sort })}
              >
                {t(`explore.sortOptions.${sort}`)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-surface-container-high flex items-center gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={clearDraft} data-testid="explore-filters-clear">
            {t('explore.filters.clear')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-[2]"
            disabled={!priceValid}
            data-testid="explore-filters-apply"
            onClick={() => onApply(draftWithPrice, draftZone)}
          >
            {count === null
              ? t('explore.filters.apply')
              : t('explore.filters.applyCount', { count })}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
