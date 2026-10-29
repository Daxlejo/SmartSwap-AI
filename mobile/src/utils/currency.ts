const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const groupedFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Formats an amount in Colombian pesos: 2600000 -> "$ 2.600.000". Empty for missing values. */
export const formatCop = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return copFormatter.format(Math.round(value));
};

/** Keeps only the digits of what a user typed ("$ 2.600.000" -> "2600000"). */
export const sanitizeCopDigits = (raw: string): string => raw.replace(/\D/g, '').slice(0, 11);

/** Formats a digits-only string with thousand separators for an input: "2600000" -> "2.600.000". */
export const formatCopDigits = (digits: string): string =>
  digits ? groupedFormatter.format(Number(digits)) : '';
