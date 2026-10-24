import { Injectable } from '@nestjs/common';
import { cosineSimilarity } from '../../ai/services/ai-embedding.service';

export const SEMANTIC_SIMILARITY_THRESHOLD = 0.42;
export const DEFAULT_VALUE_TOLERANCE_PCT = 45;
export const CO2_KG_PER_STEP = 2.4;

export interface GraphWantNode {
  id?: string;
  queryText: string;
  category?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  embedding?: number[];
}

export interface GraphOwnerInfo {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string | null;
  location?: string | null;
  level?: number;
  rating: number;
  tradesCompleted?: number;
  co2SavedKg?: number;
}

export interface GraphItemNode {
  id: string;
  ownerId: string;
  owner: GraphOwnerInfo;
  name: string;
  category: string;
  condition?: string;
  description?: string | null;
  estimatedValue: number;
  location?: string | null;
  status?: string;
  images?: string[];
  aiTags?: string[];
  embedding?: number[];
  wants: GraphWantNode[];
}

export interface WantMatchEvaluation {
  matches: boolean;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  matchedBy: 'LEXICAL' | 'SEMANTIC' | 'BOTH' | 'NONE';
}

export interface EvaluateEdgeOptions {
  valueTolerancePct?: number;
  targetWantsOverride?: GraphWantNode[];
  desiredCategory?: string;
}

export interface EdgeEvaluationResult {
  matches: boolean;
  matchScore: number;
  lexicalScore: number;
  semanticScore: number;
  valueParityScore: number;
  matchedWantText?: string;
  reason:
    | 'MATCHED'
    | 'SAME_OWNER'
    | 'VALUE_OUT_OF_TOLERANCE'
    | 'NO_WANT_MATCH';
}

export interface CycleScoreInput {
  edgeMatchScores: number[];
  stepValueParities: number[];
  participantRatings: number[];
  stepsCount: number;
}

const STOP_WORDS = new Set<string>([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'en',
  'con',
  'por',
  'para',
  'sin',
  'sobre',
  'entre',
  'o',
  'u',
  'y',
  'e',
  'que',
  'mi',
  'mis',
  'tu',
  'tus',
  'su',
  'sus',
  'busco',
  'quiero',
  'necesito',
  'cambio',
  'intercambio',
  'trueque',
  'cualquier',
  'algo',
  'buen',
  'buena',
  'bueno',
  'estado',
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'for',
  'with',
  'to',
  'from',
  'or',
  'and',
  'want',
  'looking',
  'need',
  'swap',
  'trade',
  'any',
  'good',
  'condition',
]);

/**
 * Bilingual Spanish/English lexical synonym map that normalizes equivalent item terms
 * to a canonical token without conflating distinct product types.
 */
const BILINGUAL_SYNONYMS: Record<string, string> = {
  portatil: 'laptop',
  portatiles: 'laptop',
  notebook: 'laptop',
  notebooks: 'laptop',
  computador: 'computadora',
  computer: 'computadora',
  ordenador: 'computadora',
  bici: 'bicicleta',
  bicis: 'bicicleta',
  bike: 'bicicleta',
  bikes: 'bicicleta',
  bicycle: 'bicicleta',
  bicycles: 'bicicleta',
  ciclismo: 'bicicleta',
  cycling: 'bicicleta',
  camera: 'camara',
  cameras: 'camara',
  photography: 'fotografia',
  photo: 'foto',
  screen: 'monitor',
  pantalla: 'monitor',
  display: 'monitor',
  console: 'consola',
  videogame: 'videojuego',
  videogames: 'videojuego',
  gaming: 'videojuego',
  gamer: 'videojuego',
  guitar: 'guitarra',
  guitars: 'guitarra',
  music: 'musica',
  musical: 'musica',
  instrument: 'instrumento',
  instruments: 'instrumento',
  headphones: 'audifono',
  headphone: 'audifono',
  headset: 'audifono',
  auricular: 'audifono',
  auriculares: 'audifono',
  audifonos: 'audifono',
  earbuds: 'audifono',
  speaker: 'parlante',
  speakers: 'parlante',
  bocina: 'parlante',
  phone: 'celular',
  smartphone: 'celular',
  telefono: 'celular',
  movil: 'celular',
  watch: 'reloj',
  watches: 'reloj',
  book: 'libro',
  books: 'libro',
  chair: 'silla',
  keyboard: 'teclado',
  sport: 'deporte',
  sports: 'deporte',
  technology: 'tecnologia',
  tech: 'tecnologia',
};

@Injectable()
export class RouteScoringStrategy {
  /**
   * Evaluates whether a directed edge `ItemA (owned by User1) -> ItemB (owned by User2)` exists.
   *
   * `User1` gives `ItemA` to `User2` if:
   * 1. `User1 !== User2`
   * 2. Value fairness holds:
   *    `abs(ItemA.estimatedValue - ItemB.estimatedValue) / max(ItemA.estimatedValue, ItemB.estimatedValue) <= valueTolerancePct / 100`
   * 3. `User2` has at least one `Want` (or initiator `objectiveText` / `Want`) matching `ItemA` via:
   *    - Lexical/token overlap (normalized Spanish/English tokens, category match, or substring match), OR
   *    - Semantic Cosine Similarity (`cosineSimilarity(want.embedding, itemA.embedding) >= 0.42`).
   */
  evaluateDirectedEdge(
    itemA: GraphItemNode,
    itemB: GraphItemNode,
    options?: EvaluateEdgeOptions,
  ): EdgeEvaluationResult {
    if (itemA.ownerId === itemB.ownerId) {
      return {
        matches: false,
        matchScore: 0,
        lexicalScore: 0,
        semanticScore: 0,
        valueParityScore: 0,
        reason: 'SAME_OWNER',
      };
    }

    const tolerancePct =
      options?.valueTolerancePct ?? DEFAULT_VALUE_TOLERANCE_PCT;

    const valueFair = this.isValueWithinTolerance(
      itemA.estimatedValue,
      itemB.estimatedValue,
      tolerancePct,
    );
    const valueParityScore = this.computeValueParity(
      itemA.estimatedValue,
      itemB.estimatedValue,
    );

    if (!valueFair) {
      return {
        matches: false,
        matchScore: 0,
        lexicalScore: 0,
        semanticScore: 0,
        valueParityScore,
        reason: 'VALUE_OUT_OF_TOLERANCE',
      };
    }

    const candidateWants: GraphWantNode[] =
      options?.targetWantsOverride && options.targetWantsOverride.length > 0
        ? options.targetWantsOverride
        : itemB.wants;

    if (!candidateWants || candidateWants.length === 0) {
      return {
        matches: false,
        matchScore: 0,
        lexicalScore: 0,
        semanticScore: 0,
        valueParityScore,
        reason: 'NO_WANT_MATCH',
      };
    }

    let bestEvaluation: WantMatchEvaluation = {
      matches: false,
      score: 0,
      lexicalScore: 0,
      semanticScore: 0,
      matchedBy: 'NONE',
    };
    let bestWantText: string | undefined;

    for (const want of candidateWants) {
      const effectiveWant: GraphWantNode =
        options?.desiredCategory && !want.category
          ? { ...want, category: options.desiredCategory }
          : want;

      const evalResult = this.evaluateWantMatch(
        itemA,
        effectiveWant,
        itemB.category,
      );

      if (
        evalResult.matches &&
        (!bestEvaluation.matches || evalResult.score > bestEvaluation.score)
      ) {
        bestEvaluation = evalResult;
        bestWantText = want.queryText;
      } else if (
        !bestEvaluation.matches &&
        evalResult.score > bestEvaluation.score
      ) {
        bestEvaluation = evalResult;
      }
    }

    if (!bestEvaluation.matches) {
      return {
        matches: false,
        matchScore: 0,
        lexicalScore: bestEvaluation.lexicalScore,
        semanticScore: bestEvaluation.semanticScore,
        valueParityScore,
        reason: 'NO_WANT_MATCH',
      };
    }

    return {
      matches: true,
      matchScore: bestEvaluation.score,
      lexicalScore: bestEvaluation.lexicalScore,
      semanticScore: bestEvaluation.semanticScore,
      valueParityScore,
      matchedWantText: bestWantText,
      reason: 'MATCHED',
    };
  }

  /**
   * Checks whether two item values satisfy the relative tolerance threshold:
   * `abs(valA - valB) / max(valA, valB) <= valueTolerancePct / 100`
   */
  isValueWithinTolerance(
    valueA: number,
    valueB: number,
    valueTolerancePct: number = DEFAULT_VALUE_TOLERANCE_PCT,
  ): boolean {
    const safeA = Math.max(0, Number.isFinite(valueA) ? valueA : 0);
    const safeB = Math.max(0, Number.isFinite(valueB) ? valueB : 0);
    const maxVal = Math.max(safeA, safeB);

    if (maxVal === 0) {
      return true;
    }

    const relativeDiff = Math.abs(safeA - safeB) / maxVal;
    const maxAllowedRatio = Math.max(0, valueTolerancePct) / 100;
    return relativeDiff <= maxAllowedRatio + 1e-9;
  }

  /**
   * Computes normalized value parity score in `[0, 1]` between two items:
   * `1 - abs(valA - valB) / max(valA, valB)`
   */
  computeValueParity(valueA: number, valueB: number): number {
    const safeA = Math.max(0, Number.isFinite(valueA) ? valueA : 0);
    const safeB = Math.max(0, Number.isFinite(valueB) ? valueB : 0);
    const maxVal = Math.max(safeA, safeB);

    if (maxVal === 0) {
      return 1;
    }

    const ratio = 1 - Math.abs(safeA - safeB) / maxVal;
    return Number(Math.max(0, Math.min(1, ratio)).toFixed(6));
  }

  /**
   * Evaluates whether a single `Want` matches `itemA` via:
   * 1. Lexical/token overlap (normalized Spanish/English tokens, category match, or substring match), OR
   * 2. Semantic Cosine Similarity (`cosineSimilarity(want.embedding, itemA.embedding) >= 0.42`).
   */
  evaluateWantMatch(
    itemA: GraphItemNode,
    want: GraphWantNode,
    ownerItemCategory?: string,
  ): WantMatchEvaluation {
    const lexicalScore = this.computeLexicalMatchScore(
      itemA,
      want,
      ownerItemCategory,
    );
    const lexicalMatched = lexicalScore > 0;

    const hasEmbeddings =
      Array.isArray(want.embedding) &&
      want.embedding.length > 0 &&
      Array.isArray(itemA.embedding) &&
      itemA.embedding.length > 0;

    const rawCosine = hasEmbeddings
      ? cosineSimilarity(want.embedding ?? [], itemA.embedding ?? [])
      : 0;
    const semanticScore = Math.max(0, Number(rawCosine.toFixed(6)));
    const semanticMatched = semanticScore >= SEMANTIC_SIMILARITY_THRESHOLD;

    const matches = lexicalMatched || semanticMatched;
    if (!matches) {
      return {
        matches: false,
        score: Number(Math.max(lexicalScore, semanticScore).toFixed(6)),
        lexicalScore,
        semanticScore,
        matchedBy: 'NONE',
      };
    }

    let combinedScore: number;
    let matchedBy: 'LEXICAL' | 'SEMANTIC' | 'BOTH';

    if (lexicalMatched && semanticMatched) {
      matchedBy = 'BOTH';
      const primary = Math.max(lexicalScore, semanticScore);
      const secondary = Math.min(lexicalScore, semanticScore);
      combinedScore = Math.min(1, primary + secondary * 0.2);
    } else if (lexicalMatched) {
      matchedBy = 'LEXICAL';
      combinedScore = lexicalScore;
    } else {
      matchedBy = 'SEMANTIC';
      combinedScore = semanticScore;
    }

    return {
      matches: true,
      score: Number(combinedScore.toFixed(6)),
      lexicalScore,
      semanticScore,
      matchedBy,
    };
  }

  /**
   * Computes the cycle `matchScore` (integer `55` to `99`):
   * - 45% Average edge semantic/lexical match score
   * - 35% Value parity across all steps in the cycle
   * - 10% Cycle compactness bonus (2-hop > 3-hop > 4-hop)
   * - 10% Average participant rating (`rating / 5.0`)
   */
  computeCycleMatchScore(input: CycleScoreInput): number {
    const avgEdgeMatch = this.average(input.edgeMatchScores, 0.75);
    const avgValueParity = this.average(input.stepValueParities, 0.8);
    const compactnessScore = this.computeCompactnessBonus(input.stepsCount);

    const normalizedRatings = input.participantRatings.map((r) => {
      const safeRating = Number.isFinite(r) ? r : 5.0;
      return Math.max(0, Math.min(5, safeRating)) / 5.0;
    });
    const avgRatingScore = this.average(normalizedRatings, 0.9);

    const weightedComposite =
      0.45 * avgEdgeMatch +
      0.35 * avgValueParity +
      0.1 * compactnessScore +
      0.1 * avgRatingScore;

    const clampedComposite = Math.max(0, Math.min(1, weightedComposite));
    const scaledScore = Math.round(55 + clampedComposite * 44);
    return Math.max(55, Math.min(99, scaledScore));
  }

  /**
   * Computes ecological impact `co2SavedKg`: `Number((steps.length * 2.4).toFixed(1))`.
   */
  computeCo2SavedKg(stepsCount: number): number {
    const safeSteps = Math.max(0, Math.floor(stepsCount));
    return Number((safeSteps * CO2_KG_PER_STEP).toFixed(1));
  }

  /**
   * Cycle compactness bonus: 2-hop (1.0) > 3-hop (0.65) > 4-hop (0.30).
   */
  computeCompactnessBonus(stepsCount: number): number {
    if (stepsCount <= 2) {
      return 1.0;
    }
    if (stepsCount === 3) {
      return 0.65;
    }
    if (stepsCount === 4) {
      return 0.3;
    }
    return 0.1;
  }

  /**
   * Normalizes text by lowercasing, stripping diacritics/accents, and removing punctuation.
   */
  normalizeText(raw: string | null | undefined): string {
    if (!raw) {
      return '';
    }
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts normalized, singularized, bilingual-mapped tokens from text.
   */
  extractTokens(raw: string | null | undefined): string[] {
    const normalized = this.normalizeText(raw);
    if (!normalized) {
      return [];
    }

    const rawTokens = normalized.split(' ');
    const tokens: string[] = [];

    for (const token of rawTokens) {
      if (token.length < 2 || STOP_WORDS.has(token)) {
        continue;
      }
      const canonical = this.canonicalizeToken(token);
      if (canonical.length >= 2 && !STOP_WORDS.has(canonical)) {
        tokens.push(canonical);
      }
    }

    return Array.from(new Set(tokens));
  }

  private canonicalizeToken(token: string): string {
    const directSynonym = BILINGUAL_SYNONYMS[token];
    if (directSynonym) {
      return directSynonym;
    }

    let singular = token;
    if (token.length > 5 && token.endsWith('es')) {
      const stem = token.slice(0, -2);
      if (BILINGUAL_SYNONYMS[stem]) {
        return BILINGUAL_SYNONYMS[stem];
      }
      if (/[bcdfghjklmnpqrstvwxyz]$/.test(stem)) {
        singular = stem;
      }
    } else if (token.length > 3 && token.endsWith('s')) {
      const stem = token.slice(0, -1);
      if (BILINGUAL_SYNONYMS[stem]) {
        return BILINGUAL_SYNONYMS[stem];
      }
      singular = stem;
    }

    return BILINGUAL_SYNONYMS[singular] ?? singular;
  }

  private computeLexicalMatchScore(
    itemA: GraphItemNode,
    want: GraphWantNode,
    ownerItemCategory?: string,
  ): number {
    const wantNormalized = this.normalizeText(want.queryText);
    const itemNameNormalized = this.normalizeText(itemA.name);
    const itemCategoryNormalized = this.normalizeText(itemA.category);
    const wantCategoryNormalized = this.normalizeText(want.category);
    const ownerCategoryNormalized = this.normalizeText(ownerItemCategory);

    // 1. Direct normalized substring check on item name or full text
    let substringScore = 0;
    if (wantNormalized.length >= 3 && itemNameNormalized.length >= 3) {
      if (itemNameNormalized === wantNormalized) {
        substringScore = 1.0;
      } else if (
        itemNameNormalized.includes(wantNormalized) ||
        wantNormalized.includes(itemNameNormalized)
      ) {
        substringScore = 0.92;
      }
    }

    // 2. Token overlap between want.queryText and itemA (name, category, aiTags, description)
    const wantTokens = this.extractTokens(want.queryText);
    const itemPrimaryTokens = new Set<string>([
      ...this.extractTokens(itemA.name),
      ...this.extractTokens(itemA.category),
      ...(itemA.aiTags ?? []).flatMap((tag) => this.extractTokens(tag)),
    ]);
    const itemDescriptionTokens = new Set<string>(
      this.extractTokens(itemA.description),
    );

    let primaryHits = 0;
    let descriptionHits = 0;

    for (const token of wantTokens) {
      if (itemPrimaryTokens.has(token)) {
        primaryHits += 1;
      } else if (itemDescriptionTokens.has(token)) {
        descriptionHits += 1;
      } else {
        // Check prefix/substring match for model numbers or compound words (length >= 4)
        for (const itemTok of itemPrimaryTokens) {
          if (
            token.length >= 4 &&
            itemTok.length >= 4 &&
            (itemTok.includes(token) || token.includes(itemTok))
          ) {
            primaryHits += 0.85;
            break;
          }
        }
      }
    }

    let tokenOverlapScore = 0;
    if (wantTokens.length > 0 && (primaryHits > 0 || descriptionHits > 0)) {
      const weightedHits = primaryHits + descriptionHits * 0.6;
      const coverage = Math.min(1, weightedHits / wantTokens.length);
      if (primaryHits >= 1) {
        tokenOverlapScore = Math.min(1, 0.55 + coverage * 0.45);
      } else if (descriptionHits >= 1 && coverage >= 0.5) {
        tokenOverlapScore = Math.min(0.8, 0.45 + coverage * 0.35);
      }
    }

    // 3. Category match check
    let categoryScore = 0;
    if (
      wantCategoryNormalized.length >= 2 &&
      itemCategoryNormalized.length >= 2 &&
      wantCategoryNormalized === itemCategoryNormalized
    ) {
      const isExplicitTargetCategory =
        !ownerCategoryNormalized ||
        wantCategoryNormalized !== ownerCategoryNormalized;
      const queryMentionsCategory =
        wantTokens.length === 0 ||
        this.extractTokens(want.category).some((catTok) =>
          wantTokens.includes(catTok),
        );

      if (isExplicitTargetCategory || queryMentionsCategory) {
        categoryScore = primaryHits > 0 || descriptionHits > 0 ? 0.82 : 0.72;
      }
    }

    const bestScore = Math.max(
      substringScore,
      tokenOverlapScore,
      categoryScore,
    );
    return Number(bestScore.toFixed(6));
  }

  private average(values: number[], fallback: number): number {
    if (!Array.isArray(values) || values.length === 0) {
      return fallback;
    }
    let sum = 0;
    for (const v of values) {
      sum += Number.isFinite(v) ? v : fallback;
    }
    return sum / values.length;
  }
}
