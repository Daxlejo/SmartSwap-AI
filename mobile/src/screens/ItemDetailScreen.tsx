import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Item } from '@/types';
import { useApp } from '@/context/AppContext';
import { useItem } from '@/hooks/useItem';
import { useTranslation } from '@/hooks/useTranslation';
import { ApiError } from '@/services/http/apiClient';
import { formatCop } from '@/utils/currency';
import { itemOwnerAsUser, swapDraftForItem } from '@/utils/swapSearch';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { ItemImage } from '@/components/ui/ItemImage';
import { profileItemGroup } from '@/utils/routeView';

/**
 * "Item detail": photo, description and owner of one published item. Another
 * user's item offers "Propose swap" (the only way into a proposal from Explore);
 * the user's own item only offers to delete the listing.
 */
export const ItemDetailScreen = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser, deleteItemReal } = useApp();
  const fromNavigation = (location.state as { item?: Item } | null)?.item;
  const { item, status, retry } = useItem(itemId, fromNavigation);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const goBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/explore', { replace: true });
  };

  if (!item) {
    return (
      <div className="flex flex-col flex-1 px-margin pt-6">
        {status === 'loading' ? (
          <div aria-busy="true" className="flex flex-col gap-4">
            <div className="h-56 rounded-2xl bg-surface-container-low animate-pulse" />
            <div className="h-6 w-3/4 rounded-lg bg-surface-container-low animate-pulse" />
            <div className="h-20 rounded-2xl bg-surface-container-low animate-pulse" />
          </div>
        ) : status === 'error' ? (
          <ErrorState onRetry={retry} />
        ) : (
          <EmptyState
            iconName="inventory_2"
            title={t('itemDetail.missingTitle')}
            description={t('itemDetail.missingDescription')}
            action={
              <Button variant="primary" size="md" onClick={() => navigate('/explore', { replace: true })}>
                {t('itemDetail.backToExplore')}
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const isMine = Boolean(currentUser && item.ownerId === currentUser.id);
  const owner = isMine ? undefined : itemOwnerAsUser(item);
  // Promised in a swap (or already traded): it can neither be deleted nor asked for
  const isLockedInSwap = profileItemGroup(item) === 'inSwap' || profileItemGroup(item) === 'history';

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteItemReal(item.id);
      goBack();
    } catch (error) {
      setDeleteError(error instanceof ApiError && error.message ? error.message : t('explore.deleteError'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full px-margin pt-4">
      <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-surface-container-low border border-surface-container-high/60 overflow-hidden">
          <ItemImage src={item.imageUrl} alt={item.name} category={item.category} className="w-full h-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" icon="category">
            {t(`catalog.categories.${item.category}`, { defaultValue: item.category })}
          </Badge>
          <Badge variant="surface">
            {t(`catalog.conditions.${item.condition}`, { defaultValue: item.condition })}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface break-words">{item.name}</h2>
          {item.estimatedValue !== undefined && (
            <p className="font-label-lg text-label-lg text-primary font-bold">
              {t('explore.estimatedValue', { value: formatCop(item.estimatedValue) })}
            </p>
          )}
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed break-words">
          {item.description || t('explore.defaultDescription')}
        </p>

        {item.wants.length > 0 && (
          <section className="flex flex-col gap-2" aria-labelledby="item-wants-title">
            <h3 id="item-wants-title" className="font-label-lg text-label-lg font-bold text-on-surface">
              {isMine ? t('itemDetail.yourWants') : t('itemDetail.ownerWants')}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {item.wants.map((want) => (
                <li
                  key={want}
                  className="px-3 py-1.5 rounded-full bg-surface-container-low border border-surface-container-high font-body-sm text-body-sm text-on-surface"
                >
                  {want}
                </li>
              ))}
            </ul>
          </section>
        )}

        {owner && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
            <Avatar src={owner.avatarUrl} alt={owner.name} name={owner.name} seed={owner.id} size="md" />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface break-words">{owner.name}</span>
              {owner.location && (
                <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 break-words">
                  <Icon name="location_on" size="xs" />
                  <span className="break-words">{owner.location}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {deleteError && (
          <p role="alert" className="p-3 rounded-xl bg-error-container/25 border border-error/40 text-error font-body-sm text-body-sm">
            {deleteError}
          </p>
        )}
      </div>

      {/* One action, sticky at the bottom so it is always in reach */}
      <div aria-hidden="true" className="h-6 shrink-0" />
      <div className="sticky bottom-0 mt-auto -mx-margin px-margin pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high z-40">
        {isLockedInSwap ? (
          <Button variant="outline" size="lg" fullWidth leftIcon="sync_alt" disabled>
            {t('itemDetail.inSwap')}
          </Button>
        ) : isMine ? (
          <Button
            variant="outline"
            size="lg"
            fullWidth
            leftIcon="delete"
            isLoading={isDeleting}
            onClick={handleDelete}
            className="text-error border-error/40 hover:bg-error-container/20"
          >
            {t('explore.deleteMine')}
          </Button>
        ) : (
          <Button
            data-testid="item-propose-button"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon="sync_alt"
            onClick={() => navigate(swapDraftForItem(item.id))}
          >
            {t('explore.proposeSwap')}
          </Button>
        )}
      </div>
    </div>
  );
};
