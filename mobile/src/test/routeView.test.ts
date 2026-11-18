import { describe, expect, it } from 'vitest';
import type { Item, SwapRoute, User } from '@/types';
import type { NormalizedRouteStep } from '@/services/routes/routes.service';
import {
  canProposeRoute,
  isSignedInUser,
  profileItemGroup,
  routeNextAction,
  routePhase,
  toReceivedProposals,
} from '@/utils/routeView';

const user = (id: string, name: string): User => ({
  id,
  name,
  email: `${id}@example.com`,
  rating: 5,
  location: 'Pasto, Nariño',
  verified: false,
  co2SavedKg: 0,
});

const item = (id: string, name: string, ownerId: string): Item => ({
  id,
  name,
  category: 'Hogar',
  condition: 'GOOD',
  ownerId,
  wants: [],
});

const ana = user('ana', 'Ana');
const beto = user('beto', 'Beto');
const caro = user('caro', 'Caro');
const lamp = item('lamp', 'Lámpara', ana.id);
const bike = item('bike', 'Bicicleta', beto.id);
const book = item('book', 'Libro', caro.id);

const step = (
  order: number,
  giver: User,
  gives: Item,
  receives: Item,
  acceptance: NormalizedRouteStep['acceptance'] = 'PENDING',
): NormalizedRouteStep => ({
  id: `s${order}`,
  stepOrder: order,
  userId: giver.id,
  user: giver,
  givesItemId: gives.id,
  givesItem: gives,
  receivesItemId: receives.id,
  receivesItem: receives,
  acceptance,
  deliveryConfirmed: false,
});

/** Ana makes the first step, Caro proposed the route, Beto is the viewer. */
const route = (overrides: Partial<SwapRoute> = {}): SwapRoute => ({
  id: 'r1',
  title: 'Ciclo',
  stepsCount: 3,
  targetItemId: book.id,
  offeredItemId: lamp.id,
  participants: [ana, beto, caro],
  chainItems: [lamp, bike, book],
  co2SavedKg: 0,
  isLoop: true,
  initiatorId: caro.id,
  status: 'ACTIVE',
  steps: [step(1, ana, lamp, book), step(2, beto, bike, lamp), step(3, caro, book, bike, 'ACCEPTED')],
  ...overrides,
});

describe('toReceivedProposals', () => {
  it('names the person who proposed the route, not the one who makes the first step', () => {
    const [proposal] = toReceivedProposals([route()], beto.id);
    expect(proposal.senderName).toBe('Caro');
  });

  it('shows what the viewer gives and receives in their own step', () => {
    const [proposal] = toReceivedProposals([route()], beto.id);
    expect(proposal.offeredItemName).toBe('Bicicleta');
    expect(proposal.targetItemName).toBe('Lámpara');
  });

  it('falls back to the ends of the chain when the viewer has no step', () => {
    const [proposal] = toReceivedProposals([route({ steps: [] })], beto.id);
    expect(proposal.offeredItemName).toBe('Lámpara');
    expect(proposal.targetItemName).toBe('Libro');
  });

  it('falls back to the first participant when the initiator is not among them', () => {
    const [proposal] = toReceivedProposals([route({ initiatorId: 'ghost' })], beto.id);
    expect(proposal.senderName).toBe('Ana');
  });

  it('leaves out the routes the viewer proposed', () => {
    expect(toReceivedProposals([route()], caro.id)).toEqual([]);
  });

  it('derives the status from the route and the viewer step', () => {
    const accepted = route({ steps: [step(2, beto, bike, lamp, 'ACCEPTED')] });
    const declined = route({ steps: [step(2, beto, bike, lamp, 'DECLINED')] });
    expect(toReceivedProposals([route()], beto.id)[0].status).toBe('pending');
    expect(toReceivedProposals([accepted], beto.id)[0].status).toBe('accepted');
    expect(toReceivedProposals([route({ status: 'CONFIRMED' })], beto.id)[0].status).toBe('accepted');
    expect(toReceivedProposals([declined], beto.id)[0].status).toBe('declined');
    expect(toReceivedProposals([route({ status: 'CANCELLED' })], beto.id)[0].status).toBe('declined');
  });
});

describe('canProposeRoute', () => {
  it('allows proposing a search preview, which the API sends as PROPOSED', () => {
    expect(canProposeRoute({ id: 'preview-00ab12cd' })).toBe(true);
  });

  it('does not allow proposing a saved route again', () => {
    expect(canProposeRoute({ id: '3f1c2b9e-0d4a-4c1e-9b7a-5e2f8d6c1a00' })).toBe(false);
  });
});

describe('isSignedInUser', () => {
  it('matches the signed-in user', () => {
    expect(isSignedInUser('beto', 'beto')).toBe(true);
    expect(isSignedInUser('ana', 'beto')).toBe(false);
  });

  it('is false when the session or the participant id is missing', () => {
    expect(isSignedInUser(undefined, undefined)).toBe(false);
    expect(isSignedInUser('ana', undefined)).toBe(false);
  });
});

describe('routePhase', () => {
  it('reads PROPOSED, the status the API sends for a waiting proposal, as pending, not cancelled', () => {
    expect(routePhase('PROPOSED')).toBe('pending');
    expect(routePhase('ACTIVE')).toBe('pending');
    expect(routePhase('suggested')).toBe('pending');
    expect(routePhase(undefined)).toBe('pending');
  });

  it('keeps the closed states apart', () => {
    expect(routePhase('CONFIRMED')).toBe('confirmed');
    expect(routePhase('COMPLETED')).toBe('completed');
    expect(routePhase('EXPIRED')).toBe('expired');
    expect(routePhase('CANCELLED')).toBe('cancelled');
  });
});

describe('routeNextAction', () => {
  it('asks a participant who has not answered to respond', () => {
    expect(routeNextAction(route(), beto.id)).toBe('respond');
  });

  it('never offers "Respond" again once the user answered: they wait for the others', () => {
    expect(routeNextAction(route(), caro.id)).toBe('waiting');
  });

  it('opens the delivery chat when everyone accepted', () => {
    expect(routeNextAction(route({ status: 'CONFIRMED' }), beto.id)).toBe('chat');
  });

  it('offers nothing on a finished route or to someone outside it', () => {
    expect(routeNextAction(route({ status: 'COMPLETED' }), beto.id)).toBe('none');
    expect(routeNextAction(route({ status: 'CANCELLED' }), beto.id)).toBe('none');
    expect(routeNextAction(route({ status: 'EXPIRED' }), beto.id)).toBe('none');
    expect(routeNextAction(route(), 'stranger')).toBe('none');
    expect(routeNextAction(route(), undefined)).toBe('none');
  });
});

describe('profileItemGroup', () => {
  it('lists published items as active and promised ones under "In swap", never both', () => {
    expect(profileItemGroup({ status: 'ACTIVE' })).toBe('active');
    expect(profileItemGroup({ status: undefined })).toBe('active');
    expect(profileItemGroup({ status: 'PENDING_SWAP' })).toBe('inSwap');
    expect(profileItemGroup({ status: 'RESERVED' })).toBe('inSwap');
  });

  it('moves traded items to history and hides paused ones', () => {
    expect(profileItemGroup({ status: 'SWAPPED' })).toBe('history');
    expect(profileItemGroup({ status: 'PAUSED' })).toBe('hidden');
  });
});
