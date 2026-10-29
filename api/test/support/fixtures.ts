import { authed, RegisteredUser, TestApp } from './test-app';

export interface RouteStepBody {
  stepOrder: number;
  userId: string;
  givesItemId: string;
  receivesItemId: string;
}

export interface RouteBody {
  id: string;
  code: string;
  status: string;
  matchScore: number;
  objectiveText: string;
  aiExplanation: string | null;
  steps: RouteStepBody[];
}

/**
 * Three people whose items and wants close a 3-hop cycle:
 * Alex (bike) wants a camera, Valeria (camera) wants a guitar, Mateo (guitar) wants a bike.
 */
export const publishCycleItems = async (
  testApp: TestApp,
  users: {
    alex: RegisteredUser;
    valeria: RegisteredUser;
    mateo: RegisteredUser;
  },
) => {
  const publish = async (
    user: RegisteredUser,
    item: {
      name: string;
      category: string;
      description: string;
      wants: string[];
    },
  ): Promise<string> => {
    const response = await testApp
      .http()
      .post('/api/v1/items')
      .set(authed(user.token))
      .send({
        ...item,
        condition: 'EXCELLENT',
        estimatedValue: 1_800_000,
        images: ['https://example.com/item.jpg'],
      })
      .expect(201);
    return response.body.id;
  };

  const bikeId = await publish(users.alex, {
    name: 'Bicicleta Trek Marlin 7',
    category: 'Deportes',
    description: 'Bicicleta de montaña rodado 29 en excelente estado',
    wants: ['Cámara Fujifilm X-T30'],
  });
  const cameraId = await publish(users.valeria, {
    name: 'Cámara Fujifilm X-T30',
    category: 'Fotografía',
    description: 'Cámara mirrorless con lente 15-45mm',
    wants: ['Guitarra Fender acústica'],
  });
  const guitarId = await publish(users.mateo, {
    name: 'Guitarra Fender acústica',
    category: 'Música',
    description: 'Guitarra acústica Fender con funda',
    wants: ['Bicicleta Trek Marlin 7'],
  });

  return { bikeId, cameraId, guitarId };
};
