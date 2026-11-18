import type { Item } from '@/types';
import { isOfferableItem } from '@/utils/swapSearch';

/**
 * The form of a title used to spot repeated posts: lower case, without accents and with
 * single spaces. Same rule as the API (api/src/modules/items/item-title.ts).
 */
export const normalizeItemTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const IN_SWAP_STATUSES = new Set(['PENDING_SWAP', 'RESERVED']);

/**
 * Whether the user already has an item with this title: `inSwap` when it is reserved in a
 * swap in progress (the API will answer 409), `active` when it is published (only a warning),
 * `null` otherwise or while the title is empty.
 */
export const findDuplicateTitle = (
  myItems: Pick<Item, 'name' | 'status'>[],
  title: string,
): 'inSwap' | 'active' | null => {
  const wanted = normalizeItemTitle(title);
  if (!wanted) return null;
  const twins = myItems.filter((item) => normalizeItemTitle(item.name) === wanted);
  if (twins.some((item) => IN_SWAP_STATUSES.has((item.status ?? '').toUpperCase()))) return 'inSwap';
  if (twins.some(isOfferableItem)) return 'active';
  return null;
};
