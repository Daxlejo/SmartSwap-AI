import { autoCompleteAt, handoffDays } from './handoff.config';

describe('handoff period', () => {
  it('lasts 5 days unless SWAP_HANDOFF_DAYS says otherwise', () => {
    expect(handoffDays({})).toBe(5);
    expect(handoffDays({ SWAP_HANDOFF_DAYS: '' })).toBe(5);
    expect(handoffDays({ SWAP_HANDOFF_DAYS: '2' })).toBe(2);
  });

  it('accepts 0 for a demo, and ignores values that make no sense', () => {
    expect(handoffDays({ SWAP_HANDOFF_DAYS: '0' })).toBe(0);
    expect(handoffDays({ SWAP_HANDOFF_DAYS: '-1' })).toBe(5);
    expect(handoffDays({ SWAP_HANDOFF_DAYS: 'cinco' })).toBe(5);
  });

  it('completes the swap the given days after the agreed date', () => {
    const agreed = new Date('2026-11-20T15:00:00.000Z');
    expect(autoCompleteAt(agreed, 5).toISOString()).toBe('2026-11-25T15:00:00.000Z');
    expect(autoCompleteAt(agreed, 0).toISOString()).toBe(agreed.toISOString());
  });
});
