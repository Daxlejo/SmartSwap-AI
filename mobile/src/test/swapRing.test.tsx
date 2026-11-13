import { describe, it, expect, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '@/i18n';
import { SwapRing } from '@/components/SwapRing';
import type { NormalizedRouteStep } from '@/services/routes/routes.service';
import type { Item, User } from '@/types';
import {
  RING_CENTER,
  RING_RADIUS,
  asRing,
  describeLines,
  describeRing,
  fromViewer,
  ringLayout,
  ringStatus,
  toRingParticipants,
  type RingAcceptance,
  type RingParticipant,
  type RingParticipants,
  type Translate,
} from '@/utils/swapRing';

const t: Translate = (key, options) => i18n.t(key, options);

const person = (id: string, name: string, item: string, acceptance: RingAcceptance = 'pending'): RingParticipant => ({
  id,
  name,
  gives: { name: item, category: 'Deportes' },
  acceptance,
});

const ring = (...people: RingParticipant[]): RingParticipants => {
  const result = asRing(people);
  if (!result) throw new Error('a ring has 2 to 4 people');
  return result;
};

const me = (a: RingAcceptance = 'pending') => person('u-me', 'Alejandra Cabrera', 'la mochila', a);
const camilo = (a: RingAcceptance = 'pending') => person('u-camilo', 'Camilo Guerrero', 'los libros', a);
const laura = (a: RingAcceptance = 'pending') => person('u-laura', 'Laura Benavides', 'la bicicleta', a);
const sofia = (a: RingAcceptance = 'pending') => person('u-sofia', 'Sofía Rosero', 'la cafetera', a);

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

describe('ring geometry', () => {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

  it.each([
    [2, [[50, 12], [50, 88]], [[88, 50], [12, 50]]],
    [3, [[50, 12], [82.91, 69], [17.09, 69]], [[82.91, 31], [50, 88], [17.09, 31]]],
    [4, [[50, 12], [88, 50], [50, 88], [12, 50]], [[76.87, 23.13], [76.87, 76.87], [23.13, 76.87], [23.13, 23.13]]],
  ] as const)('places %i people from the top, clockwise, with each badge mid-arc', (n, avatars, badges) => {
    const layout = ringLayout(n, 'full');
    expect(layout.nodes.map((node) => [node.position.x, node.position.y])).toEqual(avatars);
    expect(layout.arcs.map((arc) => [arc.mid.x, arc.mid.y])).toEqual(badges);
  });

  it.each([2, 3, 4] as const)('links each of %i people to the next one and closes the cycle', (n) => {
    const { arcs } = ringLayout(n, 'compact');
    expect(arcs.map((arc) => [arc.from, arc.to])).toEqual(
      Array.from({ length: n }, (_, i) => [i, (i + 1) % n]),
    );
  });

  it.each([
    [2, 'full'],
    [3, 'full'],
    [4, 'full'],
    [2, 'compact'],
    [3, 'compact'],
    [4, 'compact'],
  ] as const)('keeps every arc of %i people (%s) on the orbit and clear of the avatars', (n, variant) => {
    const layout = ringLayout(n, variant);
    for (const arc of layout.arcs) {
      // Clockwise, never a large arc
      expect(arc.d).toMatch(new RegExp(`A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 `));
      for (const end of [arc.start, arc.end, arc.mid]) {
        expect(distance(end, { x: RING_CENTER, y: RING_CENTER })).toBeCloseTo(RING_RADIUS, 1);
      }
      for (const node of layout.nodes) {
        expect(distance(arc.start, node.position)).toBeGreaterThan(layout.avatarRadius);
        expect(distance(arc.end, node.position)).toBeGreaterThan(layout.avatarRadius);
      }
      expect(arc.length).toBeGreaterThan(0);
    }
  });

  it('gives compact avatars more room in the viewBox, since the ring is smaller', () => {
    expect(ringLayout(3, 'compact').avatarRadius).toBeGreaterThan(ringLayout(3, 'full').avatarRadius);
  });
});

describe('ring status', () => {
  it('waits while someone has not answered, counting the missing answers', () => {
    expect(ringStatus(ring(me(), camilo('accepted'), laura('accepted')))).toEqual({ kind: 'waiting', pending: 1 });
    expect(ringStatus(ring(me(), camilo()))).toEqual({ kind: 'waiting', pending: 2 });
  });

  it('closes when everyone accepted', () => {
    expect(ringStatus(ring(me('accepted'), camilo('accepted'), laura('accepted'), sofia('accepted')))).toEqual({
      kind: 'closed',
    });
  });

  it('breaks as soon as someone declines, even if the rest accepted', () => {
    expect(ringStatus(ring(me('accepted'), camilo('rejected'), laura('accepted')))).toEqual({
      kind: 'broken',
      rejectedBy: 'u-camilo',
    });
  });
});

describe('ring order and text', () => {
  const threeWay = ring(camilo('accepted'), laura('accepted'), me());

  it('puts the viewer first without changing who gives to whom', () => {
    const rotated = fromViewer(threeWay, 'u-me');
    expect(rotated.map((p) => p.id)).toEqual(['u-me', 'u-camilo', 'u-laura']);
    expect(fromViewer(threeWay, 'someone-else')).toBe(threeWay);
  });

  it('writes the viewer line first, with what they give and what they get', () => {
    const lines = describeLines(fromViewer(threeWay, 'u-me'), 'u-me', t);
    expect(lines[0]).toMatchObject({
      isViewer: true,
      sentences: ['Tú entregas la mochila a Camilo', 'Tú recibes la bicicleta de Laura'],
      status: 'Falta que respondas',
    });
    expect(lines[1].sentences).toEqual(['Camilo entrega los libros a Laura']);
    expect(lines[2].sentences).toEqual(['Laura te entrega la bicicleta']);
    expect(lines[2].status).toBe('Aceptó');
  });

  it('narrates the state and the whole cycle in the label', () => {
    expect(describeRing(fromViewer(threeWay, 'u-me'), 'u-me', t)).toBe(
      'Anillo de 3 personas: falta 1 respuesta. Tú entregas la mochila a Camilo. ' +
        'Camilo entrega los libros a Laura. Laura te entrega la bicicleta.',
    );
  });

  it('names who declined, or says the viewer did', () => {
    expect(describeRing(ring(me('accepted'), laura('rejected')), 'u-me', t)).toMatch(
      /^Anillo de 2 personas, abierto: Laura rechazó\./,
    );
    expect(describeRing(ring(me('rejected'), laura('accepted')), 'u-me', t)).toMatch(/abierto: rechazaste\./);
  });

  it('says when the ring is closed', () => {
    expect(describeRing(ring(me('accepted'), laura('accepted')), 'u-me', t)).toMatch(
      /^Anillo de 2 personas, cerrado: todas aceptaron\./,
    );
  });
});

describe('toRingParticipants', () => {
  const user = (id: string, name: string): User => ({ id, name, email: '', rating: 5, location: '', verified: false, co2SavedKg: 0 });
  const item = (id: string, name: string): Item => ({ id, name, category: 'Libros', condition: 'GOOD', ownerId: '', wants: [] });
  const step = (order: number, from: User, gives: Item, acceptance: NormalizedRouteStep['acceptance']): NormalizedRouteStep => ({
    id: `s-${order}`,
    stepOrder: order,
    userId: from.id,
    user: from,
    givesItemId: gives.id,
    givesItem: gives,
    receivesItemId: '',
    acceptance,
    deliveryConfirmed: false,
  });
  const a = user('a', 'Ana');
  const b = user('b', 'Beto');

  it('orders the steps and maps DECLINED to rejected', () => {
    const result = toRingParticipants([step(2, b, item('i2', 'Libro'), 'DECLINED'), step(1, a, item('i1', 'Lámpara'), 'ACCEPTED')]);
    expect(result?.map((p) => [p.id, p.gives.name, p.acceptance])).toEqual([
      ['a', 'Lámpara', 'accepted'],
      ['b', 'Libro', 'rejected'],
    ]);
  });

  it('returns null outside 2 to 4 people', () => {
    expect(toRingParticipants([])).toBeNull();
    expect(toRingParticipants([step(1, a, item('i1', 'x'), 'PENDING')])).toBeNull();
    const five = [1, 2, 3, 4, 5].map((n) => step(n, user(`u${n}`, `P${n}`), item(`i${n}`, 'x'), 'PENDING'));
    expect(toRingParticipants(five)).toBeNull();
  });
});

describe('<SwapRing />', () => {
  const html = (participants: RingParticipants, variant: 'full' | 'compact' = 'full', onFind?: () => void) =>
    renderToStaticMarkup(
      <SwapRing participants={participants} currentUserId="u-me" variant={variant} onFindAnotherRoute={onFind} />,
    );

  it('is one image with the narrated cycle, plus a 48 px button per person and a text list', () => {
    const markup = html(ring(camilo('accepted'), laura('accepted'), me()));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Anillo de 3 personas: falta 1 respuesta.');
    expect(markup.match(/<button[^>]*aria-pressed/g)).toHaveLength(3);
    expect(markup.match(/class="relative w-12 h-12/g)).toHaveLength(3);
    // The viewer's line is the first of the list
    const list = markup.slice(markup.indexOf('<ol'));
    expect(list.indexOf('Tú entregas la mochila a Camilo')).toBeLessThan(list.indexOf('Camilo entrega'));
    expect(markup).toContain('Esperando');
    expect(markup).toContain('3 personas');
  });

  it('shows item names on the arcs only in the full variant', () => {
    const people = ring(me(), laura());
    const drawing = (markup: string) => markup.slice(0, markup.indexOf('<figcaption'));
    // As visible text (the narration in aria-label always names the items)
    expect(drawing(html(people, 'full'))).toContain('>la bicicleta<');
    expect(drawing(html(people, 'compact'))).not.toContain('>la bicicleta<');
  });

  it('draws the halo only when everyone accepted', () => {
    expect(html(ring(me('accepted'), laura('accepted')))).toContain('ring-halo');
    expect(html(ring(me('accepted'), laura()))).not.toContain('ring-halo');
  });

  it('leaves the declined arc open and offers to look for another route', () => {
    const markup = html(ring(me('accepted'), camilo('rejected'), laura('accepted')), 'full', () => undefined);
    // Arcs only (arrowheads are "M0,0" paths inside the markers)
    expect(markup.match(/<path d="M \d/g)).toHaveLength(2);
    expect(markup).not.toContain('ring-halo');
    expect(markup).toContain('Rechazado');
    expect(markup).toContain('Buscar otra ruta');
  });
});
