import { Injectable } from '@nestjs/common';
import {
  DEFAULT_VALUE_TOLERANCE_PCT,
  EdgeEvaluationResult,
  GraphItemNode,
  GraphOwnerInfo,
  GraphWantNode,
  RouteScoringStrategy,
} from './route-scoring.strategy';

export {
  GraphItemNode,
  GraphOwnerInfo,
  GraphWantNode,
  EdgeEvaluationResult,
};

export const MIN_CYCLE_STEPS = 2;
export const MAX_CYCLE_STEPS = 4;
export const MAX_RETURNED_CYCLES = 10;

export interface SwapGraphSearchParams {
  initiatorUserId: string;
  objectiveText: string;
  objectiveEmbedding?: number[];
  offeredItemId?: string;
  desiredCategory?: string;
  /**
   * The exact item the initiator wants to receive. When set, every cycle closes with
   * this item (the user chose it, so no want match is needed) and nothing else.
   */
  targetItemId?: string;
  /** Shortest cycle to return; 3 keeps only rings that need a third person. */
  minSteps?: number;
  maxSteps?: number;
  valueTolerancePct?: number;
  catalog: GraphItemNode[];
}

export interface DirectedGraphEdge {
  fromItemId: string;
  toItemId: string;
  fromUserId: string;
  toUserId: string;
  evaluation: EdgeEvaluationResult;
}

export interface SwapCycleStep {
  stepOrder: number;
  userId: string;
  userName: string;
  userRating: number;
  userAvatarUrl: string | null;
  userLocation: string | null;
  recipientUserId: string;
  recipientUserName: string;
  givesItemId: string;
  givesItemName: string;
  givesItemCategory: string;
  givesItemValue: number;
  givesItemImage: string | null;
  receivesItemId: string;
  receivesItemName: string;
  receivesItemCategory: string;
  receivesItemValue: number;
  receivesItemImage: string | null;
  edgeMatchScore: number;
  valueParityScore: number;
  matchedWantText?: string;
}

export interface SwapCycleCandidate {
  canonicalKey: string;
  hops: number;
  matchScore: number;
  co2SavedKg: number;
  offeredItemId: string;
  targetItemId: string;
  objectiveText: string;
  avgEdgeMatchScore: number;
  avgValueParityScore: number;
  avgParticipantRating: number;
  steps: SwapCycleStep[];
  participants: GraphOwnerInfo[];
  chainItems: GraphItemNode[];
}

const INACTIVE_STATUSES = new Set<string>([
  'SWAPPED',
  'ARCHIVED',
  'PENDING_SWAP',
  'RESERVED',
]);

@Injectable()
export class SwapGraphEngine {
  constructor(private readonly scoringStrategy: RouteScoringStrategy) {}

  /**
   * Finds simple directed barter cycles of length k in {2, 3, 4} starting and ending
   * at `initiatorUserId`.
   *
   * Rules enforced:
   * - Pure in-memory execution (no database calls).
   * - Every participant `userId` in a cycle is strictly distinct.
   * - Step 0 is the initiator giving their `offeredItem` to User 2.
   * - The last step delivers an item to the initiator that matches the initiator's
   *   `objectiveText` / `objectiveEmbedding` (or `offeredItem` wants).
   * - Deduplicates cycles via canonical rotation starting at `initiatorUserId`
   *   and returns the top 10 cycles sorted by `matchScore DESC`.
   */
  findCycles(params: SwapGraphSearchParams): SwapCycleCandidate[] {
    const initiatorUserId = (params.initiatorUserId ?? '').trim();
    const objectiveText = (params.objectiveText ?? '').trim();

    if (!initiatorUserId || !Array.isArray(params.catalog)) {
      return [];
    }

    const maxSteps = this.clampInt(
      params.maxSteps ?? MAX_CYCLE_STEPS,
      MIN_CYCLE_STEPS,
      MAX_CYCLE_STEPS,
    );
    const minSteps = this.clampInt(
      params.minSteps ?? MIN_CYCLE_STEPS,
      MIN_CYCLE_STEPS,
      maxSteps,
    );
    const valueTolerancePct = this.clampNumber(
      params.valueTolerancePct ?? DEFAULT_VALUE_TOLERANCE_PCT,
      10,
      70,
    );

    const activeCatalog = params.catalog.filter((item) =>
      this.isItemActive(item),
    );
    if (activeCatalog.length < MIN_CYCLE_STEPS) {
      return [];
    }

    const itemById = new Map<string, GraphItemNode>();
    for (const item of activeCatalog) {
      itemById.set(item.id, item);
    }

    const offeredItems = activeCatalog.filter((item) => {
      if (item.ownerId !== initiatorUserId) {
        return false;
      }
      if (params.offeredItemId && params.offeredItemId.trim().length > 0) {
        return item.id === params.offeredItemId.trim();
      }
      return true;
    });

    if (offeredItems.length === 0) {
      return [];
    }

    const nonInitiatorItems = activeCatalog.filter(
      (item) => item.ownerId !== initiatorUserId,
    );
    if (nonInitiatorItems.length === 0) {
      return [];
    }

    // Build adjacency list for edges into non-initiator items: itemA -> itemB
    const adjacency = this.buildAdjacencyList(
      activeCatalog,
      valueTolerancePct,
      initiatorUserId,
    );

    const targetItemId = params.targetItemId?.trim();
    const targetItem = targetItemId ? itemById.get(targetItemId) : undefined;
    if (targetItemId && (!targetItem || targetItem.ownerId === initiatorUserId)) {
      // The chosen item is gone, reserved or the initiator's own: no ring can deliver it
      return [];
    }

    const deduplicatedCycles = new Map<string, SwapCycleCandidate>();

    for (const offeredItem of offeredItems) {
      const explicitObjectiveWants: GraphWantNode[] =
        objectiveText.length >= 2 ||
        (params.objectiveEmbedding && params.objectiveEmbedding.length > 0) ||
        Boolean(params.desiredCategory)
          ? [
              {
                queryText: objectiveText,
                category: params.desiredCategory ?? null,
                embedding: params.objectiveEmbedding,
              },
            ]
          : [];

      const closingEdgeByItemId = targetItem
        ? this.evaluateTargetClosingEdge(targetItem, offeredItem, valueTolerancePct)
        : this.evaluateObjectiveClosingEdges(
            nonInitiatorItems,
            offeredItem,
            explicitObjectiveWants,
            valueTolerancePct,
            params.desiredCategory,
          );

      if (closingEdgeByItemId.size === 0) {
        continue;
      }

      const pathItems: GraphItemNode[] = [offeredItem];
      const pathEdges: EdgeEvaluationResult[] = [];
      const visitedUsers = new Set<string>([initiatorUserId]);

      this.dfsExploreCycles(
        offeredItem,
        objectiveText,
        minSteps,
        maxSteps,
        adjacency,
        itemById,
        closingEdgeByItemId,
        pathItems,
        pathEdges,
        visitedUsers,
        deduplicatedCycles,
      );
    }

    const rankedCycles = Array.from(deduplicatedCycles.values());
    rankedCycles.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      if (a.hops !== b.hops) {
        return a.hops - b.hops;
      }
      if (b.avgEdgeMatchScore !== a.avgEdgeMatchScore) {
        return b.avgEdgeMatchScore - a.avgEdgeMatchScore;
      }
      if (b.avgValueParityScore !== a.avgValueParityScore) {
        return b.avgValueParityScore - a.avgValueParityScore;
      }
      return a.canonicalKey.localeCompare(b.canonicalKey);
    });

    return rankedCycles.slice(0, MAX_RETURNED_CYCLES);
  }

  /**
   * Alias for `findCycles` for service-layer ergonomics.
   */
  searchRoutes(params: SwapGraphSearchParams): SwapCycleCandidate[] {
    return this.findCycles(params);
  }

  /**
   * Builds the directed adjacency list (`fromItemId -> DirectedGraphEdge[]`) across active items.
   * An edge `ItemA -> ItemB` exists when `ItemB`'s owner wants `ItemA` and values are within tolerance.
   */
  buildAdjacencyList(
    catalog: GraphItemNode[],
    valueTolerancePct: number = DEFAULT_VALUE_TOLERANCE_PCT,
    excludeTargetOwnerId?: string,
  ): Map<string, DirectedGraphEdge[]> {
    const adjacency = new Map<string, DirectedGraphEdge[]>();

    for (const item of catalog) {
      adjacency.set(item.id, []);
    }

    for (const itemA of catalog) {
      const outgoing = adjacency.get(itemA.id);
      if (!outgoing) {
        continue;
      }

      for (const itemB of catalog) {
        if (itemA.id === itemB.id || itemA.ownerId === itemB.ownerId) {
          continue;
        }
        if (excludeTargetOwnerId && itemB.ownerId === excludeTargetOwnerId) {
          continue;
        }

        const evaluation = this.scoringStrategy.evaluateDirectedEdge(
          itemA,
          itemB,
          { valueTolerancePct },
        );

        if (evaluation.matches) {
          outgoing.push({
            fromItemId: itemA.id,
            toItemId: itemB.id,
            fromUserId: itemA.ownerId,
            toUserId: itemB.ownerId,
            evaluation,
          });
        }
      }
    }

    return adjacency;
  }

  private dfsExploreCycles(
    offeredItem: GraphItemNode,
    objectiveText: string,
    minSteps: number,
    maxSteps: number,
    adjacency: Map<string, DirectedGraphEdge[]>,
    itemById: Map<string, GraphItemNode>,
    closingEdgeByItemId: Map<string, EdgeEvaluationResult>,
    pathItems: GraphItemNode[],
    pathEdges: EdgeEvaluationResult[],
    visitedUsers: Set<string>,
    deduplicatedCycles: Map<string, SwapCycleCandidate>,
  ): void {
    const currentDepth = pathItems.length;
    const currentItem = pathItems[currentDepth - 1];

    // Check if we can close the cycle back to `offeredItem` (cycle length k in {2..maxSteps})
    if (currentDepth >= minSteps && currentDepth <= maxSteps) {
      const closingEvaluation = closingEdgeByItemId.get(currentItem.id);
      if (closingEvaluation) {
        const cycleEdges = [...pathEdges, closingEvaluation];
        const candidate = this.materializeCycleCandidate(
          pathItems,
          cycleEdges,
          objectiveText,
        );

        const existing = deduplicatedCycles.get(candidate.canonicalKey);
        if (!existing || candidate.matchScore > existing.matchScore) {
          deduplicatedCycles.set(candidate.canonicalKey, candidate);
        }
      }
    }

    if (currentDepth >= maxSteps) {
      return;
    }

    const neighbors = adjacency.get(currentItem.id) ?? [];
    for (const edge of neighbors) {
      if (visitedUsers.has(edge.toUserId)) {
        continue;
      }

      const nextItem = itemById.get(edge.toItemId);
      if (!nextItem) {
        continue;
      }

      visitedUsers.add(edge.toUserId);
      pathItems.push(nextItem);
      pathEdges.push(edge.evaluation);

      this.dfsExploreCycles(
        offeredItem,
        objectiveText,
        minSteps,
        maxSteps,
        adjacency,
        itemById,
        closingEdgeByItemId,
        pathItems,
        pathEdges,
        visitedUsers,
        deduplicatedCycles,
      );

      pathEdges.pop();
      pathItems.pop();
      visitedUsers.delete(edge.toUserId);
    }
  }

  private materializeCycleCandidate(
    cycleItems: GraphItemNode[],
    cycleEdges: EdgeEvaluationResult[],
    objectiveText: string,
  ): SwapCycleCandidate {
    const k = cycleItems.length;
    const steps: SwapCycleStep[] = [];
    const edgeMatchScores: number[] = [];
    const stepValueParities: number[] = [];
    const participantRatings: number[] = [];
    const participants: GraphOwnerInfo[] = [];

    for (let i = 0; i < k; i++) {
      const giverItem = cycleItems[i];
      const recipientItem = cycleItems[(i + 1) % k];
      const receivedItem = cycleItems[(i - 1 + k) % k];

      // Edge i is giverItem -> recipientItem; incoming edge is receivedItem -> giverItem
      const outgoingEdge = cycleEdges[i];
      const stepValueParity = this.scoringStrategy.computeValueParity(
        giverItem.estimatedValue,
        receivedItem.estimatedValue,
      );

      edgeMatchScores.push(outgoingEdge.matchScore);
      stepValueParities.push(stepValueParity);
      participantRatings.push(giverItem.owner.rating ?? 5.0);
      participants.push(giverItem.owner);

      steps.push({
        stepOrder: i,
        userId: giverItem.ownerId,
        userName: giverItem.owner.name,
        userRating: giverItem.owner.rating ?? 5.0,
        userAvatarUrl: giverItem.owner.avatarUrl ?? null,
        userLocation: giverItem.owner.location ?? giverItem.location ?? null,
        recipientUserId: recipientItem.ownerId,
        recipientUserName: recipientItem.owner.name,
        givesItemId: giverItem.id,
        givesItemName: giverItem.name,
        givesItemCategory: giverItem.category,
        givesItemValue: giverItem.estimatedValue,
        givesItemImage: giverItem.images?.[0] ?? null,
        receivesItemId: receivedItem.id,
        receivesItemName: receivedItem.name,
        receivesItemCategory: receivedItem.category,
        receivesItemValue: receivedItem.estimatedValue,
        receivesItemImage: receivedItem.images?.[0] ?? null,
        edgeMatchScore: outgoingEdge.matchScore,
        valueParityScore: stepValueParity,
        matchedWantText: outgoingEdge.matchedWantText,
      });
    }

    const matchScore = this.scoringStrategy.computeCycleMatchScore({
      edgeMatchScores,
      stepValueParities,
      participantRatings,
      stepsCount: k,
    });

    const co2SavedKg = this.scoringStrategy.computeCo2SavedKg(k);
    const avgEdgeMatchScore = Number(
      (
        edgeMatchScores.reduce((acc, val) => acc + val, 0) /
        Math.max(1, edgeMatchScores.length)
      ).toFixed(4),
    );
    const avgValueParityScore = Number(
      (
        stepValueParities.reduce((acc, val) => acc + val, 0) /
        Math.max(1, stepValueParities.length)
      ).toFixed(4),
    );
    const avgParticipantRating = Number(
      (
        participantRatings.reduce((acc, val) => acc + val, 0) /
        Math.max(1, participantRatings.length)
      ).toFixed(2),
    );

    const canonicalKey = this.buildCanonicalCycleKey(cycleItems);
    const offeredItem = cycleItems[0];
    const targetItem = cycleItems[k - 1];

    return {
      canonicalKey,
      hops: k,
      matchScore,
      co2SavedKg,
      offeredItemId: offeredItem.id,
      targetItemId: targetItem.id,
      objectiveText,
      avgEdgeMatchScore,
      avgValueParityScore,
      avgParticipantRating,
      steps,
      participants,
      chainItems: [...cycleItems],
    };
  }

  /**
   * Builds a canonical rotation key anchored at the initiator (index 0).
   * Because every participant `userId` in a simple cycle is unique and `initiatorUserId`
   * is always rotated to index 0, the ordered sequence of `(userId:itemId)` pairs from index 0
   * uniquely identifies the directed cycle.
   */
  buildCanonicalCycleKey(cycleItems: GraphItemNode[]): string {
    if (cycleItems.length === 0) {
      return '';
    }
    return cycleItems.map((item) => `${item.ownerId}:${item.id}`).join('->');
  }

  /**
   * Closing edges toward the objective text, falling back to the offered item's own
   * wants when the text matches nothing.
   */
  private evaluateObjectiveClosingEdges(
    nonInitiatorItems: GraphItemNode[],
    offeredItem: GraphItemNode,
    objectiveWants: GraphWantNode[],
    valueTolerancePct: number,
    desiredCategory?: string,
  ): Map<string, EdgeEvaluationResult> {
    const closing = this.evaluateClosingEdges(
      nonInitiatorItems,
      offeredItem,
      objectiveWants,
      valueTolerancePct,
      desiredCategory,
    );
    if (closing.size > 0 || !Array.isArray(offeredItem.wants) || offeredItem.wants.length === 0) {
      return closing;
    }
    return this.evaluateClosingEdges(
      nonInitiatorItems,
      offeredItem,
      offeredItem.wants,
      valueTolerancePct,
      desiredCategory,
    );
  }

  /**
   * The only closing edge when the initiator picked an exact item: they want it by
   * definition, so only the value band can rule it out.
   */
  private evaluateTargetClosingEdge(
    targetItem: GraphItemNode,
    offeredItem: GraphItemNode,
    valueTolerancePct: number,
  ): Map<string, EdgeEvaluationResult> {
    const closing = new Map<string, EdgeEvaluationResult>();
    if (
      !this.scoringStrategy.isValueWithinTolerance(
        targetItem.estimatedValue,
        offeredItem.estimatedValue,
        valueTolerancePct,
      )
    ) {
      return closing;
    }
    closing.set(targetItem.id, {
      matches: true,
      matchScore: 1,
      lexicalScore: 1,
      semanticScore: 0,
      valueParityScore: this.scoringStrategy.computeValueParity(
        targetItem.estimatedValue,
        offeredItem.estimatedValue,
      ),
      matchedWantText: targetItem.name,
      reason: 'MATCHED',
    });
    return closing;
  }

  private evaluateClosingEdges(
    nonInitiatorItems: GraphItemNode[],
    offeredItem: GraphItemNode,
    targetWants: GraphWantNode[],
    valueTolerancePct: number,
    desiredCategory?: string,
  ): Map<string, EdgeEvaluationResult> {
    const closingEdgeByItemId = new Map<string, EdgeEvaluationResult>();
    if (!targetWants || targetWants.length === 0) {
      return closingEdgeByItemId;
    }

    for (const candidateLastItem of nonInitiatorItems) {
      const closingEvaluation = this.scoringStrategy.evaluateDirectedEdge(
        candidateLastItem,
        offeredItem,
        {
          valueTolerancePct,
          targetWantsOverride: targetWants,
          desiredCategory,
        },
      );
      if (closingEvaluation.matches) {
        closingEdgeByItemId.set(candidateLastItem.id, closingEvaluation);
      }
    }

    return closingEdgeByItemId;
  }

  private isItemActive(item: GraphItemNode): boolean {
    if (!item || !item.id || !item.ownerId) {
      return false;
    }
    if (!item.status) {
      return true;
    }
    const normalizedStatus = item.status.trim().toUpperCase();
    return !INACTIVE_STATUSES.has(normalizedStatus);
  }

  private clampInt(value: number, min: number, max: number): number {
    const rounded = Math.round(Number.isFinite(value) ? value : max);
    return Math.max(min, Math.min(max, rounded));
  }

  private clampNumber(value: number, min: number, max: number): number {
    const safe = Number.isFinite(value) ? value : max;
    return Math.max(min, Math.min(max, safe));
  }
}
