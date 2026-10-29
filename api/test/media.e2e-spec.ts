import {
  authed,
  createTestApp,
  registerUser,
  RegisteredUser,
  TestApp,
} from './support/test-app';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]);
const jpegDataUrl = `data:image/jpeg;base64,${JPEG.toString('base64')}`;
const PUBLIC_PREFIX =
  'https://e2e.supabase.co/storage/v1/object/public/item-images/';

describe('Media: item photos and profile avatar (e2e)', () => {
  let testApp: TestApp;
  let alex: RegisteredUser;
  let fetchMock: jest.SpyInstance;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.SUPABASE_URL = 'https://e2e.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'e2e-service-key';
    testApp = await createTestApp();
    alex = await registerUser(testApp, 'Alex', 'Pasto, Nariño', '52001');
  }, 30000);

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => fetchMock.mockRestore());

  afterAll(async () => {
    process.env = { ...originalEnv };
    await testApp?.app.close();
  });

  describe('POST /items/upload-image', () => {
    it('requires authentication', async () => {
      await testApp
        .http()
        .post('/api/v1/items/upload-image')
        .send({ imageBase64: jpegDataUrl })
        .expect(401);
    });

    it('stores the photo and returns its public URL', async () => {
      const response = await testApp
        .http()
        .post('/api/v1/items/upload-image')
        .set(authed(alex.token))
        .send({ imageBase64: jpegDataUrl })
        .expect(201);

      expect(response.body.url).toContain(`${PUBLIC_PREFIX}${alex.id}/`);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects a non-image payload with 400 and never reaches storage', async () => {
      await testApp
        .http()
        .post('/api/v1/items/upload-image')
        .set(authed(alex.token))
        .send({ imageBase64: 'data:image/gif;base64,R0lGODlh' })
        .expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('answers 500 when Supabase rejects the upload so the app can show an error', async () => {
      fetchMock.mockResolvedValue(new Response('no bucket', { status: 404 }));
      await testApp
        .http()
        .post('/api/v1/items/upload-image')
        .set(authed(alex.token))
        .send({ imageBase64: jpegDataUrl })
        .expect(500);
    });
  });

  describe('POST /items with images', () => {
    const payload = (images: string[]) => ({
      name: 'Bicicleta de montaña',
      category: 'Deportes',
      description: 'Rodada 29, casi nueva',
      condition: 'EXCELLENT',
      estimatedValue: 1_200_000,
      wants: ['Cámara'],
      images,
    });

    it('keeps already-uploaded URLs as they are', async () => {
      const url = `${PUBLIC_PREFIX}${alex.id}/photo.jpg`;
      const response = await testApp
        .http()
        .post('/api/v1/items')
        .set(authed(alex.token))
        .send(payload([url]))
        .expect(201);

      expect(response.body.images).toEqual([url]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uploads inline data-URL photos and stores their public URLs', async () => {
      const response = await testApp
        .http()
        .post('/api/v1/items')
        .set(authed(alex.token))
        .send(payload([jpegDataUrl]))
        .expect(201);

      expect(response.body.images).toHaveLength(1);
      expect(response.body.images[0]).toContain(PUBLIC_PREFIX);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /users/me/avatar', () => {
    it('requires authentication', async () => {
      await testApp
        .http()
        .post('/api/v1/users/me/avatar')
        .send({ imageBase64: jpegDataUrl })
        .expect(401);
    });

    it('stores the photo under avatars/ and returns the updated profile', async () => {
      const response = await testApp
        .http()
        .post('/api/v1/users/me/avatar')
        .set(authed(alex.token))
        .send({ imageBase64: jpegDataUrl })
        .expect(201);

      expect(response.body.avatarUrl).toContain(
        `${PUBLIC_PREFIX}avatars/${alex.id}/`,
      );
      expect(response.body.passwordHash).toBeUndefined();

      const me = await testApp
        .http()
        .get('/api/v1/users/me')
        .set(authed(alex.token))
        .expect(200);
      expect(me.body.avatarUrl).toBe(response.body.avatarUrl);
    });

    it('rejects avatars larger than 2 MB with 413', async () => {
      const big = Buffer.concat([JPEG, Buffer.alloc(2 * 1024 * 1024 + 10)]);
      await testApp
        .http()
        .post('/api/v1/users/me/avatar')
        .set(authed(alex.token))
        .send({ imageBase64: `data:image/jpeg;base64,${big.toString('base64')}` })
        .expect(413);
    });

    it('rejects an invalid payload with 400', async () => {
      await testApp
        .http()
        .post('/api/v1/users/me/avatar')
        .set(authed(alex.token))
        .send({})
        .expect(400);
    });
  });
});
