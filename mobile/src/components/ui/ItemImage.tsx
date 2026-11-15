import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { itemIcon } from '@/utils/categoryIcon';

export interface ItemImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  /** Item name for the placeholder icon when `alt` is empty (decorative images); defaults to `alt`. */
  itemName?: string;
  className?: string;
  /** Classes for the <img> itself when a picture is shown. */
  imgClassName?: string;
}

/**
 * Item picture with a neutral category-icon placeholder. It is shown when the item has no photo
 * or when the photo fails to load, so a broken URL never leaves an empty box or a fake picture.
 */
export const ItemImage = ({
  src,
  alt,
  category,
  itemName,
  className,
  imgClassName,
}: ItemImageProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={clsx(
          'flex items-center justify-center bg-surface-container-high text-on-surface-variant',
          className,
        )}
      >
        <Icon name={itemIcon(itemName ?? alt, category)} size="xl" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={clsx('object-cover', className, imgClassName)}
    />
  );
};
