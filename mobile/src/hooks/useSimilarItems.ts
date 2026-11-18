import { useEffect, useState } from 'react';
import { itemsService } from '@/services/items/items.service';
import { normalizeSearchText } from '@/utils/searchText';
import type { Item } from '@/types';

const DEBOUNCE_MS = 400;

/**
 * "Artículos parecidos": when a text search finds nothing, asks the API for items whose
 * embedding is close to the query. Any failure (AI or network) yields no suggestions, so the
 * screen keeps its normal empty state.
 */
export const useSimilarItems = (query: string, enabled: boolean): { items: Item[]; isLoading: boolean } => {
  const term = normalizeSearchText(query);
  const active = enabled && term.length >= 2;
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setItems([]);
    if (!active) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      itemsService
        .findSimilar(term)
        .then((found) => {
          if (!cancelled) setItems(found);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, term]);

  return { items, isLoading };
};
