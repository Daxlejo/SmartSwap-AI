/** What the notice at the top of a form says after a failed attempt. */
export interface FormAlertContent {
  message: string;
  details: string[];
}

/**
 * The notice says the problem in words: with one error, that error itself ("You must
 * add at least 1 item you would accept in exchange."); with several, a short heading
 * and each error on its own line. Never a list of field names to go and check.
 */
export const formAlertFor = (
  errorMessages: readonly string[],
  severalHeading: (count: number) => string,
): FormAlertContent => {
  const messages = errorMessages.map((message) => message.trim()).filter(Boolean);
  if (messages.length <= 1) return { message: messages[0] ?? '', details: [] };
  return { message: severalHeading(messages.length), details: messages };
};
