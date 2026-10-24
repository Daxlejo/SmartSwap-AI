import { Injectable } from '@nestjs/common';
import { OpenAiClientService } from './openai-client.service';

export const EMBEDDING_DIMENSIONS = 64;

interface SemanticCluster {
  dimensionIndex: number;
  keywords: string[];
}

const SEMANTIC_CLUSTERS: SemanticCluster[] = [
  {
    dimensionIndex: 0,
    keywords: [
      'guitarra',
      'fender',
      'yamaha',
      'acustica',
      'electrica',
      'bajo',
      'ukelele',
      'cuerdas',
      'instrumento',
      'musica',
      'musical',
      'pedal',
      'amplificador',
    ],
  },
  {
    dimensionIndex: 1,
    keywords: [
      'laptop',
      'macbook',
      'portatil',
      'computador',
      'computadora',
      'pc',
      'notebook',
      'thinkpad',
      'dell',
      'asus',
      'lenovo',
      'hp',
      'programacion',
      'desarrollo',
    ],
  },
  {
    dimensionIndex: 2,
    keywords: [
      'monitor',
      'pantalla',
      'display',
      'ultrawide',
      '4k',
      'ips',
      '144hz',
      'lg',
      'samsung',
      'escritorio',
      'setup',
    ],
  },
  {
    dimensionIndex: 3,
    keywords: [
      'camara',
      'fotografia',
      'foto',
      'video',
      'lente',
      'mirrorless',
      'dslr',
      'sony',
      'canon',
      'nikon',
      'fujifilm',
      'tripode',
      'gimbal',
    ],
  },
  {
    dimensionIndex: 4,
    keywords: [
      'bicicleta',
      'bici',
      'ciclismo',
      'mtb',
      'ruta',
      'urbana',
      'trek',
      'specialized',
      'giant',
      'scooter',
      'patineta',
      'casco',
      'deporte',
      'deportes',
    ],
  },
  {
    dimensionIndex: 5,
    keywords: [
      'audifonos',
      'auriculares',
      'airpods',
      'headset',
      'bluetooth',
      'anc',
      'sonido',
      'audio',
      'parlante',
      'bocina',
      'microfono',
      'interfaz',
      'estudio',
    ],
  },
  {
    dimensionIndex: 6,
    keywords: [
      'consola',
      'nintendo',
      'switch',
      'playstation',
      'ps5',
      'ps4',
      'xbox',
      'videojuego',
      'videojuegos',
      'gaming',
      'gamer',
      'control',
      'mando',
    ],
  },
  {
    dimensionIndex: 7,
    keywords: [
      'tablet',
      'ipad',
      'kindle',
      'ebook',
      'lector',
      'apple',
      'pencil',
      'celular',
      'smartphone',
      'iphone',
      'galaxy',
    ],
  },
  {
    dimensionIndex: 8,
    keywords: [
      'reloj',
      'smartwatch',
      'garmin',
      'watch',
      'pulsera',
      'fitness',
      'gps',
      'cronografo',
    ],
  },
  {
    dimensionIndex: 9,
    keywords: [
      'libro',
      'libros',
      'lectura',
      'novela',
      'universidad',
      'calculo',
      'ingenieria',
      'arquitectura',
      'silla',
      'ergonomica',
      'teclado',
      'mecanico',
    ],
  },
];

/**
 * Pure math utility that computes the cosine similarity between two numeric vectors.
 * Safely handles empty arrays, zero vectors, and length mismatches.
 * Returns a score clamped to [-1, 1] (or 0 when either vector has zero magnitude).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    return 0;
  }

  const length = Math.min(vecA.length, vecB.length);
  if (length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    const a = Number.isFinite(vecA[i]) ? vecA[i] : 0;
    const b = Number.isFinite(vecB[i]) ? vecB[i] : 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return 0;
  }

  const rawSimilarity = dotProduct / denominator;
  return Math.max(-1, Math.min(1, Number(rawSimilarity.toFixed(6))));
}

@Injectable()
export class AiEmbeddingService {
  constructor(private readonly openAiClient: OpenAiClientService) {}

  /**
   * Generates a 64-dimensional semantic embedding vector for the given text.
   * Uses OpenAI `text-embedding-3-small` when a live API key is available, or a deterministic
   * normalized 64-d semantic hash vector when offline or using a placeholder key.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const normalizedInput = (text ?? '').trim();
    if (normalizedInput.length === 0) {
      return new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    }

    const remoteEmbedding = await this.openAiClient.createEmbedding(
      normalizedInput,
      EMBEDDING_DIMENSIONS,
    );

    if (remoteEmbedding && remoteEmbedding.length > 0) {
      return this.normalizeVector(remoteEmbedding);
    }

    return this.buildDeterministicSemanticEmbedding(normalizedInput);
  }

  /**
   * Pure math utility wrapper exposing cosine similarity between two vectors.
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    return cosineSimilarity(vecA, vecB);
  }

  /**
   * Produces a deterministic, L2-normalized 64-dimensional semantic embedding.
   * Combines domain-cluster activations (dimensions 0..19) with token/trigram projections (dimensions 20..63).
   */
  private buildDeterministicSemanticEmbedding(text: string): number[] {
    const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    const cleaned = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

    const tokens = cleaned
      .split(/\s+/)
      .filter((token) => token.length >= 2);

    if (tokens.length === 0) {
      vector[0] = 1;
      return vector;
    }

    // 1. Domain semantic clusters (strong signal across dimensions 0..19)
    for (const cluster of SEMANTIC_CLUSTERS) {
      let clusterHits = 0;
      for (const kw of cluster.keywords) {
        if (cleaned.includes(kw)) {
          clusterHits += 1;
        }
      }
      if (clusterHits > 0) {
        const primaryIdx = cluster.dimensionIndex * 2;
        const secondaryIdx = primaryIdx + 1;
        vector[primaryIdx] += 2.5 * Math.min(3, clusterHits);
        vector[secondaryIdx] += 1.75 * Math.sqrt(clusterHits);
      }
    }

    // 2. Token & character 3-gram hashing across dimensions 20..63
    const hashSpan = EMBEDDING_DIMENSIONS - 20;
    for (const token of tokens) {
      const tokenHash = this.fnv1aHash(token);
      const bucket = 20 + (tokenHash % hashSpan);
      const sign = (tokenHash & 1) === 0 ? 1 : -1;
      vector[bucket] += sign * 1.0;

      for (let i = 0; i <= token.length - 3; i++) {
        const trigram = token.slice(i, i + 3);
        const triHash = this.fnv1aHash(trigram);
        const triBucket = 20 + (triHash % hashSpan);
        vector[triBucket] += 0.45;
      }
    }

    return this.normalizeVector(vector);
  }

  private fnv1aHash(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private normalizeVector(vec: number[]): number[] {
    let sumSquares = 0;
    for (const val of vec) {
      sumSquares += val * val;
    }

    const magnitude = Math.sqrt(sumSquares);
    if (magnitude === 0 || !Number.isFinite(magnitude)) {
      return vec.map(() => 0);
    }

    return vec.map((val) => Number((val / magnitude).toFixed(6)));
  }
}
