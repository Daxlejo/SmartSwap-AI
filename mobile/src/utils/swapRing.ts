/**
 * Pure logic of the swap ring (docs/architecture/09-swap-ring.md): geometry,
 * ring status and the accessible text. SwapRing.tsx only draws what this returns.
 */
import type { NormalizedRouteStep } from '@/services/routes/routes.service';

/** A person's answer to the proposal. */
export type RingAcceptance = 'pending' | 'accepted' | 'rejected';

/** What a person hands to the next one in the ring. */
export interface RingItem {
  name: string;
  imageUrl?: string;
  /** Category, for the placeholder icon when there is no photo. */
  category?: string;
}

export interface RingParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  /** The item this person hands to the next one in the ring. */
  gives: RingItem;
  acceptance: RingAcceptance;
}

/**
 * Two to four people in giving order: participants[i] gives to participants[(i + 1) % n].
 * The tuple type rules out 0, 1 or 5 people at compile time.
 */
export type RingParticipants =
  | readonly [RingParticipant, RingParticipant]
  | readonly [RingParticipant, RingParticipant, RingParticipant]
  | readonly [RingParticipant, RingParticipant, RingParticipant, RingParticipant];

export type RingSize = RingParticipants['length'];

export type SwapRingVariant = 'compact' | 'full';

export type RingStatus =
  | { kind: 'waiting'; pending: number }
  | { kind: 'closed' }
  | { kind: 'broken'; rejectedBy: RingParticipant };

/** Narrows a list to the ring tuple, or null when it has fewer than 2 or more than 4 people. */
export const asRing = (list: readonly RingParticipant[]): RingParticipants | null => {
  const [a, b, c, d] = list;
  if (list.length === 2 && a && b) return [a, b];
  if (list.length === 3 && a && b && c) return [a, b, c];
  if (list.length === 4 && a && b && c && d) return [a, b, c, d];
  return null;
};

const ACCEPTANCE: Readonly<Record<NormalizedRouteStep['acceptance'], RingAcceptance>> = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'rejected',
};

/**
 * Builds the ring from the route steps (each step: who gives, what, and their answer).
 * Returns null, and the screen keeps its plain layout, when the steps cannot draw a
 * true ring: fewer than 2 or more than 4, a person twice, a step without a person or
 * an item name, or a step whose receiver is not the next giver. A wrong ring would
 * tell people the wrong thing about who gives them what.
 */
export const toRingParticipants = (steps: readonly NormalizedRouteStep[]): RingParticipants | null => {
  const ordered = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const ids = ordered.map((step) => step.userId);
  if (new Set(ids).size !== ids.length) return null;
  const complete = ordered.every((step) => step.user?.name?.trim() && step.givesItem?.name?.trim());
  if (!complete) return null;
  const chained = ordered.every(
    (step, index) => !step.toUserId || step.toUserId === ids[(index + 1) % ids.length],
  );
  if (!chained) return null;

  return asRing(
    ordered.map((step) => {
      const acceptance = ACCEPTANCE[step.acceptance];
      if (!acceptance) console.warn(`[swapRing] unknown acceptance "${String(step.acceptance)}", shown as pending`);
      return {
        id: step.userId,
        name: step.user.name,
        avatarUrl: step.user.avatarUrl,
        gives: { name: step.givesItem.name, imageUrl: step.givesItem.imageUrl, category: step.givesItem.category },
        acceptance: acceptance ?? 'pending',
      };
    }),
  );
};

/**
 * Rotates the ring so the viewer comes first (drawn at the top, first line of the
 * list). The cycle is circular, so the order of giving does not change.
 */
export const fromViewer = (ring: RingParticipants, viewerId: string | undefined): RingParticipants => {
  const start = ring.findIndex((p) => p.id === viewerId);
  if (start <= 0) return ring;
  return asRing([...ring.slice(start), ...ring.slice(0, start)]) ?? ring;
};

export const ringStatus = (ring: RingParticipants): RingStatus => {
  const rejected = ring.find((p) => p.acceptance === 'rejected');
  if (rejected) return { kind: 'broken', rejectedBy: rejected };
  const pending = ring.filter((p) => p.acceptance === 'pending').length;
  return pending === 0 ? { kind: 'closed' } : { kind: 'waiting', pending };
};

// ---------------------------------------------------------------------------
// Geometry: a 100 × 100 viewBox, centre (50, 50), orbit radius 38
// ---------------------------------------------------------------------------

export const RING_CENTER = 50;
export const RING_RADIUS = 38;
export const HALO_RADIUS = 46;
/** Rendered size of each variant, in CSS px. */
export const RING_PX: Readonly<Record<SwapRingVariant, number>> = { full: 320, compact: 260 };
/** Avatars are 48 px buttons in both variants. */
export const AVATAR_PX = 48;
/** Room left between an avatar and the end of an arc, in viewBox units. */
const ARC_CLEARANCE = 2.5;

export interface Point {
  x: number;
  y: number;
}

export interface RingNode {
  index: number;
  /** Degrees; -90 is the top, angles grow clockwise. */
  angle: number;
  position: Point;
}

export interface RingArc {
  /** The giver: the arc goes from node `from` to node `to`. */
  from: number;
  to: number;
  /** SVG path in the viewBox. */
  d: string;
  start: Point;
  end: Point;
  /** Where the item badge sits. */
  mid: Point;
  /** Length of the arc in viewBox units (for stroke-dasharray). */
  length: number;
}

export interface RingLayout {
  readonly nodes: readonly RingNode[];
  readonly arcs: readonly RingArc[];
  /** Avatar radius in viewBox units. */
  avatarRadius: number;
  /** Angle cut from each end of an arc so it never runs under an avatar, in degrees. */
  gapAngle: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export const pointAt = (angleDeg: number, radius = RING_RADIUS): Point => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: round(RING_CENTER + radius * Math.cos(rad)), y: round(RING_CENTER + radius * Math.sin(rad)) };
};

/** Person i sits at -90° + i·360°/n: the first at the top, the rest clockwise. */
export const nodeAngle = (index: number, size: number): number => -90 + (index * 360) / size;

export const ringLayout = (size: RingSize, variant: SwapRingVariant): RingLayout => {
  const avatarRadius = round((AVATAR_PX / 2 / RING_PX[variant]) * 100);
  const gapAngle = (2 * Math.asin((avatarRadius + ARC_CLEARANCE) / (2 * RING_RADIUS)) * 180) / Math.PI;
  const step = 360 / size;

  const nodes = Array.from({ length: size }, (_, index) => {
    const angle = nodeAngle(index, size);
    return { index, angle, position: pointAt(angle) };
  });

  const arcs = nodes.map((node) => {
    const from = node.index;
    const to = (from + 1) % size;
    const startAngle = node.angle + gapAngle;
    const endAngle = node.angle + step - gapAngle;
    const start = pointAt(startAngle);
    const end = pointAt(endAngle);
    // Sweep flag 1 draws clockwise; no arc spans more than 180°, so large-arc is 0
    const d = `M ${start.x} ${start.y} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${end.x} ${end.y}`;
    const length = round((RING_RADIUS * (endAngle - startAngle) * Math.PI) / 180);
    return { from, to, d, start, end, mid: pointAt(node.angle + step / 2), length };
  });

  return { nodes, arcs, avatarRadius, gapAngle: round(gapAngle) };
};

// ---------------------------------------------------------------------------
// Accessible text
// ---------------------------------------------------------------------------

/** The subset of i18next's `t` the ring needs. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export interface RingLine {
  participantId: string;
  isViewer: boolean;
  /** One or two sentences: the viewer's line says what they give and what they get. */
  sentences: string[];
  status: string;
  acceptance: RingAcceptance;
}

/** Sentences of the text list, one line per person, in ring order (rotate with `fromViewer` first). */
export const describeLines = (ring: RingParticipants, viewerId: string | undefined, t: Translate): RingLine[] =>
  ring.map((person, index) => {
    const next = ring[(index + 1) % ring.length];
    const previous = ring[(index - 1 + ring.length) % ring.length];
    const isViewer = person.id === viewerId;
    const sentences = isViewer
      ? [
          t('ring.youGive', { item: person.gives.name, to: firstName(next.name) }),
          t('ring.youReceive', { item: previous.gives.name, from: firstName(previous.name) }),
        ]
      : [
          next.id === viewerId
            ? t('ring.givesYou', { from: firstName(person.name), item: person.gives.name })
            : t('ring.gives', { from: firstName(person.name), item: person.gives.name, to: firstName(next.name) }),
        ];
    return {
      participantId: person.id,
      isViewer,
      sentences,
      status: t(`ring.${isViewer ? 'you' : 'person'}.${person.acceptance}`),
      acceptance: person.acceptance,
    };
  });

/** The `aria-label` of the drawing: the ring's state, then the whole cycle in one go. */
export const describeRing = (ring: RingParticipants, viewerId: string | undefined, t: Translate): string => {
  const status = ringStatus(ring);
  const people = ring.length;
  let summary: string;
  if (status.kind === 'closed') {
    summary = t('ring.summary.closed', { people });
  } else if (status.kind === 'broken') {
    summary =
      status.rejectedBy.id === viewerId
        ? t('ring.summary.brokenByYou', { people })
        : t('ring.summary.broken', { people, name: firstName(status.rejectedBy.name) });
  } else {
    summary = t('ring.summary.waiting', { people, count: status.pending });
  }
  const cycle = ring.map((person, index) => {
    const next = ring[(index + 1) % ring.length];
    if (person.id === viewerId) return t('ring.youGive', { item: person.gives.name, to: firstName(next.name) });
    if (next.id === viewerId) return t('ring.givesYou', { from: firstName(person.name), item: person.gives.name });
    return t('ring.gives', { from: firstName(person.name), item: person.gives.name, to: firstName(next.name) });
  });
  return [summary, ...cycle].map((s) => (/[.!?]$/.test(s) ? s : `${s}.`)).join(' ');
};
