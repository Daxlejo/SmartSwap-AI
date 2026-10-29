import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AiEmbeddingService,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from './services/ai-embedding.service';
import { AiExplainerService } from './services/ai-explainer.service';
import { AiVisionService } from './services/ai-vision.service';
import { OpenAiClientService } from './services/openai-client.service';

describe('AI Module Services (Vision, Embeddings, Route Explainer)', () => {
  let openAiClient: OpenAiClientService;
  let visionService: AiVisionService;
  let embeddingService: AiEmbeddingService;
  let explainerService: AiExplainerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string): string | undefined => {
              if (key === 'OPENAI_API_KEY') {
                return 'sk-proj-temporal-placeholder-key';
              }
              return undefined;
            }),
          },
        },
        OpenAiClientService,
        AiVisionService,
        AiEmbeddingService,
        AiExplainerService,
      ],
    }).compile();

    openAiClient = module.get<OpenAiClientService>(OpenAiClientService);
    visionService = module.get<AiVisionService>(AiVisionService);
    embeddingService = module.get<AiEmbeddingService>(AiEmbeddingService);
    explainerService = module.get<AiExplainerService>(AiExplainerService);
  });

  describe('cosineSimilarity math utility', () => {
    it('returns 1 for identical non-zero vectors', () => {
      const vec = [0.6, 0.8, 0.0, 0.5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
      expect(embeddingService.cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0, 0];
      const vecB = [0, 1, 0, 0];
      expect(cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it('returns -1 for opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1, 5);
    });

    it('safely handles zero vectors, empty arrays, and mismatched lengths', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 0, 5, 9], [1, 0])).toBeCloseTo(1, 5);
    });
  });

  describe('AiEmbeddingService', () => {
    it('generates a deterministic 64-dimensional normalized vector in fallback mode', async () => {
      expect(openAiClient.isApiKeyConfigured()).toBe(false);

      const vecA = await embeddingService.generateEmbedding(
        'Guitarra acústica Fender FA-125 en excelente estado',
      );
      const vecB = await embeddingService.generateEmbedding(
        'Guitarra acústica Fender FA-125 en excelente estado',
      );

      expect(vecA).toHaveLength(EMBEDDING_DIMENSIONS);
      expect(vecA).toEqual(vecB);
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1, 5);
    });

    it('scores semantically related items higher than unrelated items', async () => {
      const guitarOffer = await embeddingService.generateEmbedding(
        'Guitarra acústica Fender música cuerdas',
      );
      const guitarWant = await embeddingService.generateEmbedding(
        'Busco guitarra acústica o instrumento musical',
      );
      const bicycleOffer = await embeddingService.generateEmbedding(
        'Bicicleta de montaña Trek ciclismo deporte',
      );

      const relatedSim = cosineSimilarity(guitarOffer, guitarWant);
      const unrelatedSim = cosineSimilarity(guitarOffer, bicycleOffer);

      expect(relatedSim).toBeGreaterThan(0.6);
      expect(relatedSim).toBeGreaterThan(unrelatedSim);
    });
  });

  describe('AiVisionService', () => {
    it('returns structured catalog metadata and falls back gracefully when OpenAI key is offline', async () => {
      const result = await visionService.analyzePhoto({
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
        hintText: 'Guitarra Fender FA-125',
        locale: 'es',
      });

      expect(result.source).toBe('fallback');
      expect(result.name).toBe('Guitarra Fender FA-125');
      expect(result.category).toBe('Música');
      expect(['LIKE_NEW', 'EXCELLENT', 'GOOD', 'FOR_PARTS']).toContain(
        result.condition,
      );
      expect(['Como nuevo', 'Excelente', 'Bueno', 'Para piezas']).toContain(
        result.conditionLabel,
      );
      expect(result.estimatedValue).toBeGreaterThan(0);
      expect(result.minValue).toBeLessThanOrEqual(result.estimatedValue);
      expect(result.maxValue).toBeGreaterThanOrEqual(result.estimatedValue);
      expect(Array.isArray(result.aiTags)).toBe(true);
      expect(result.aiTags.length).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestedWants)).toBe(true);
      expect(result.suggestedWants.length).toBeGreaterThan(0);
    });

    it('writes the fallback name, description and wants in English while keeping Spanish categories', async () => {
      const result = await visionService.analyzePhoto({
        hintText: 'Guitarra Fender FA-125',
        locale: 'en',
      });

      expect(result.source).toBe('fallback');
      expect(result.category).toBe('Música');
      expect(result.description).toContain('Musical instrument');
      expect(result.suggestedWants).toContain('USB audio interface');
    });

    it('prices items in whole Colombian pesos rounded to the nearest 10,000', async () => {
      const estimate = await visionService.estimateValue({
        name: 'MacBook Air M1',
        category: 'Tecnología',
        condition: 'LIKE_NEW',
        description: 'Portátil de 13 pulgadas',
      });

      expect(estimate.estimatedValue).toBeGreaterThanOrEqual(1_000_000);
      expect(estimate.estimatedValue % 10_000).toBe(0);
      expect(estimate.minValue % 10_000).toBe(0);
      expect(estimate.maxValue % 10_000).toBe(0);
      expect(estimate.minValue).toBeLessThan(estimate.estimatedValue);
      expect(estimate.maxValue).toBeGreaterThan(estimate.estimatedValue);
    });

    it('estimates item value based on condition multiplier', async () => {
      const likeNewEstimate = await visionService.estimateValue({
        name: 'MacBook Air M1',
        category: 'Tecnología',
        condition: 'LIKE_NEW',
        description: 'Portátil de 13 pulgadas con 8GB RAM y 256GB SSD',
      });

      const forPartsEstimate = await visionService.estimateValue({
        name: 'MacBook Air M1',
        category: 'Tecnología',
        condition: 'FOR_PARTS',
        description: 'Portátil para repuestos',
      });

      expect(likeNewEstimate.source).toBe('fallback');
      expect(likeNewEstimate.conditionLabel).toBe('Como nuevo');
      expect(forPartsEstimate.conditionLabel).toBe('Para piezas');
      expect(likeNewEstimate.estimatedValue).toBeGreaterThan(
        forPartsEstimate.estimatedValue,
      );
    });
  });

  describe('AiExplainerService', () => {
    it('generates a 2-sentence Spanish explanation and fairnessScore for a multi-party circular route', async () => {
      const result = await explainerService.explainSwapRoute({
        objectiveText: 'Monitor UltraWide 34 pulgadas',
        steps: [
          {
            userName: 'Carlos Mendoza',
            givesItemName: 'Cámara Sony Alpha a6000',
            givesItemValue: 320,
            receivesItemName: 'Monitor LG UltraWide 34"',
            receivesItemValue: 310,
          },
          {
            userName: 'Elena Rostova',
            givesItemName: 'Bicicleta Urbana Trek FX',
            givesItemValue: 295,
            receivesItemName: 'Cámara Sony Alpha a6000',
            receivesItemValue: 320,
          },
          {
            userName: 'Mateo Silva',
            givesItemName: 'Monitor LG UltraWide 34"',
            givesItemValue: 310,
            receivesItemName: 'Bicicleta Urbana Trek FX',
            receivesItemValue: 295,
          },
        ],
      });

      expect(result.source).toBe('fallback');
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation).toContain('Carlos Mendoza');
      expect(result.explanation).toContain('CO₂');
      expect(result.fairnessScore).toBeGreaterThanOrEqual(85);
      expect(result.fairnessScore).toBeLessThanOrEqual(100);
    });

    it('generates the explanation in English when locale is en', async () => {
      const result = await explainerService.explainSwapRoute({
        objectiveText: 'Mirrorless camera',
        locale: 'en',
        steps: [
          {
            userName: 'Alex',
            givesItemName: 'Trek bike',
            givesItemValue: 450,
            receivesItemName: 'Fujifilm camera',
            receivesItemValue: 470,
          },
          {
            userName: 'Valeria',
            givesItemName: 'Fujifilm camera',
            givesItemValue: 470,
            receivesItemName: 'Trek bike',
            receivesItemValue: 450,
          },
        ],
      });

      expect(result.source).toBe('fallback');
      expect(result.explanation).toContain('circular route');
      expect(result.explanation).toContain('CO₂ emissions');
      expect(result.explanation).not.toContain('Esta ruta');
    });
  });
});
