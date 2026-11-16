import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { EstimateValueDto, ItemConditionType } from '../dto/estimate-value.dto';
import { OpenAiClientService } from './openai-client.service';
import { checkPriceRange, MAX_RANGE_RATIO, PriceRangeRejection } from './price-bounds';

const CONDITION_LABELS_ES: Record<ItemConditionType, string> = {
  LIKE_NEW: 'Como nuevo',
  EXCELLENT: 'Excelente estado',
  GOOD: 'Buen estado',
  FOR_PARTS: 'Para repuesto',
};

/** Shape the model must answer with; anything else means "no suggestion". */
const modelPriceSchema = z.object({
  estimatedValue: z.number().positive(),
  minValue: z.number().positive(),
  maxValue: z.number().positive(),
  reasoning: z.string().trim().min(1).max(400),
});

export type PriceUnavailableReason =
  | 'ai_unavailable'
  | 'low_confidence'
  | 'invalid_response'
  | PriceRangeRejection;

export type PriceEstimate =
  | {
      available: true;
      estimatedValue: number;
      minValue: number;
      maxValue: number;
      reasoning: string;
      source: 'openai';
    }
  | { available: false; reason: PriceUnavailableReason };

const SYSTEM_PROMPT = [
  'Eres un tasador de artículos para SmartSwap, una app de trueque en Colombia.',
  'Estima el precio de mercado en Colombia, en COP (pesos colombianos), del artículo exacto que se describe, según su estado.',
  'Tasa solo ese artículo: un accesorio no vale lo que el equipo completo (por ejemplo, un control no es una consola).',
  'Responde ÚNICAMENTE un objeto JSON con estas claves:',
  '{ "estimatedValue": entero_COP, "minValue": entero_COP, "maxValue": entero_COP, "reasoning": "una oración en español" }',
  `Reglas: enteros sin puntos ni decimales; minValue <= estimatedValue <= maxValue; maxValue <= ${MAX_RANGE_RATIO} x minValue.`,
  'Si no puedes estimarlo con confianza, responde { "estimatedValue": null }.',
].join('\n');

@Injectable()
export class AiPriceService {
  private readonly logger = new Logger(AiPriceService.name);

  constructor(private readonly openAiClient: OpenAiClientService) {}

  /**
   * Asks the model for the Colombian market price of an item and returns it only when the answer
   * is valid JSON with a coherent, narrow range inside the category bounds.
   */
  async estimate(dto: EstimateValueDto): Promise<PriceEstimate> {
    const raw = await this.openAiClient.chatJsonOrNull(SYSTEM_PROMPT, this.buildUserPrompt(dto));
    if (raw === null) {
      return { available: false, reason: 'ai_unavailable' };
    }

    // The prompt lets the model decline with { "estimatedValue": null }: a refusal, not a defect
    if (typeof raw === 'object' && raw !== null && 'estimatedValue' in raw && raw.estimatedValue === null) {
      this.logger.debug(`No price estimate for "${dto.name}": the model was not confident`);
      return { available: false, reason: 'low_confidence' };
    }

    const parsed = modelPriceSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.warn(`Discarded price estimate for "${dto.name}": invalid response`);
      return { available: false, reason: 'invalid_response' };
    }

    const checked = checkPriceRange(parsed.data, dto.category);
    if (!checked.ok) {
      this.logger.warn(`Discarded price estimate for "${dto.name}": ${checked.reason}`);
      return { available: false, reason: checked.reason };
    }

    return {
      available: true,
      ...checked.range,
      reasoning: parsed.data.reasoning,
      source: 'openai',
    };
  }

  private buildUserPrompt(dto: EstimateValueDto): string {
    return [
      `Título: ${dto.name}`,
      `Descripción: ${dto.description?.trim() || '(sin descripción)'}`,
      `Categoría: ${dto.category}`,
      `Estado: ${CONDITION_LABELS_ES[dto.condition]}`,
      'Necesito el precio de mercado en Colombia, en COP.',
    ].join('\n');
  }
}
