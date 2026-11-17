import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import '@/i18n';
import { ExampleRing } from '@/components/ExampleRing';
import { distinctAvatarColors } from '@/utils/avatarIdentity';
import {
  EXAMPLE_BADGE_PX,
  EXAMPLE_NODE_PX,
  EXAMPLE_RING_CENTER,
  EXAMPLE_RING_HEIGHT,
  EXAMPLE_RING_WIDTH,
  exampleRingGeometry,
} from '@/utils/exampleRing';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('example ring geometry', () => {
  const { nodes, arcs } = exampleRingGeometry();

  it('puts three people 120° apart around the centre', () => {
    expect(nodes).toHaveLength(3);
    const [a, b, c] = nodes;
    expect(distance(a, b)).toBeCloseTo(distance(b, c), 1);
    expect(distance(b, c)).toBeCloseTo(distance(c, a), 1);
    expect(a.y).toBeLessThan(EXAMPLE_RING_CENTER.y);
  });

  it('keeps arrows clear of the item badges and of the people', () => {
    for (const [index, arc] of arcs.entries()) {
      expect(distance(arc.arrow, arc.badge)).toBeGreaterThan(EXAMPLE_BADGE_PX / 2 + 8);
      const receiver = nodes[(index + 1) % nodes.length];
      expect(distance(arc.arrow, receiver)).toBeGreaterThan(EXAMPLE_NODE_PX / 2);
      for (const node of nodes) {
        expect(distance(arc.badge, node)).toBeGreaterThan(EXAMPLE_NODE_PX / 2 + EXAMPLE_BADGE_PX / 2);
      }
    }
  });

  it('fits in the box with room for the names under the people', () => {
    for (const node of nodes) {
      expect(node.x - EXAMPLE_NODE_PX / 2).toBeGreaterThanOrEqual(0);
      expect(node.x + EXAMPLE_NODE_PX / 2).toBeLessThanOrEqual(EXAMPLE_RING_WIDTH);
      expect(node.y + EXAMPLE_NODE_PX / 2 + 28).toBeLessThanOrEqual(EXAMPLE_RING_HEIGHT);
    }
  });
});

describe('ExampleRing', () => {
  const people = [
    { id: 'u-1', name: 'Ana Pérez', gives: { name: 'la bicicleta' } },
    { id: 'u-2', name: 'Camilo', gives: { name: 'la guitarra' } },
    { id: 'u-3', name: 'Laura', gives: { name: 'la cafetera' } },
  ] as const;

  it('shows one ring with "Tú", the names, the items and one short centre line', () => {
    const html = renderToStaticMarkup(<ExampleRing people={people} viewerId="u-1" />);
    expect(html).toContain('>Tú<');
    expect(html).toContain('>Camilo<');
    expect(html).toContain('3 personas, 1 canje');
    expect(html.match(/data-testid="example-ring-item"/g)).toHaveLength(3);
    expect(html).toContain('pedal_bike');
    expect(html).toContain('coffee_maker');
    expect(html).toContain('Tú entrega la bicicleta a Camilo');
  });

  it('gives each person a different colour', () => {
    expect(new Set(distinctAvatarColors(['a', 'a', 'a'])).size).toBe(3);
  });
});
