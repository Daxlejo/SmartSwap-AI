import type { Item, SwapRoute } from '@/types';

/** A proposal someone else started, seen from the signed-in user's side. */
export interface ReceivedProposal {
  id: string;
  senderName: string;
  senderAvatar?: string;
  offeredItemName: string;
  offeredItemImg?: string;
  offeredItemCategory?: string;
  targetItemName: string;
  targetItemImg?: string;
  targetItemCategory?: string;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Routes proposed by other people, with who proposed them and what this user gives
 * and receives. The proposer is `initiatorId`, not whoever makes the first step, and
 * the items come from the user's own step, not from the ends of the chain.
 */
export const toReceivedProposals = (routes: SwapRoute[], userId: string | undefined): ReceivedProposal[] =>
  routes
    .filter((route) => route.initiatorId !== userId)
    .map((route) => {
      const initiator = route.participants.find((p) => p.id === route.initiatorId) ?? route.participants[0];
      const ownStep = userId ? route.steps?.find((step) => step.userId === userId) : undefined;
      const offered = ownStep?.givesItem ?? route.chainItems[0];
      const target = ownStep?.receivesItem ?? route.chainItems[route.chainItems.length - 1];
      const phase = routePhase(route.status);

      let status: ReceivedProposal['status'] = 'pending';
      if (phase === 'confirmed' || phase === 'completed' || ownStep?.acceptance === 'ACCEPTED') {
        status = 'accepted';
      } else if (phase === 'cancelled' || phase === 'expired' || ownStep?.acceptance === 'DECLINED') {
        status = 'declined';
      }

      return {
        id: route.id,
        senderName: initiator?.name || '—',
        senderAvatar: initiator?.avatarUrl,
        offeredItemName: offered?.name ?? '',
        offeredItemImg: offered?.imageUrl,
        offeredItemCategory: offered?.category,
        targetItemName: target?.name ?? '',
        targetItemImg: target?.imageUrl,
        targetItemCategory: target?.category,
        status,
      };
    });

/**
 * Only a route fresh from a search can be proposed. The API marks both search
 * previews and saved proposals as PROPOSED, so the status cannot tell them apart;
 * an unsaved preview is the one whose id starts with `preview-` (RouteMapper.fromDiscoveredCycle).
 */
export const canProposeRoute = (route: Pick<SwapRoute, 'id'>): boolean => route.id.startsWith('preview-');

/** True only when there is a signed-in user and they are the giver; never for two missing ids. */
export const isSignedInUser = (personId: string | undefined, userId: string | undefined): boolean =>
  Boolean(personId) && Boolean(userId) && personId === userId;

/** Where a saved route stands, whatever spelling of the status the API or an older client used. */
export type RoutePhase = 'pending' | 'confirmed' | 'completed' | 'expired' | 'cancelled';

/**
 * The API answers PROPOSED for a proposal still waiting for answers (RouteMapper.mapRouteStatus);
 * the database names it ACTIVE or SUGGESTED. All three are pending, and so is a missing status.
 * Only CANCELLED is a cancellation.
 */
export const routePhase = (status: string | undefined | null): RoutePhase => {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'COMPLETED':
      return 'completed';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
};

/**
 * The one thing a saved route asks of the signed-in user, which decides the main button
 * of "Your route":
 * - `respond`: they have not answered yet (answered in Trades);
 * - `waiting`: they accepted and others have not, so there is nothing to do;
 * - `chat`: everyone accepted, the handoff is arranged in the delivery chat;
 * - `none`: the route is over (completed, cancelled or expired) or they are not in it.
 * A preview fresh from a search is proposed instead (see {@link canProposeRoute}).
 */
export type RouteNextAction = 'respond' | 'waiting' | 'chat' | 'none';

export const routeNextAction = (
  route: Pick<SwapRoute, 'status' | 'steps'>,
  userId: string | undefined,
): RouteNextAction => {
  const ownStep = userId ? route.steps?.find((step) => step.userId === userId) : undefined;
  if (!ownStep) return 'none';
  const phase = routePhase(route.status);
  if (phase === 'confirmed') return 'chat';
  if (phase !== 'pending') return 'none';
  return ownStep.acceptance === 'PENDING' ? 'respond' : 'waiting';
};

/** Item statuses of a swap that is under way: proposed (locked) or accepted by all (reserved). */
const IN_SWAP_ITEM_STATUSES = ['PENDING_SWAP', 'LOCKED_IN_PROPOSAL', 'RESERVED'];

/** Which Profile tab an owned item belongs to. Paused and archived items are not listed. */
export type ProfileItemGroup = 'active' | 'inSwap' | 'history' | 'hidden';

export const profileItemGroup = (item: Pick<Item, 'status'>): ProfileItemGroup => {
  const status = (item.status ?? 'ACTIVE').trim().toUpperCase();
  if (status === 'ACTIVE' || status === 'AVAILABLE') return 'active';
  if (IN_SWAP_ITEM_STATUSES.includes(status)) return 'inSwap';
  if (status === 'SWAPPED' || status === 'TRADED') return 'history';
  return 'hidden';
};

/**
 * What the signed-in user hands over and gets back in a route: their own step when they
 * take part, otherwise the two ends of the chain.
 */
export const ownSide = (
  route: Pick<SwapRoute, 'steps' | 'chainItems'>,
  userId: string | undefined,
): { offered?: Item; received?: Item } => {
  const ownStep = userId ? route.steps?.find((step) => step.userId === userId) : undefined;
  return {
    offered: ownStep?.givesItem ?? route.chainItems[0],
    received: ownStep?.receivesItem ?? route.chainItems[route.chainItems.length - 1],
  };
};
