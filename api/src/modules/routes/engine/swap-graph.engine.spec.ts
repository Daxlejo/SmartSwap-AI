import { Test, TestingModule } from '@nestjs/testing';
import { proposeRouteSchema } from '../dto/propose-route.dto';
import { respondRouteSchema } from '../dto/respond-route.dto';
import { searchRoutesSchema } from '../dto/search-routes.dto';
import { RouteScoringStrategy } from './route-scoring.strategy';
import {
  GraphItemNode,
  SwapGraphEngine,
} from './swap-graph.engine';

describe('SwapGraphEngine & RouteScoringStrategy', () => {
  let engine: SwapGraphEngine;
  let scoringStrategy: RouteScoringStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteScoringStrategy, SwapGraphEngine],
    }).compile();

    scoringStrategy = module.get<RouteScoringStrategy>(RouteScoringStrategy);
    engine = module.get<SwapGraphEngine>(SwapGraphEngine);
  });

  function createNode(params: {
    id: string;
    ownerId: string;
    ownerName: string;
    ownerRating?: number;
    name: string;
    category: string;
    estimatedValue: number;
    wants: Array<{
      queryText: string;
      category?: string;
      embedding?: number[];
    }>;
    embedding?: number[];
    aiTags?: string[];
    status?: string;
  }): GraphItemNode {
    return {
      id: params.id,
      ownerId: params.ownerId,
      owner: {
        id: params.ownerId,
        name: params.ownerName,
        rating: params.ownerRating ?? 4.9,
      },
      name: params.name,
      category: params.category,
      condition: 'LIKE_NEW',
      description: `${params.name} en excelente estado`,
      estimatedValue: params.estimatedValue,
      status: params.status ?? 'AVAILABLE',
      images: [`https://example.com/${params.id}.jpg`],
      aiTags: params.aiTags ?? [],
      embedding: params.embedding ?? [],
      wants: params.wants.map((w, idx) => ({
        id: `${params.id}-want-${idx}`,
        queryText: w.queryText,
        category: w.category ?? null,
        embedding: w.embedding ?? [],
      })),
    };
  }

  describe('1. Direct 2-way swap cycle detection (A ⇄ B)', () => {
    it('detects a valid 2-hop cycle between User A and User B', () => {
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a-macbook',
          ownerId: 'user-a',
          ownerName: 'Alex Rivera',
          name: 'MacBook Air M1 256GB',
          category: 'Tecnología',
          estimatedValue: 650,
          wants: [{ queryText: 'Cámara Sony Alpha' }],
        }),
        createNode({
          id: 'item-b-camera',
          ownerId: 'user-b',
          ownerName: 'Valeria Gómez',
          name: 'Cámara Sony Alpha a6400',
          category: 'Fotografía',
          estimatedValue: 680,
          wants: [{ queryText: 'MacBook Air M1' }],
        }),
      ];

      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Cámara Sony Alpha',
        catalog,
      });

      expect(cycles).toHaveLength(1);
      const cycle = cycles[0];
      expect(cycle.hops).toBe(2);
      expect(cycle.steps).toHaveLength(2);
      expect(cycle.offeredItemId).toBe('item-a-macbook');
      expect(cycle.targetItemId).toBe('item-b-camera');
      expect(cycle.co2SavedKg).toBe(4.8);
      expect(cycle.matchScore).toBeGreaterThanOrEqual(55);
      expect(cycle.matchScore).toBeLessThanOrEqual(99);

      // Step 0: Initiator (user-a) gives MacBook to user-b and receives Camera
      expect(cycle.steps[0].stepOrder).toBe(0);
      expect(cycle.steps[0].userId).toBe('user-a');
      expect(cycle.steps[0].givesItemId).toBe('item-a-macbook');
      expect(cycle.steps[0].recipientUserId).toBe('user-b');
      expect(cycle.steps[0].receivesItemId).toBe('item-b-camera');

      // Step 1: User B gives Camera to user-a and receives MacBook
      expect(cycle.steps[1].stepOrder).toBe(1);
      expect(cycle.steps[1].userId).toBe('user-b');
      expect(cycle.steps[1].givesItemId).toBe('item-b-camera');
      expect(cycle.steps[1].recipientUserId).toBe('user-a');
      expect(cycle.steps[1].receivesItemId).toBe('item-a-macbook');
    });
  });

  describe('2. Triangular 3-way swap cycle detection (A → B → C → A)', () => {
    it('finds a 3-hop cycle when no direct 2-way swap exists', () => {
      // User A has MacBook, wants Monitor Ultrawide (owned by User C)
      // User B has Cámara Sony, wants MacBook (from User A)
      // User C has Monitor Ultrawide, wants Cámara Sony (from User B)
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a-macbook',
          ownerId: 'user-a',
          ownerName: 'Alex Rivera',
          name: 'MacBook Air M1',
          category: 'Tecnología',
          estimatedValue: 650,
          wants: [{ queryText: 'Monitor Ultrawide LG' }],
        }),
        createNode({
          id: 'item-b-camera',
          ownerId: 'user-b',
          ownerName: 'Valeria Gómez',
          name: 'Cámara Sony Alpha a6400',
          category: 'Fotografía',
          estimatedValue: 670,
          wants: [{ queryText: 'MacBook Air M1' }],
        }),
        createNode({
          id: 'item-c-monitor',
          ownerId: 'user-c',
          ownerName: 'Camila Torres',
          name: 'Monitor Ultrawide LG 34 WQHD',
          category: 'Tecnología',
          estimatedValue: 640,
          wants: [{ queryText: 'Cámara Sony Alpha' }],
        }),
      ];

      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Monitor Ultrawide LG',
        catalog,
      });

      expect(cycles).toHaveLength(1);
      const cycle = cycles[0];
      expect(cycle.hops).toBe(3);
      expect(cycle.steps).toHaveLength(3);
      expect(cycle.co2SavedKg).toBe(7.2);

      // Verify cycle order: user-a -> user-b -> user-c -> user-a
      expect(cycle.steps.map((s) => s.userId)).toEqual([
        'user-a',
        'user-b',
        'user-c',
      ]);
      expect(cycle.steps[0].givesItemId).toBe('item-a-macbook');
      expect(cycle.steps[0].recipientUserId).toBe('user-b');
      expect(cycle.steps[0].receivesItemId).toBe('item-c-monitor');

      expect(cycle.steps[1].givesItemId).toBe('item-b-camera');
      expect(cycle.steps[1].recipientUserId).toBe('user-c');
      expect(cycle.steps[1].receivesItemId).toBe('item-a-macbook');

      expect(cycle.steps[2].givesItemId).toBe('item-c-monitor');
      expect(cycle.steps[2].recipientUserId).toBe('user-a');
      expect(cycle.steps[2].receivesItemId).toBe('item-b-camera');
    });
  });

  describe('3. Quadrangular 4-way swap cycle detection (A → B → C → D → A)', () => {
    it('finds a 4-hop cycle across four distinct participants', () => {
      // A (MacBook) -> B (Cámara Sony) -> C (Monitor LG) -> D (Bicicleta Gravel) -> A
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a-macbook',
          ownerId: 'user-a',
          ownerName: 'Alex Rivera',
          name: 'MacBook Air M1',
          category: 'Tecnología',
          estimatedValue: 650,
          wants: [{ queryText: 'Bicicleta Gravel Specialized' }],
        }),
        createNode({
          id: 'item-b-camera',
          ownerId: 'user-b',
          ownerName: 'Valeria Gómez',
          name: 'Cámara Sony Alpha a6400',
          category: 'Fotografía',
          estimatedValue: 680,
          wants: [{ queryText: 'MacBook Air M1' }],
        }),
        createNode({
          id: 'item-c-monitor',
          ownerId: 'user-c',
          ownerName: 'Camila Torres',
          name: 'Monitor Ultrawide LG 34',
          category: 'Tecnología',
          estimatedValue: 640,
          wants: [{ queryText: 'Cámara Sony Alpha' }],
        }),
        createNode({
          id: 'item-d-bike',
          ownerId: 'user-d',
          ownerName: 'Mateo Vargas',
          name: 'Bicicleta Gravel Specialized Diverge',
          category: 'Deportes',
          estimatedValue: 690,
          wants: [{ queryText: 'Monitor Ultrawide LG' }],
        }),
      ];

      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Bicicleta Gravel Specialized',
        maxSteps: 4,
        catalog,
      });

      expect(cycles).toHaveLength(1);
      const cycle = cycles[0];
      expect(cycle.hops).toBe(4);
      expect(cycle.steps).toHaveLength(4);
      expect(cycle.co2SavedKg).toBe(9.6);
      expect(cycle.steps.map((s) => s.userId)).toEqual([
        'user-a',
        'user-b',
        'user-c',
        'user-d',
      ]);
      expect(cycle.steps[3].givesItemId).toBe('item-d-bike');
      expect(cycle.steps[3].recipientUserId).toBe('user-a');
      expect(cycle.steps[0].receivesItemId).toBe('item-d-bike');
    });
  });

  describe('4. Value tolerance rejection when prices are wildly unbalanced', () => {
    it('rejects cycles where estimatedValue difference exceeds valueTolerancePct', () => {
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a-book',
          ownerId: 'user-a',
          ownerName: 'Alex Rivera',
          name: 'Libro de Cálculo Universitario',
          category: 'Libros',
          estimatedValue: 25,
          wants: [{ queryText: 'MacBook Pro M3 Max' }],
        }),
        createNode({
          id: 'item-b-macbook-pro',
          ownerId: 'user-b',
          ownerName: 'Valeria Gómez',
          name: 'MacBook Pro M3 Max 64GB',
          category: 'Tecnología',
          estimatedValue: 2400,
          wants: [{ queryText: 'Libro de Cálculo Universitario' }],
        }),
      ];

      // Relative diff is (2400 - 25) / 2400 = 98.95% > 45% default tolerance
      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'MacBook Pro M3 Max',
        valueTolerancePct: 45,
        catalog,
      });

      expect(cycles).toHaveLength(0);
    });

    it('respects stricter custom valueTolerancePct thresholds', () => {
      // 650 vs 500 -> relative diff = 150 / 650 = 23.07%
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a',
          ownerId: 'user-a',
          ownerName: 'User A',
          name: 'iPad Air M1',
          category: 'Tecnología',
          estimatedValue: 650,
          wants: [{ queryText: 'Guitarra Fender' }],
        }),
        createNode({
          id: 'item-b',
          ownerId: 'user-b',
          ownerName: 'User B',
          name: 'Guitarra Fender Stratocaster',
          category: 'Música',
          estimatedValue: 500,
          wants: [{ queryText: 'iPad Air M1' }],
        }),
      ];

      // Rejected at 15% tolerance
      const strictResult = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Guitarra Fender',
        valueTolerancePct: 15,
        catalog,
      });
      expect(strictResult).toHaveLength(0);

      // Accepted at 30% tolerance
      const relaxedResult = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Guitarra Fender',
        valueTolerancePct: 30,
        catalog,
      });
      expect(relaxedResult).toHaveLength(1);
    });
  });

  describe('5. Cycle ranking by matchScore & semantic cosine similarity', () => {
    it('ranks shorter, higher-value-parity, higher-rated cycles above longer or unbalanced cycles', () => {
      // Initiator User A offers Guitarra Fender ($500) and wants " Teclado Sintetizador Roland "
      // Route 1 (2-hop, high parity $500 vs $500, rating 5.0): User A <-> User B (Sintetizador Roland $500)
      // Route 2 (3-hop, lower parity $500 -> $390 -> $410, rating 3.8): User A -> User C -> User D -> User A
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a-guitar',
          ownerId: 'user-a',
          ownerName: 'User A',
          ownerRating: 5.0,
          name: 'Guitarra Fender Telecaster',
          category: 'Música',
          estimatedValue: 500,
          wants: [{ queryText: 'Sintetizador Roland Juno' }],
        }),
        createNode({
          id: 'item-b-synth-direct',
          ownerId: 'user-b',
          ownerName: 'User B',
          ownerRating: 5.0,
          name: 'Sintetizador Roland Juno DS',
          category: 'Música',
          estimatedValue: 500,
          wants: [{ queryText: 'Guitarra Fender Telecaster' }],
        }),
        createNode({
          id: 'item-c-pedal',
          ownerId: 'user-c',
          ownerName: 'User C',
          ownerRating: 3.5,
          name: 'Pedalera Multiefectos Boss',
          category: 'Música',
          estimatedValue: 380,
          wants: [{ queryText: 'Guitarra Fender' }],
        }),
        createNode({
          id: 'item-d-synth-3way',
          ownerId: 'user-d',
          ownerName: 'User D',
          ownerRating: 3.5,
          name: 'Sintetizador Roland Boutique',
          category: 'Música',
          estimatedValue: 400,
          wants: [{ queryText: 'Pedalera Multiefectos Boss' }],
        }),
      ];

      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Sintetizador Roland Juno',
        valueTolerancePct: 45,
        catalog,
      });

      expect(cycles.length).toBeGreaterThanOrEqual(2);
      // Top ranked cycle must be the 2-hop high-parity cycle with User B
      expect(cycles[0].hops).toBe(2);
      expect(cycles[0].targetItemId).toBe('item-b-synth-direct');
      expect(cycles[0].matchScore).toBeGreaterThan(cycles[1].matchScore);
    });

    it('matches edges via semantic embedding cosine similarity (>= 0.42) even without lexical overlap', () => {
      const sharedSemanticVector = [0.8, 0.6, 0, 0, 0, 0, 0, 0];
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a',
          ownerId: 'user-a',
          ownerName: 'User A',
          name: 'Artículo Alfa Exclusivo',
          category: 'Especial',
          estimatedValue: 300,
          embedding: sharedSemanticVector,
          wants: [
            {
              queryText: 'Objetivo Semántico Beta',
              embedding: [0, 0, 0.8, 0.6, 0, 0, 0, 0],
            },
          ],
        }),
        createNode({
          id: 'item-b',
          ownerId: 'user-b',
          ownerName: 'User B',
          name: 'Pieza Colección Omega',
          category: 'Colección',
          estimatedValue: 310,
          embedding: [0, 0, 0.8, 0.6, 0, 0, 0, 0],
          wants: [
            {
              queryText: 'Deseo Vectorial',
              embedding: sharedSemanticVector,
            },
          ],
        }),
      ];

      const cycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Consulta sin palabras comunes',
        objectiveEmbedding: [0, 0, 0.8, 0.6, 0, 0, 0, 0],
        catalog,
      });

      expect(cycles).toHaveLength(1);
      expect(cycles[0].hops).toBe(2);
      expect(cycles[0].targetItemId).toBe('item-b');
    });

    it('validates DTO schemas with Zod rules', () => {
      const validSearch = searchRoutesSchema.parse({
        objectiveText: 'Bicicleta Gravel',
      });
      expect(validSearch.maxSteps).toBe(4);
      expect(validSearch.valueTolerancePct).toBe(45);

      const validPropose = proposeRouteSchema.parse({
        objectiveText: 'Bicicleta Gravel',
        matchScore: 91,
        steps: [
          {
            stepOrder: 0,
            userId: 'user-a',
            givesItemId: 'item-a',
            receivesItemId: 'item-b',
          },
          {
            stepOrder: 1,
            userId: 'user-b',
            givesItemId: 'item-b',
            receivesItemId: 'item-a',
          },
        ],
      });
      expect(validPropose.steps).toHaveLength(2);

      const validRespond = respondRouteSchema.parse({
        decision: 'ACCEPTED',
        comment: 'Excelente propuesta de intercambio',
      });
      expect(validRespond.decision).toBe('ACCEPTED');
      expect(scoringStrategy.computeCo2SavedKg(3)).toBe(7.2);
    });

    it('enforces distinct participant users per cycle and supports multi-item initiator filtering', () => {
      const catalog: GraphItemNode[] = [
        createNode({
          id: 'item-a1-console',
          ownerId: 'user-a',
          ownerName: 'User A',
          name: 'Nintendo Switch OLED',
          category: 'Videojuegos',
          estimatedValue: 320,
          wants: [{ queryText: 'Audífonos Sony WH-1000XM5' }],
        }),
        createNode({
          id: 'item-a2-watch',
          ownerId: 'user-a',
          ownerName: 'User A',
          name: 'Reloj Garmin Forerunner',
          category: 'Deportes',
          estimatedValue: 310,
          wants: [{ queryText: 'Audífonos Sony WH-1000XM5' }],
        }),
        createNode({
          id: 'item-b1-tablet',
          ownerId: 'user-b',
          ownerName: 'User B',
          name: 'Tablet iPad 10ma Gen',
          category: 'Tecnología',
          estimatedValue: 330,
          wants: [{ queryText: 'Nintendo Switch OLED' }],
        }),
        createNode({
          id: 'item-b2-headphones',
          ownerId: 'user-b',
          ownerName: 'User B',
          name: 'Audífonos Sony WH-1000XM5',
          category: 'Audio',
          estimatedValue: 325,
          // User B's second item wants User B's first item — must NEVER form a cycle where user-b appears twice
          wants: [
            { queryText: 'Tablet iPad 10ma Gen' },
            { queryText: 'Reloj Garmin Forerunner' },
          ],
        }),
      ];

      const allInitiatorCycles = engine.findCycles({
        initiatorUserId: 'user-a',
        objectiveText: 'Audífonos Sony WH-1000XM5',
        catalog,
      });

      // Only the valid 2-hop cycle (item-a2-watch <-> item-b2-headphones) is allowed;
      // the 3-hop path (user-a -> user-b[item-b1] -> user-b[item-b2] -> user-a) is rejected because user-b would appear twice
      expect(allInitiatorCycles).toHaveLength(1);
      expect(allInitiatorCycles[0].offeredItemId).toBe('item-a2-watch');
      expect(allInitiatorCycles[0].steps.map((s) => s.userId)).toEqual([
        'user-a',
        'user-b',
      ]);

      // Filtering by offeredItemId = item-a1-console returns 0 cycles since user-b cannot appear twice
      const filteredCycles = engine.findCycles({
        initiatorUserId: 'user-a',
        offeredItemId: 'item-a1-console',
        objectiveText: 'Audífonos Sony WH-1000XM5',
        catalog,
      });
      expect(filteredCycles).toHaveLength(0);
    });
  });
});
