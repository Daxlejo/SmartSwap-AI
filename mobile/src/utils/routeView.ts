import type { SwapRoute } from '@/types';

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
      const upperStatus = (route.status || 'ACTIVE').toUpperCase();

      let status: ReceivedProposal['status'] = 'pending';
      if (upperStatus === 'CONFIRMED' || upperStatus === 'COMPLETED' || ownStep?.acceptance === 'ACCEPTED') {
        status = 'accepted';
      } else if (upperStatus === 'CANCELLED' || ownStep?.acceptance === 'DECLINED') {
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
