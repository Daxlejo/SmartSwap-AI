import { existsSync } from 'fs';
import { join } from 'path';
import { GeoService } from '../modules/geo/geo.service';
import {
  DEMO_ITEMS,
  DEMO_USERS,
  PROPOSAL_STEPS,
  SeedItemSpec,
} from './seed-data';

/**
 * The demo only works if these relationships hold: an edit that breaks one of them would
 * leave the route engine with no cycle to show.
 */
describe('seed demo data', () => {
  const geo = new GeoService();
  const itemById = new Map(DEMO_ITEMS.map((item) => [item.id, item]));
  const emailToUser = new Map(DEMO_USERS.map((user) => [user.email, user]));

  it('uses unique ids and emails', () => {
    expect(new Set(DEMO_USERS.map((u) => u.id)).size).toBe(DEMO_USERS.length);
    expect(new Set(DEMO_USERS.map((u) => u.email)).size).toBe(DEMO_USERS.length);
    expect(new Set(DEMO_ITEMS.map((i) => i.id)).size).toBe(DEMO_ITEMS.length);
  });

  it('places every user in a Nariño municipality', () => {
    for (const user of DEMO_USERS) {
      const municipality = geo.requireMunicipality(user.municipalityCode);
      expect(municipality.departmentCode).toBe('52');
    }
  });

  it('gives every item a known owner, a whole-peso price and a photo file', () => {
    for (const item of DEMO_ITEMS) {
      expect(emailToUser.has(item.ownerEmail)).toBe(true);
      expect(Number.isInteger(item.estimatedValue)).toBe(true);
      expect(item.estimatedValue).toBeGreaterThan(0);
      expect(existsSync(join(__dirname, '../../prisma/seed-assets', item.photo))).toBe(true);
    }
  });

  it('closes the in-progress proposal over items locked for it', () => {
    const gives = PROPOSAL_STEPS.map((step) => step.gives);
    const receives = PROPOSAL_STEPS.map((step) => step.receives);
    expect([...gives].sort()).toEqual([...receives].sort());
    expect(new Set(gives).size).toBe(gives.length);

    for (const step of PROPOSAL_STEPS) {
      const givenItem = itemById.get(step.gives) as SeedItemSpec;
      expect(givenItem.ownerEmail).toBe(step.email);
      expect(givenItem.lockedByProposal).toBe(true);
    }
    const locked = DEMO_ITEMS.filter((item) => item.lockedByProposal).map((item) => item.id);
    expect([...locked].sort()).toEqual([...gives].sort());
  });

  it('wires wants into a 2, a 3 and a 4 person cycle for Alex', () => {
    const wantersOf = (name: string): SeedItemSpec | undefined =>
      DEMO_ITEMS.find((item) => item.wants.some((want) => name.toLowerCase().includes(want.toLowerCase())));
    const byName = (fragment: string): SeedItemSpec => {
      const found = DEMO_ITEMS.find((item) => item.name.includes(fragment));
      if (!found) throw new Error(`No demo item named like ${fragment}`);
      return found;
    };
    // Each item is wanted by the owner of the next one; the last one closes on Alex's objective.
    const cycles: Array<[string[], string]> = [
      [['Bicicleta', 'Guitarra'], 'Guitarra'],
      [['Audífonos', 'Teclado', 'Tablet'], 'Tablet'],
      [['Reloj', 'Lente', 'Cámara', 'Consola'], 'Consola'],
    ];
    for (const [chain, objective] of cycles) {
      const items = chain.map(byName);
      expect(new Set(items.map((item) => item.ownerEmail)).size).toBe(items.length);
      for (let i = 0; i < items.length - 1; i++) {
        expect(wantersOf(items[i].name)).toBeDefined();
        expect(items[i + 1].wants.some((want) => items[i].name.toLowerCase().includes(want.toLowerCase()))).toBe(true);
      }
      expect(items[0].wants.some((want) => items[items.length - 1].name.toLowerCase().includes(want.toLowerCase()))).toBe(true);
      expect(items[items.length - 1].name).toContain(objective);
      expect(items[0].ownerEmail).toBe('alex@smartswap.co');
    }
  });
});
