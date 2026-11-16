import { apiClient } from '@/services/http/apiClient';

/** Used only when the API answers without a valuation (Colombian pesos). */
const DEFAULT_ESTIMATED_VALUE_COP = 500_000;

export interface AnalyzeItemPhotoPayload {
  imageBase64?: string;
  hintText?: string;
  locale?: 'es' | 'en';
}

export interface AiPhotoAnalysisResponse {
  name: string;
  category: string;
  condition: string;
  description: string;
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  suggestedWants: string[];
  aiTags: string[];
  confidence?: number;
}

export interface EstimateItemValuePayload {
  name: string;
  category: string;
  condition: ItemConditionLabel | AiItemCondition;
  description?: string;
}

export interface AiValueEstimateResponse {
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  reasoning?: string;
}

/** Condition codes `/ai/estimate-value` accepts. */
export type AiItemCondition = 'LIKE_NEW' | 'EXCELLENT' | 'GOOD' | 'FOR_PARTS';

/** Condition labels of the publish form. */
export type ItemConditionLabel = 'Como nuevo' | 'Excelente estado' | 'Buen estado' | 'Para repuesto';

const LABEL_TO_AI: Record<ItemConditionLabel, AiItemCondition> = {
  'Como nuevo': 'LIKE_NEW',
  'Excelente estado': 'EXCELLENT',
  'Buen estado': 'GOOD',
  'Para repuesto': 'FOR_PARTS',
};

const isAiCondition = (value: string): value is AiItemCondition =>
  value === 'LIKE_NEW' || value === 'EXCELLENT' || value === 'GOOD' || value === 'FOR_PARTS';

/**
 * Maps a publish-form label (or an API code) to the code the AI endpoint expects. Both inputs
 * are closed unions, so a new label that is not mapped fails to compile instead of guessing.
 */
export const toAiCondition = (condition: ItemConditionLabel | AiItemCondition): AiItemCondition =>
  isAiCondition(condition) ? condition : LABEL_TO_AI[condition];

interface RawAiPhotoAnalysisDto {
  name?: string;
  title?: string;
  category?: string;
  condition?: string;
  conditionLabel?: string;
  description?: string;
  estimatedValue?: number;
  minValue?: number;
  maxValue?: number;
  suggestedValueRange?: {
    min?: number;
    max?: number;
  };
  suggestedWants?: string[];
  wants?: string[];
  aiTags?: string[];
  tags?: string[];
  confidence?: number;
}

interface RawAiValueEstimateDto {
  available?: boolean;
  estimatedValue?: number;
  minValue?: number;
  maxValue?: number;
  reasoning?: string;
}

const normalizePhotoAnalysisResponse = (
  raw: RawAiPhotoAnalysisDto,
): AiPhotoAnalysisResponse => {
  const estimatedValue =
    typeof raw.estimatedValue === 'number' && raw.estimatedValue > 0
      ? Math.round(raw.estimatedValue)
      : DEFAULT_ESTIMATED_VALUE_COP;

  const minValue =
    typeof raw.minValue === 'number' && raw.minValue > 0
      ? Math.round(raw.minValue)
      : typeof raw.suggestedValueRange?.min === 'number' && raw.suggestedValueRange.min > 0
        ? Math.round(raw.suggestedValueRange.min)
        : Math.max(1, Math.round(estimatedValue * 0.85));

  const maxValue =
    typeof raw.maxValue === 'number' && raw.maxValue > 0
      ? Math.round(raw.maxValue)
      : typeof raw.suggestedValueRange?.max === 'number' && raw.suggestedValueRange.max > 0
        ? Math.round(raw.suggestedValueRange.max)
        : Math.max(minValue, Math.round(estimatedValue * 1.15));

  const rawWants = Array.isArray(raw.suggestedWants)
    ? raw.suggestedWants
    : Array.isArray(raw.wants)
      ? raw.wants
      : [];

  const rawTags = Array.isArray(raw.aiTags)
    ? raw.aiTags
    : Array.isArray(raw.tags)
      ? raw.tags
      : [];

  return {
    name: (raw.name || raw.title || '').trim(),
    category: (raw.category || 'Otros').trim(),
    condition: (raw.conditionLabel || raw.condition || 'Excelente estado').trim(),
    description: (raw.description || '').trim(),
    estimatedValue,
    minValue,
    maxValue,
    suggestedWants: rawWants.map((w) => String(w).trim()).filter(Boolean),
    aiTags: rawTags.map((t) => String(t).trim()).filter(Boolean),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
  };
};

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Keeps an estimate only when the API marked it available and its range is coherent; anything
 * else becomes `null`, which the publish form shows as "no suggestion".
 */
const normalizeValueEstimateResponse = (
  raw: RawAiValueEstimateDto,
): AiValueEstimateResponse | null => {
  if (
    raw.available !== true ||
    !isPositive(raw.estimatedValue) ||
    !isPositive(raw.minValue) ||
    !isPositive(raw.maxValue) ||
    raw.minValue > raw.estimatedValue ||
    raw.estimatedValue > raw.maxValue
  ) {
    return null;
  }

  return {
    estimatedValue: Math.round(raw.estimatedValue),
    minValue: Math.round(raw.minValue),
    maxValue: Math.round(raw.maxValue),
    reasoning: raw.reasoning?.trim() || undefined,
  };
};

export const aiService = {
  async analyzeItemPhoto(
    payload: AnalyzeItemPhotoPayload,
  ): Promise<AiPhotoAnalysisResponse> {
    const raw = await apiClient.post<RawAiPhotoAnalysisDto>(
      '/items/analyze-photo',
      payload,
    );
    return normalizePhotoAnalysisResponse(raw ?? {});
  },

  /** Colombian market price for the item, or `null` when the AI has no trustworthy answer. */
  async estimateItemValue(
    payload: EstimateItemValuePayload,
  ): Promise<AiValueEstimateResponse | null> {
    const raw = await apiClient.post<RawAiValueEstimateDto>('/ai/estimate-value', {
      ...payload,
      condition: toAiCondition(payload.condition),
    });
    return normalizeValueEstimateResponse(raw ?? {});
  },
};

export default aiService;
