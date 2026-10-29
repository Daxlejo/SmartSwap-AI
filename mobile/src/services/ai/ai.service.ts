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
  estimatedValue?: number;
  minValue?: number;
  maxValue?: number;
  suggestedValueRange?: {
    min?: number;
    max?: number;
  };
  reasoning?: string;
  explanation?: string;
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

const normalizeValueEstimateResponse = (
  raw: RawAiValueEstimateDto,
): AiValueEstimateResponse => {
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

  return {
    estimatedValue,
    minValue,
    maxValue,
    reasoning: raw.reasoning || raw.explanation || undefined,
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

  async estimateItemValue(
    payload: EstimateItemValuePayload,
  ): Promise<AiValueEstimateResponse> {
    const raw = await apiClient.post<RawAiValueEstimateDto>(
      '/ai/estimate-value',
      payload,
    );
    return normalizeValueEstimateResponse(raw ?? {});
  },
};

export default aiService;
