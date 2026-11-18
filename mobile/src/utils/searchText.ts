/**
 * Form of a text used to compare searches: lower case, without accents and with single
 * spaces, so "camara" finds "Cámara". The API normalizes its own searches the same way.
 */
export const normalizeSearchText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Whether the normalized query appears in any of the texts (an empty query matches everything). */
export const matchesSearch = (query: string, texts: readonly (string | undefined)[]): boolean => {
  const needle = normalizeSearchText(query);
  if (needle === '') return true;
  return texts.some((text) => text !== undefined && normalizeSearchText(text).includes(needle));
};
