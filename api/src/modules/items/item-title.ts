/**
 * The form of an item title used to spot repeated publications: lower case, without
 * accents and with single spaces, so "Cámara  Canon" and "camara canon" are the same.
 * It compares titles only; it cannot tell whether two posts are the same physical object.
 */
export const normalizeItemTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
