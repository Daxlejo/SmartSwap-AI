/**
 * What "back" does in the Publish wizard, for both Android's back button and the arrow of the
 * top bar: steps 2 to 4 return to the previous step; step 1 leaves Publish, asking first when
 * something was already entered; the success screen (step 5) just leaves.
 */
export type PublishBackAction = 'previousStep' | 'confirmDiscard' | 'leave';

export const publishBackAction = (step: number, hasDraft: boolean): PublishBackAction => {
  if (step >= 2 && step <= 4) return 'previousStep';
  if (step === 1 && hasDraft) return 'confirmDiscard';
  return 'leave';
};

/**
 * Whether a navigation out of Publish is held so the wizard can handle it as "back". Staying on
 * /publish is never held, and neither is the session ending (redirect to /login).
 */
export const shouldHoldPublishExit = ({
  fromPath,
  toPath,
  action,
  isPublishing,
}: {
  fromPath: string;
  toPath: string;
  action: PublishBackAction;
  isPublishing: boolean;
}): boolean => {
  if (fromPath === toPath || toPath === '/login') return false;
  return isPublishing || action !== 'leave';
};
