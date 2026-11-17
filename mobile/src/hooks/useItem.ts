import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { itemsService } from '@/services/items/items.service';
import { ApiError } from '@/services/http/apiClient';

export type ItemLookupStatus = 'ready' | 'loading' | 'missing' | 'error';

/**
 * One item by id: from the lists already loaded (the user's own and the marketplace),
 * then from the navigation state, and only otherwise from the API. `missing` means the
 * API answered 404 (deleted or never existed); `error` that it could not be asked.
 */
export const useItem = (
  itemId: string | undefined,
  fromNavigation?: Item,
): { item: Item | undefined; status: ItemLookupStatus; retry: () => void } => {
  const { items, myItems } = useApp();
  const known = useMemo(() => {
    if (!itemId) return undefined;
    return (
      myItems.find((item) => item.id === itemId) ??
      items.find((item) => item.id === itemId) ??
      (fromNavigation?.id === itemId ? fromNavigation : undefined)
    );
  }, [itemId, items, myItems, fromNavigation]);

  const [fetched, setFetched] = useState<Item | undefined>(undefined);
  const [status, setStatus] = useState<ItemLookupStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!itemId || known) return;
    let active = true;
    setStatus('loading');
    itemsService
      .getItemById(itemId)
      .then((item) => {
        if (!active) return;
        setFetched(item);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error(`Could not load item ${itemId}`, error);
        setStatus(error instanceof ApiError && error.statusCode === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [itemId, known, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!itemId) return { item: undefined, status: 'missing', retry };
  if (known) return { item: known, status: 'ready', retry };
  return { item: fetched?.id === itemId ? fetched : undefined, status, retry };
};
