import {
  authed,
  createTestApp,
  registerUser,
  RegisteredUser,
  TestApp,
} from './support/test-app';
import { publishCycleItems, RouteBody } from './support/fixtures';

const toProposal = (route: RouteBody) => ({
  objectiveText: route.objectiveText,
  matchScore: Math.min(100, Math.max(0, route.matchScore)),
  steps: route.steps.map(
    ({ stepOrder, userId, givesItemId, receivesItemId }) => ({
      stepOrder,
      userId,
      givesItemId,
      receivesItemId,
    }),
  ),
});

describe('Circular swap flow (e2e)', () => {
  let testApp: TestApp;
  let alex: RegisteredUser;
  let valeria: RegisteredUser;
  let mateo: RegisteredUser;
  let itemIds: { bikeId: string; cameraId: string; guitarId: string };
  let discovered: RouteBody;
  let proposed: RouteBody;

  beforeAll(async () => {
    testApp = await createTestApp();
    alex = await registerUser(testApp, 'Alex', 'Pasto, Colombia');
    valeria = await registerUser(testApp, 'Valeria', 'Medellín, Colombia');
    mateo = await registerUser(testApp, 'Mateo');
    itemIds = await publishCycleItems(testApp, { alex, valeria, mateo });
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('never exposes passwordHash in auth or profile responses', async () => {
    const me = await testApp
      .http()
      .get('/api/v1/auth/me')
      .set(authed(alex.token))
      .expect(200);
    const profile = await testApp
      .http()
      .get('/api/v1/users/me')
      .set(authed(alex.token))
      .expect(200);

    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    expect(JSON.stringify(profile.body)).not.toContain('passwordHash');
  });

  it('rejects protected endpoints without a token', async () => {
    await testApp.http().get('/api/v1/routes').expect(401);
    await testApp
      .http()
      .post('/api/v1/routes/search')
      .send({ objectiveText: 'Cámara' })
      .expect(401);
  });

  it('discovers the 3-person cycle from Alex objective', async () => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/search')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Cámara Fujifilm X-T30',
        offeredItemId: itemIds.bikeId,
        maxSteps: 4,
      })
      .expect(200);

    const routes = response.body as RouteBody[];
    const threeHop = routes.find((route) => {
      const participants = new Set(route.steps.map((s) => s.userId));
      return (
        participants.size === 3 &&
        [alex.id, valeria.id, mateo.id].every((id) => participants.has(id))
      );
    });

    expect(threeHop).toBeDefined();
    discovered = threeHop as RouteBody;
    expect(discovered.aiExplanation).toEqual(expect.any(String));
  });

  it('proposes the route, locks every item and notifies the other participants', async () => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/propose')
      .set(authed(alex.token))
      .send(toProposal(discovered))
      .expect(201);
    proposed = response.body as RouteBody;

    expect(proposed.status).toBe('PROPOSED');
    const lockedStatuses = testApp.prisma
      .rows('item')
      .filter((item) => Object.values(itemIds).includes(item.id as string))
      .map((item) => item.status);
    expect(lockedStatuses).toEqual([
      'PENDING_SWAP',
      'PENDING_SWAP',
      'PENDING_SWAP',
    ]);

    const notifications = await testApp
      .http()
      .get('/api/v1/notifications')
      .set(authed(valeria.token))
      .expect(200);
    expect(notifications.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ROUTE_PROPOSAL',
          routeId: proposed.id,
        }),
      ]),
    );
  });

  it('refuses a second proposal over items that are already locked', async () => {
    await testApp
      .http()
      .post('/api/v1/routes/propose')
      .set(authed(alex.token))
      .send(toProposal(discovered))
      .expect(409);
  });

  it('hides the route from users outside the cycle', async () => {
    const outsider = await registerUser(testApp, 'Camila', 'Cali, Colombia');
    await testApp
      .http()
      .get(`/api/v1/routes/${proposed.id}`)
      .set(authed(outsider.token))
      .expect(404);
  });

  it('confirms the route once every participant accepts', async () => {
    const afterValeria = await testApp
      .http()
      .post(`/api/v1/routes/${proposed.id}/respond`)
      .set(authed(valeria.token))
      .send({ decision: 'ACCEPTED' })
      .expect(200);
    expect(afterValeria.body.status).toBe('PROPOSED');

    const afterMateo = await testApp
      .http()
      .post(`/api/v1/proposals/${proposed.id}/respond`)
      .set(authed(mateo.token))
      .send({ decision: 'ACCEPTED' })
      .expect(200);
    expect(afterMateo.body.status).toBe('CONFIRMED');
  });

  it('completes the swap, marks items as traded and credits CO2 to every participant', async () => {
    const response = await testApp
      .http()
      .post(`/api/v1/routes/${proposed.id}/complete`)
      .set(authed(alex.token))
      .expect(200);
    expect(response.body.status).toBe('COMPLETED');

    const items = testApp.prisma
      .rows('item')
      .filter((item) => Object.values(itemIds).includes(item.id as string));
    expect(items.every((item) => item.status === 'SWAPPED')).toBe(true);

    for (const user of [alex, valeria, mateo]) {
      const stats = await testApp
        .http()
        .get('/api/v1/users/me/stats')
        .set(authed(user.token))
        .expect(200);
      expect(stats.body.stats.tradesCompleted).toBe(1);
      expect(stats.body.stats.co2SavedKg).toBeGreaterThan(0);
    }
  });
});
