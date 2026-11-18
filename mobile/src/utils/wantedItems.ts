/** Appends suggestions to the wanted list, skipping blanks and case-insensitive duplicates; keeps at most 10. */
export const mergeUniqueWants = (
  existingWants: string[],
  suggestedWants: string[],
): string[] => {
  const seen = new Set(existingWants.map((w) => w.trim().toLowerCase()));
  const merged = [...existingWants];

  for (const rawSuggestion of suggestedWants) {
    const trimmed = rawSuggestion.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(trimmed);
    }
  }

  return merged.slice(0, 10);
};
