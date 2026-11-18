import {
  authed,
  createTestApp,
  registerUser,
  RegisteredUser,
  TestApp,
} from './support/test-app';
import { publishCycleItems, RouteBody } from './support/fixtures';

/**
 * A swap after every participant said yes: the items are reserved, leave the catalog
 * and come back when the swap is called off.
 */
describe('Swap handoff (e2e)', () => {
  let testApp: TestApp;
  let alex: RegisteredUser;
  let valeria: RegisteredUser;
  let mateo: RegisteredUser;
  let itemIds: { bikeId: string; cameraId: string; guitarId: string };

  const proposeCycle = async (): Promise<RouteBody> => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/propose')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Cámara Fujifilm X-T30',
        matchScore: 90,
        steps: [
          { stepOrder: 0, userId: alex.id, givesItemId: itemIds.bikeId, receivesItemId: itemIds.cameraId },
          { stepOrder: 1, userId: valeria.id, givesItemId: itemIds.cameraId, receivesItemId: itemIds.guitarId },
          { stepOrder: 2, userId: mateo.id, givesItemId: itemIds.guitarId, receivesItemId: itemIds.bikeId },
        ],
      })
      .expect(201);
    return response.body as RouteBody;
  };

  const accept = (route: RouteBody, user: RegisteredUser) =>
    testApp
      .http()
      .post(`/api/v1/routes/${route.id}/respond`)
      .set(authed(user.token))
      .send({ decision: 'ACCEPTED' })
      .expect(200);

  /** Proposed by Alex and accepted by Valeria and Mateo. */
  const confirmedSwap = async (): Promise<RouteBody> => {
    const route = await proposeCycle();
    await accept(route, valeria);
    const confirmed = await accept(route, mateo);
    expect(confirmed.body.status).toBe('CONFIRMED');
    return confirmed.body as RouteBody;
  };

  const itemStatuses = () =>
    testApp.prisma
      .rows('item')
      .filter((item) => Object.values(itemIds).includes(item.id as string))
      .map((item) => item.status);

  beforeAll(async () => {
    testApp = await createTestApp();
    alex = await registerUser(testApp, 'Alex');
    valeria = await registerUser(testApp, 'Valeria');
    mateo = await registerUser(testApp, 'Mateo');
    itemIds = await publishCycleItems(testApp, { alex, valeria, mateo });
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  });

  describe('reservation', () => {
    it('keeps the items locked, not reserved, while someone still has to answer', async () => {
      const route = await proposeCycle();
      await accept(route, valeria);

      expect(itemStatuses()).toEqual(['PENDING_SWAP', 'PENDING_SWAP', 'PENDING_SWAP']);

      await testApp.http().post(`/api/v1/routes/${route.id}/cancel`).set(authed(alex.token)).expect(200);
    });

    it('reserves every item once all participants accept, and hides them from Explore', async () => {
      const route = await confirmedSwap();

      expect(itemStatuses()).toEqual(['RESERVED', 'RESERVED', 'RESERVED']);

      const explore = await testApp.http().get('/api/v1/items').set(authed(mateo.token)).expect(200);
      const listedIds = (explore.body.items ?? explore.body).map((item: { id: string }) => item.id);
      expect(listedIds).not.toContain(itemIds.bikeId);
      expect(listedIds).not.toContain(itemIds.cameraId);

      const mine = await testApp.http().get('/api/v1/items/mine').set(authed(alex.token)).expect(200);
      const bike = (mine.body.items ?? mine.body).find((item: { id: string }) => item.id === itemIds.bikeId);
      expect(bike.status).toBe('RESERVED');

      // A reserved item cannot be offered again
      await testApp
        .http()
        .post('/api/v1/routes/propose')
        .set(authed(alex.token))
        .send({
          objectiveText: 'Otra vez',
          matchScore: 80,
          steps: [
            { stepOrder: 0, userId: alex.id, givesItemId: itemIds.bikeId, receivesItemId: itemIds.cameraId },
            { stepOrder: 1, userId: valeria.id, givesItemId: itemIds.cameraId, receivesItemId: itemIds.bikeId },
          ],
        })
        .expect(409);

      // Nor deleted while it is promised
      await testApp.http().delete(`/api/v1/items/${itemIds.bikeId}`).set(authed(alex.token)).expect(409);

      // Calling the swap off returns them to the catalog
      const cancelled = await testApp
        .http()
        .post(`/api/v1/routes/${route.id}/cancel`)
        .set(authed(valeria.token))
        .expect(200);
      expect(cancelled.body.status).toBe('CANCELLED');
      expect(itemStatuses()).toEqual(['AVAILABLE', 'AVAILABLE', 'AVAILABLE']);
    });
  });
});
