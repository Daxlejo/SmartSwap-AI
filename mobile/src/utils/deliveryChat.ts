/** Where the delivery chat of a confirmed swap lives (a secondary screen: Android back returns to the route). */
export const deliveryChatPath = (routeId: string): string => `/swap/route/${encodeURIComponent(routeId)}/chat`;
