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

  describe('delivery chat', () => {
    let lucia: RegisteredUser;
    let swap: RouteBody;

    const handoff = (user: RegisteredUser) =>
      testApp.http().get(`/api/v1/routes/${swap.id}/handoff`).set(authed(user.token));
    const send = (user: RegisteredUser, body: object) =>
      testApp.http().post(`/api/v1/routes/${swap.id}/messages`).set(authed(user.token)).send(body);
    const proposeMeeting = (user: RegisteredUser, at: Date, place: string) =>
      testApp
        .http()
        .post(`/api/v1/routes/${swap.id}/meeting`)
        .set(authed(user.token))
        .send({ at: at.toISOString(), place });
    const confirmMeeting = (user: RegisteredUser) =>
      testApp.http().post(`/api/v1/routes/${swap.id}/meeting/confirm`).set(authed(user.token));

    beforeAll(async () => {
      lucia = await registerUser(testApp, 'Lucia');
      swap = await confirmedSwap();
    });

    it('is only for the participants of the swap', async () => {
      await handoff(lucia).expect(404);
      await send(lucia, { body: 'Hola' }).expect(404);
      await proposeMeeting(lucia, new Date(Date.now() + 86_400_000), 'Parque Nariño').expect(404);

      const own = await handoff(valeria).expect(200);
      expect(own.body.code).toBe(swap.code);
      expect(own.body.participants).toHaveLength(3);
      expect(own.body.messages).toEqual([]);
      expect(own.body.meeting).toBeNull();
    });

    it('takes text up to 500 characters and shows it to every participant', async () => {
      await send(alex, { body: '   ' }).expect(400);
      await send(alex, { body: 'a'.repeat(501) }).expect(400);
      await send(alex, { body: 'Hola', image: 'x' }).expect(400);

      await send(alex, { body: '¿Nos vemos el sábado en el parque?' }).expect(201);
      await send(mateo, { body: 'a'.repeat(500) }).expect(201);

      const seen = await handoff(valeria).expect(200);
      expect(seen.body.messages.map((m: { senderId: string }) => m.senderId)).toEqual([alex.id, mateo.id]);
      expect(seen.body.messages[0]).toEqual(
        expect.objectContaining({ body: '¿Nos vemos el sábado en el parque?', senderName: 'Alex' }),
      );
    });

    it('agrees a date and place once everyone confirms, and then shows when it completes by itself', async () => {
      await confirmMeeting(alex).expect(409);

      const at = new Date(Date.now() + 2 * 86_400_000);
      const proposed = await proposeMeeting(valeria, at, 'Parque Nariño, frente a la iglesia').expect(200);
      expect(proposed.body.meeting).toEqual(
        expect.objectContaining({ place: 'Parque Nariño, frente a la iglesia', proposedById: valeria.id, confirmedAt: null }),
      );
      expect(proposed.body.autoCompleteAt).toBeNull();
      expect(
        proposed.body.participants.find((p: { userId: string }) => p.userId === valeria.id).meetingConfirmed,
      ).toBe(true);

      await confirmMeeting(alex).expect(200);
      const agreed = await confirmMeeting(mateo).expect(200);
      expect(agreed.body.meeting.confirmedAt).not.toBeNull();
      expect(agreed.body.handoffDays).toBe(5);
      expect(new Date(agreed.body.autoCompleteAt).getTime()).toBe(at.getTime() + 5 * 86_400_000);

      const notices = await testApp.http().get('/api/v1/notifications').set(authed(alex.token)).expect(200);
      expect(notices.body.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'HANDOFF_MEETING_CONFIRMED', routeId: swap.id })]),
      );
    });

    it('asks everyone again when someone changes the date', async () => {
      const changed = await proposeMeeting(mateo, new Date(Date.now() + 3 * 86_400_000), 'Centro comercial Unicentro').expect(200);
      expect(changed.body.meeting.confirmedAt).toBeNull();
      expect(changed.body.autoCompleteAt).toBeNull();
      const confirmations = changed.body.participants.map((p: { meetingConfirmed: boolean }) => p.meetingConfirmed);
      expect(confirmations.filter(Boolean)).toHaveLength(1);
    });

    it('rejects a date long past', async () => {
      await proposeMeeting(alex, new Date(Date.now() - 3 * 86_400_000), 'Parque Nariño').expect(400);
    });

    it('closes when the swap is cancelled, and stays closed while a route waits for answers', async () => {
      await testApp.http().post(`/api/v1/routes/${swap.id}/cancel`).set(authed(alex.token)).expect(200);
      await send(alex, { body: 'Hola' }).expect(409);

      const pending = await proposeCycle();
      await testApp
        .http()
        .post(`/api/v1/routes/${pending.id}/messages`)
        .set(authed(alex.token))
        .send({ body: 'Hola' })
        .expect(409);
      await testApp.http().post(`/api/v1/routes/${pending.id}/cancel`).set(authed(alex.token)).expect(200);
    });
  });

  describe('closing', () => {
    const HOUR = 60 * 60 * 1000;
    const previousDays = process.env.SWAP_HANDOFF_DAYS;

    beforeAll(() => {
      // Demo setting: a swap completes as soon as its agreed date has passed
      process.env.SWAP_HANDOFF_DAYS = '0';
    });

    afterAll(() => {
      if (previousDays === undefined) delete process.env.SWAP_HANDOFF_DAYS;
      else process.env.SWAP_HANDOFF_DAYS = previousDays;
    });

    /** A confirmed swap whose date (an hour ago) and place everyone agreed, with one message. */
    const agreedSwap = async (): Promise<RouteBody> => {
      const swap = await confirmedSwap();
      await testApp
        .http()
        .post(`/api/v1/routes/${swap.id}/messages`)
        .set(authed(alex.token))
        .send({ body: 'Listo, nos vemos' })
        .expect(201);
      await testApp
        .http()
        .post(`/api/v1/routes/${swap.id}/meeting`)
        .set(authed(alex.token))
        .send({ at: new Date(Date.now() - HOUR).toISOString(), place: 'Parque Nariño' })
        .expect(200);
      await testApp.http().post(`/api/v1/routes/${swap.id}/meeting/confirm`).set(authed(valeria.token)).expect(200);
      const agreed = await testApp
        .http()
        .post(`/api/v1/routes/${swap.id}/meeting/confirm`)
        .set(authed(mateo.token))
        .expect(200);
      expect(agreed.body.handoffDays).toBe(0);
      return swap;
    };

    const tradesOf = (user: RegisteredUser) =>
      testApp.prisma.rows('user').find((row) => row.id === user.id)?.tradesCompleted as number;

    it('completes by itself on read once the handoff period is over, and deletes the chat', async () => {
      const before = tradesOf(valeria);
      const swap = await agreedSwap();

      const list = await testApp.http().get('/api/v1/routes').set(authed(valeria.token)).expect(200);
      expect((list.body as RouteBody[]).find((route) => route.id === swap.id)?.status).toBe('COMPLETED');
      expect(itemStatuses()).toEqual(['SWAPPED', 'SWAPPED', 'SWAPPED']);
      expect(tradesOf(valeria)).toBe(before + 1);
      expect(testApp.prisma.rows('swapMessage').filter((m) => m.routeId === swap.id)).toHaveLength(0);
      expect(testApp.prisma.rows('swapRoute').find((r) => r.id === swap.id)?.completedAt).toBeInstanceOf(Date);

      const mine = await testApp.http().get('/api/v1/items/mine').set(authed(alex.token)).expect(200);
      const bike = (mine.body.items ?? mine.body).find((item: { id: string }) => item.id === itemIds.bikeId);
      expect(bike.status).toBe('SWAPPED');

      // Read again: completed once, counted once
      await testApp.http().get(`/api/v1/routes/${swap.id}/handoff`).set(authed(mateo.token)).expect(200);
      expect(tradesOf(valeria)).toBe(before + 1);

      // The items go back to the catalog for the next test
      for (const id of Object.values(itemIds)) {
        const row = testApp.prisma.rows('item').find((item) => item.id === id);
        if (row) row.status = 'AVAILABLE';
      }
    });

    it('does not complete by itself after someone reports a problem, but everyone can still complete it', async () => {
      const swap = await agreedSwap();

      const reported = await testApp
        .http()
        .post(`/api/v1/routes/${swap.id}/report-problem`)
        .set(authed(mateo.token))
        .send({ reason: 'La guitarra llegó sin funda' })
        .expect(200);
      expect(reported.body.problem).toEqual(expect.objectContaining({ reportedById: mateo.id }));
      expect(reported.body.autoCompleteAt).toBeNull();

      const handoff = await testApp.http().get(`/api/v1/routes/${swap.id}/handoff`).set(authed(alex.token)).expect(200);
      expect(handoff.body.status).toBe('CONFIRMED');
      expect(itemStatuses()).toEqual(['RESERVED', 'RESERVED', 'RESERVED']);

      // "Complete swap" closes it early only when everyone confirms
      const first = await testApp.http().post(`/api/v1/routes/${swap.id}/complete`).set(authed(alex.token)).expect(200);
      expect(first.body.status).toBe('CONFIRMED');
      await testApp.http().post(`/api/v1/routes/${swap.id}/complete`).set(authed(valeria.token)).expect(200);
      const last = await testApp.http().post(`/api/v1/routes/${swap.id}/complete`).set(authed(mateo.token)).expect(200);
      expect(last.body.status).toBe('COMPLETED');
      expect(itemStatuses()).toEqual(['SWAPPED', 'SWAPPED', 'SWAPPED']);
      expect(testApp.prisma.rows('swapMessage').filter((m) => m.routeId === swap.id)).toHaveLength(0);
      expect(testApp.prisma.rows('swapRoute').find((r) => r.id === swap.id)?.status).toBe('COMPLETED');
    });
  });
});
