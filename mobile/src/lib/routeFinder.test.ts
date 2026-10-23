import { describe, it, expect } from 'vitest';
import { findRoutes } from './routeFinder';
import { mockItems, mockUsers } from '../data/mockData';

describe('routeFinder', () => {
  it('should find the 4-step route from Bike to Camera', () => {
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-camera', {
      maxSwaps: 5,
      maxRoutes: 10,
    });
    
    // There are two routes to the camera: the 2-step one and the 4-step one
    expect(routes.length).toBeGreaterThan(0);
    const fourStepRoute = routes.find(r => r.stepsCount === 4);
    expect(fourStepRoute).toBeDefined();
    
    // Verify the path of the 4-step route
    const itemIds = fourStepRoute!.chainItems.map(i => i.id);
    expect(itemIds).toEqual([
      'item-bike',
      'item-ball',
      'item-headphones',
      'item-laptop',
      'item-camera'
    ]);
  });

  it('should find the shorter 2-step alternative route from Bike to Camera', () => {
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-camera', {
      maxSwaps: 5,
      maxRoutes: 10,
    });
    
    expect(routes.length).toBeGreaterThan(0);
    // Because we sort by fewest swaps, the first route should be the shortest
    expect(routes[0].stepsCount).toBe(2);
    expect(routes[0].chainItems.map(i => i.id)).toEqual([
      'item-bike',
      'item-switch',
      'item-camera'
    ]);
  });

  it('should not find a route if target is unreachable', () => {
    // guitar wants ipad, ipad wants keyboard and vintage-bike. 
    // vintage-bike wants laptop, laptop wants headphones, headphones wants ball, ball wants bike, bike wants camera/ipad.
    // wait, is it unreachable? Let's check a truly unreachable one.
    // smartwatch wants lens, lens wants smartwatch. They are an isolated cycle.
    const routes = findRoutes(mockItems, mockUsers, 'item-smartwatch', 'item-bike');
    expect(routes.length).toBe(0);
  });

  it('should respect the maxSwaps parameter', () => {
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-camera', {
      maxSwaps: 3, // only allows up to 3 swaps
      maxRoutes: 10,
    });
    
    // 4-step route should be filtered out
    expect(routes.length).toBe(1);
    expect(routes[0].stepsCount).toBe(2);
  });

  it('should respect the maxRoutes parameter', () => {
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-camera', {
      maxSwaps: 5,
      maxRoutes: 1, // only return 1 route
    });
    
    expect(routes.length).toBe(1);
    expect(routes[0].stepsCount).toBe(2); // shortest is kept
  });

  it('should find a direct swap (1-swap route) if available', () => {
    // Carlos has item-ball. He wants item-bike.
    // If Alex (item-bike) wants item-ball, it's a direct swap.
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-ball', {
      maxSwaps: 5,
    });
    
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0].stepsCount).toBe(1);
    expect(routes[0].chainItems.map(i => i.id)).toEqual(['item-bike', 'item-ball']);
  });

  it('should not allow a user to appear twice in the same route', () => {
    // We already check this in routeFinder, let's verify by checking the path's owners.
    const routes = findRoutes(mockItems, mockUsers, 'item-bike', 'item-camera', { maxSwaps: 5 });
    
    for (const route of routes) {
      const userIds = route.chainItems.map(item => item.ownerId);
      const uniqueUserIds = new Set(userIds);
      expect(userIds.length).toBe(uniqueUserIds.size);
    }
  });
});
