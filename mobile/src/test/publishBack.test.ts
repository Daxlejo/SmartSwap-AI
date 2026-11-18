import { describe, expect, it } from 'vitest';
import { publishBackAction, shouldHoldPublishExit, type PublishBackAction } from '@/utils/publishBack';
import { swapDraftPath } from '@/utils/swapSearch';

/** Pressing back repeatedly from step 4, as the screen does: each press moves one step. */
const pressBackFrom = (start: number, hasDraft: boolean): PublishBackAction[] => {
  const actions: PublishBackAction[] = [];
  let step = start;
  for (;;) {
    const action = publishBackAction(step, hasDraft);
    actions.push(action);
    if (action !== 'previousStep') return actions;
    step -= 1;
  }
};

describe('back in Publish', () => {
  it('goes 4 → 3 → 2 → 1 and only then asks to discard the draft', () => {
    expect(pressBackFrom(4, true)).toEqual([
      'previousStep',
      'previousStep',
      'previousStep',
      'confirmDiscard',
    ]);
  });

  it('step 3 returns to step 2, not out of the flow', () => {
    expect(publishBackAction(3, true)).toBe('previousStep');
  });

  it('step 1 with nothing entered leaves without asking; the success screen leaves', () => {
    expect(publishBackAction(1, false)).toBe('leave');
    expect(publishBackAction(5, true)).toBe('leave');
  });

  it('holds exits from /publish (Android back and the top bar arrow) unless it should leave', () => {
    const exit = { fromPath: '/publish', toPath: '/home', isPublishing: false };
    expect(shouldHoldPublishExit({ ...exit, action: 'previousStep' })).toBe(true);
    expect(shouldHoldPublishExit({ ...exit, action: 'confirmDiscard' })).toBe(true);
    expect(shouldHoldPublishExit({ ...exit, action: 'leave' })).toBe(false);
  });

  it('holds every exit while publishing, never a session redirect to /login', () => {
    expect(
      shouldHoldPublishExit({ fromPath: '/publish', toPath: '/home', action: 'leave', isPublishing: true }),
    ).toBe(true);
    expect(
      shouldHoldPublishExit({ fromPath: '/publish', toPath: '/login', action: 'previousStep', isPublishing: false }),
    ).toBe(false);
  });
});

describe('back in New swap', () => {
  it('each step is its own URL, so history back goes 3 → 2 → 1', () => {
    const draft = { offeredItemId: 'mine', wantedItemId: 'theirs', wantFixed: false };
    const paths = [1, 2, 3].map((step) => swapDraftPath({ ...draft, step: step as 1 | 2 | 3 }));
    expect(new Set(paths).size).toBe(3);
    expect(paths[2]).toContain('step=3');
    expect(paths[1]).toContain('step=2');
  });
});
