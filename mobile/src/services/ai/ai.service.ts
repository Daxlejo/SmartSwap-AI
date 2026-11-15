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
  condition: string;
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

const UI_CONDITION_TO_AI: Record<string, AiItemCondition> = {
  'como nuevo': 'LIKE_NEW',
  like_new: 'LIKE_NEW',
  'excelente estado': 'EXCELLENT',
  excelente: 'EXCELLENT',
  excellent: 'EXCELLENT',
  'buen estado': 'GOOD',
  bueno: 'GOOD',
  good: 'GOOD',
  'para repuesto': 'FOR_PARTS',
  'para piezas': 'FOR_PARTS',
  for_parts: 'FOR_PARTS',
};

/** Maps the publish form's condition label (or an API code) to the code the AI endpoint expects. */
export const toAiCondition = (condition: string): AiItemCondition =>
  UI_CONDITION_TO_AI[condition.trim().toLowerCase()] ?? 'GOOD';

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
