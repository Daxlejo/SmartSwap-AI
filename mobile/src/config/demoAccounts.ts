/**
 * Seeded demo network (api/prisma/seed.ts). Emails only: the shared demo password comes from
 * VITE_DEMO_PASSWORD so it is never committed and the switcher stays hidden in non-demo builds.
 */
export interface DemoAccount {
  email: string;
  name: string;
  initials: string;
  city: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'alex@smartswap.co', name: 'Alex', initials: 'AR', city: 'Pasto' },
  { email: 'valeria@smartswap.co', name: 'Valeria', initials: 'VG', city: 'Medellín' },
  { email: 'mateo@smartswap.co', name: 'Mateo', initials: 'MV', city: 'Bogotá' },
  { email: 'camila@smartswap.co', name: 'Camila', initials: 'CT', city: 'Cali' },
];
