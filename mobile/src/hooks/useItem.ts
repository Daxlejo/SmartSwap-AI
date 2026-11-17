import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { itemsService } from '@/services/items/items.service';
import { ApiError } from '@/services/http/apiClient';

export type ItemLookup =
  | { status: 'ready'; item: Item }
  | { status: 'loading' | 'missing' | 'error'; item: undefined };

/** What the API answered for one id; kept with the id so a new id never reads an old answer. */
type Fetched =
  | { id: string; status: 'ready'; item: Item }
  | { id: string; status: 'missing' | 'error' };

/**
 * One item by id: from the lists already loaded (the user's own and the marketplace),
 * then from the navigation state, and only otherwise from the API. `missing` means
 * there is no id or the API answered 404 (deleted or never existed); `error` that the
 * API could not be asked, so the caller should offer a retry.
 */
export const useItem = (
  itemId: string | undefined,
  fromNavigation?: Item,
): ItemLookup & { retry: () => void } => {
  const { items, myItems } = useApp();
  const known = useMemo(() => {
    if (!itemId) return undefined;
    return (
      myItems.find((item) => item.id === itemId) ??
      items.find((item) => item.id === itemId) ??
      (fromNavigation?.id === itemId ? fromNavigation : undefined)
    );
  }, [itemId, items, myItems, fromNavigation]);

  const [fetched, setFetched] = useState<Fetched | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!itemId || known) return;
    let active = true;
    setFetched((current) => (current?.id === itemId && current.status !== 'error' ? current : null));
    itemsService
      .getItemById(itemId)
      .then((item) => {
        if (active) setFetched({ id: itemId, status: 'ready', item });
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error(`Could not load item ${itemId}`, error);
        setFetched({
          id: itemId,
          status: error instanceof ApiError && error.statusCode === 404 ? 'missing' : 'error',
        });
      });
    return () => {
      active = false;
    };
  }, [itemId, known, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!itemId) return { status: 'missing', item: undefined, retry };
  if (known) return { status: 'ready', item: known, retry };
  if (fetched?.id !== itemId) return { status: 'loading', item: undefined, retry };
  return fetched.status === 'ready'
    ? { status: 'ready', item: fetched.item, retry }
    : { status: fetched.status, item: undefined, retry };
};
