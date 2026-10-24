import { Item, SwapRoute, User } from '../types';

export interface RouteFinderOptions {
  maxSwaps?: number;
  maxRoutes?: number;
}

export function findRoutes(
  items: Item[],
  users: User[],
  haveItemId: string,
  wantItemId: string,
  options?: RouteFinderOptions
): SwapRoute[] {
  const maxSwaps = options?.maxSwaps ?? 5;
  const maxRoutes = options?.maxRoutes ?? 3;

  const itemMap = new Map<string, Item>(items.map((i) => [i.id, i]));
  const userMap = new Map<string, User>(users.map((u) => [u.id, u]));

  // Adjacency list: fromItemId -> toItemId[]
  // Edge A -> B exists if B.wants.includes(A.id)
  const adj = new Map<string, string[]>();
  for (const item of items) {
    adj.set(item.id, []);
  }

  for (const b of items) {
    for (const aId of b.wants) {
      if (adj.has(aId)) {
        adj.get(aId)!.push(b.id);
      }
    }
  }

  // BFS
  // queue stores paths of item IDs, e.g., [haveItemId, ..., currentItemId]
  const queue: string[][] = [[haveItemId]];
  const validRoutes: string[][] = [];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentItem = path[path.length - 1];

    if (currentItem === wantItemId && path.length > 1) {
      validRoutes.push(path);
      if (validRoutes.length >= maxRoutes) {
        break;
      }
      continue; // Don't explore further from the target
    }

    if (path.length - 1 >= maxSwaps) {
      continue;
    }

    const neighbors = adj.get(currentItem) || [];
    for (const nextItem of neighbors) {
      // Never revisit an item
      if (path.includes(nextItem)) continue;

      // Never use the same user twice in one route
      const nextOwner = itemMap.get(nextItem)?.ownerId;
      if (!nextOwner) continue;
      
      let userAlreadyInPath = false;
      for (const id of path) {
        if (itemMap.get(id)?.ownerId === nextOwner) {
          userAlreadyInPath = true;
          break;
        }
      }

      if (userAlreadyInPath) continue;

      queue.push([...path, nextItem]);
    }
  }

  // Sort by fewest swaps
  validRoutes.sort((a, b) => a.length - b.length);

  // Convert paths to SwapRoute
  return validRoutes.map((path, index) => {
    const chainItems = path.map((id) => itemMap.get(id)!);
    const participants = chainItems.map((item) => userMap.get(item.ownerId)!);

    return {
      id: `route-${haveItemId}-${wantItemId}-${index}`,
      title: 'Ruta Inteligente Multiusuario',
      stepsCount: path.length - 1,
      targetItemId: wantItemId,
      offeredItemId: haveItemId,
      participants,
      chainItems,
      co2SavedKg: Number((participants.length * 10.5).toFixed(1)),
      isLoop: true,
    };
  });
}
