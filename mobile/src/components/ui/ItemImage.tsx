import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { categoryIcon } from '@/utils/categoryIcon';

export interface ItemImageProps {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
  /** Classes for the <img> itself when a picture is shown. */
  imgClassName?: string;
}

/**
 * Item picture with a neutral category-icon placeholder. It is shown when the item has no photo
 * or when the photo fails to load, so a broken URL never leaves an empty box or a fake picture.
 */
export const ItemImage = ({ src, alt, category, className, imgClassName }: ItemImageProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx(
          'flex items-center justify-center bg-surface-container-high text-on-surface-variant',
          className,
        )}
      >
        <Icon name={categoryIcon(category)} size="xl" />
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
