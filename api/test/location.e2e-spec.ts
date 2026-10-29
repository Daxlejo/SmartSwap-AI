import {
  authed,
  createTestApp,
  registerUser,
  TestApp,
} from './support/test-app';

const PASTO = '52001';
const IPIALES = '52356';
const CALI = '76001';

describe('Colombian location (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  });

  describe('geo endpoints', () => {
    it('lists the 33 departments without authentication', async () => {
      const response = await testApp
        .http()
        .get('/api/v1/geo/departments')
        .expect(200);

      expect(response.body).toHaveLength(33);
      expect(response.body).toEqual(
        expect.arrayContaining([{ code: '52', name: 'Nariño' }]),
      );
    });

    it('lists the municipalities of a department and searches by name without accents', async () => {
      const nariño = await testApp
        .http()
        .get('/api/v1/geo/municipalities?department=52')
        .expect(200);
      expect(nariño.body).toHaveLength(64);

      const popayan = await testApp
        .http()
        .get('/api/v1/geo/municipalities?q=popayan')
        .expect(200);
      expect(popayan.body[0]).toEqual(
        expect.objectContaining({ code: '19001', label: 'Popayán, Cauca' }),
      );
    });

    it('resolves a GPS position to the closest municipality and rejects positions outside Colombia', async () => {
      const pasto = await testApp
        .http()
        .get('/api/v1/geo/resolve?lat=1.2136&lon=-77.2811')
        .expect(200);
      expect(pasto.body.municipality).toEqual(
        expect.objectContaining({ code: PASTO, label: 'Pasto, Nariño' }),
      );
      expect(pasto.body.distanceKm).toBeLessThan(3);

      await testApp
        .http()
        .get('/api/v1/geo/resolve?lat=40.4&lon=-3.7')
        .expect(400);
      await testApp
        .http()
        .get('/api/v1/geo/resolve?lat=abc&lon=-77')
        .expect(400);
    });
  });

  describe('registration and profile', () => {
    it('derives the department and label from the municipality chosen at registration', async () => {
      const alex = await registerUser(testApp, 'Alex', 'ignored', PASTO);

      const me = await testApp
        .http()
        .get('/api/v1/users/me')
        .set(authed(alex.token))
        .expect(200);

      expect(me.body).toEqual(
        expect.objectContaining({
          location: 'Pasto, Nariño',
          departmentCode: '52',
          municipalityCode: PASTO,
        }),
      );
    });

    it('rejects unknown municipalities at registration', async () => {
      await testApp
        .http()
        .post('/api/v1/auth/register')
        .send({
          email: 'nobody@e2e.smartswap.co',
          password: 'E2eTestPass!2026',
          name: 'Nobody',
          municipalityCode: '99999',
        })
        .expect(400);
    });

    it('moves a user to another municipality from the profile', async () => {
      const user = await registerUser(testApp, 'Movil', undefined, PASTO);

      const updated = await testApp
        .http()
        .patch('/api/v1/users/me')
        .set(authed(user.token))
        .send({ municipalityCode: CALI })
        .expect(200);

      expect(updated.body).toEqual(
        expect.objectContaining({
          municipalityCode: CALI,
          departmentCode: '76',
        }),
      );
    });
  });

  describe('nearby catalog and route search', () => {
    const publish = async (token: string, name: string) => {
      const response = await testApp
        .http()
        .post('/api/v1/items')
        .set(authed(token))
        .send({
          name,
          category: 'Tecnología',
          description: `${name} en buen estado`,
          condition: 'GOOD',
          estimatedValue: 1_500_000,
          images: ['https://example.com/item.jpg'],
          wants: ['Cualquier cosa útil'],
        })
        .expect(201);
      return response.body as { id: string; municipalityCode: string };
    };

    let pastoItemId: string;
    let ipialesItemId: string;
    let caliItemId: string;
    let sinUbicacionToken: string;

    beforeAll(async () => {
      const pasto = await registerUser(testApp, 'Pastuso', undefined, PASTO);
      const ipiales = await registerUser(
        testApp,
        'Ipialeno',
        undefined,
        IPIALES,
      );
      const cali = await registerUser(testApp, 'Caleno', undefined, CALI);
      sinUbicacionToken = (
        await registerUser(testApp, 'SinUbicacion', 'Colombia')
      ).token;

      const pastoItem = await publish(pasto.token, 'Laptop de Pasto');
      pastoItemId = pastoItem.id;
      ipialesItemId = (await publish(ipiales.token, 'Laptop de Ipiales')).id;
      caliItemId = (await publish(cali.token, 'Laptop de Cali')).id;

      expect(pastoItem.municipalityCode).toBe(PASTO);
    });

    const listIds = async (query: string): Promise<string[]> => {
      const response = await testApp
        .http()
        .get(`/api/v1/items?${query}`)
        .expect(200);
      return (response.body as Array<{ id: string }>).map((item) => item.id);
    };

    it('shows only items within the radius, nearest first, with distances', async () => {
      const response = await testApp
        .http()
        .get(`/api/v1/items?scope=nearby&municipalityCode=${PASTO}&radiusKm=70`)
        .expect(200);
      const items = response.body as Array<{ id: string; distanceKm: number }>;

      expect(items.map((item) => item.id)).toEqual([
        pastoItemId,
        ipialesItemId,
      ]);
      expect(items[0].distanceKm).toBe(0);
      expect(items[1].distanceKm).toBeGreaterThan(50);
    });

    it('shows the whole department in the department scope and the country otherwise', async () => {
      const department = await listIds(
        `scope=department&municipalityCode=${PASTO}`,
      );
      expect(department).toEqual(
        expect.arrayContaining([pastoItemId, ipialesItemId]),
      );
      expect(department).not.toContain(caliItemId);

      const country = await listIds(`scope=country&municipalityCode=${PASTO}`);
      expect(country).toEqual(
        expect.arrayContaining([pastoItemId, ipialesItemId, caliItemId]),
      );
    });

    it('requires the viewer municipality for scoped listings', async () => {
      await testApp.http().get('/api/v1/items?scope=nearby').expect(400);
    });

    it('asks users without a location to set it before a scoped route search', async () => {
      const unlocated = await testApp
        .http()
        .post('/api/v1/routes/search')
        .set(authed(sinUbicacionToken))
        .send({ objectiveText: 'Laptop', scope: 'nearby' })
        .expect(400);
      expect(JSON.stringify(unlocated.body)).toContain('Set your municipality');

      const country = await testApp
        .http()
        .post('/api/v1/routes/search')
        .set(authed(sinUbicacionToken))
        .send({ objectiveText: 'Laptop', scope: 'country' })
        .expect(200);
      expect(Array.isArray(country.body)).toBe(true);
    });
  });
});
