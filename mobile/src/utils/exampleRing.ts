/**
 * Geometry of the three-person example ring (first use and Home): three people at
 * 120° from each other, one arc per delivery that stops short of both people, the
 * item badge in the middle of its arc and the arrowhead at the end, where it arrives.
 * Everything is in px of a fixed 300 × 290 box, so CSS motion paths line up.
 */

export const EXAMPLE_RING_WIDTH = 300;
export const EXAMPLE_RING_HEIGHT = 290;
export const EXAMPLE_RING_CENTER = { x: 150, y: 140 } as const;
export const EXAMPLE_RING_RADIUS = 104;
export const EXAMPLE_NODE_PX = 52;
export const EXAMPLE_BADGE_PX = 40;

/** Gap kept between an arc end and the edge of a person's circle, in px. */
const NODE_GAP_PX = 9;

/** People sit at the top, bottom right and bottom left; giving goes clockwise. */
const NODE_ANGLES_DEG = [-90, 30, 150] as const;

export interface RingPoint {
  x: number;
  y: number;
}

export interface ExampleArc {
  /** SVG path of the arc, drawn clockwise from the giver toward the receiver. */
  path: string;
  /** Middle of the arc, where the item badge sits. */
  badge: RingPoint;
  /** Tip of the arrowhead and its rotation in degrees (pointing along the arc). */
  arrow: RingPoint & { rotation: number };
  startDeg: number;
  endDeg: number;
}

export interface ExampleRingGeometry {
  nodes: RingPoint[];
  arcs: ExampleArc[];
}

const round = (value: number): number => Math.round(value * 100) / 100;

export const pointAt = (deg: number, radius = EXAMPLE_RING_RADIUS): RingPoint => {
  const rad = (deg * Math.PI) / 180;
  return {
    x: round(EXAMPLE_RING_CENTER.x + radius * Math.cos(rad)),
    y: round(EXAMPLE_RING_CENTER.y + radius * Math.sin(rad)),
  };
};

/** Degrees of arc the person's circle (plus the gap) covers on each side. */
export const nodeClearanceDeg = (): number =>
  ((EXAMPLE_NODE_PX / 2 + NODE_GAP_PX) / EXAMPLE_RING_RADIUS) * (180 / Math.PI);

export const exampleRingGeometry = (): ExampleRingGeometry => {
  const clearance = nodeClearanceDeg();
  const nodes = NODE_ANGLES_DEG.map((deg) => pointAt(deg));
  const arcs = NODE_ANGLES_DEG.map((fromDeg, index) => {
    const toDeg = index === NODE_ANGLES_DEG.length - 1 ? NODE_ANGLES_DEG[0] + 360 : NODE_ANGLES_DEG[index + 1];
    const startDeg = fromDeg + clearance;
    const endDeg = toDeg - clearance;
    const start = pointAt(startDeg);
    const end = pointAt(endDeg);
    return {
      path: `M ${start.x} ${start.y} A ${EXAMPLE_RING_RADIUS} ${EXAMPLE_RING_RADIUS} 0 0 1 ${end.x} ${end.y}`,
      badge: pointAt((fromDeg + toDeg) / 2),
      // Clockwise travel: the tangent points 90° ahead of the radius
      arrow: { ...end, rotation: round(endDeg + 90) },
      startDeg: round(startDeg),
      endDeg: round(endDeg),
    };
  });
  return { nodes, arcs };
};
