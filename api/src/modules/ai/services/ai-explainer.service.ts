import { Injectable } from '@nestjs/common';
import {
  AI_LOCALE_PROMPT_NAME,
  DEFAULT_AI_LOCALE,
} from '../dto/ai-locale.dto';
import {
  ExplainRouteDto,
  RouteStepExplanationInput,
} from '../dto/explain-route.dto';
import { OpenAiClientService } from './openai-client.service';

export interface RouteExplanationResult extends Record<string, unknown> {
  explanation: string;
  fairnessScore: number;
  source: 'openai' | 'fallback';
}

@Injectable()
export class AiExplainerService {
  constructor(private readonly openAiClient: OpenAiClientService) {}

  /**
   * Generates a concise 2-sentence explanation (`explanation`) in the requested locale (Spanish by default)
   * of why a circular swap route is fair in market value parity and positive ecological impact.
   */
  async explainSwapRoute(
    dto: ExplainRouteDto,
  ): Promise<RouteExplanationResult> {
    const locale = dto.locale ?? DEFAULT_AI_LOCALE;
    const language = AI_LOCALE_PROMPT_NAME[locale];
    const computedFairness = this.computeFairnessScore(dto.steps);
    const fallbackFactory = (): RouteExplanationResult =>
      this.buildFallbackExplanation(dto, computedFairness);

    const systemPrompt = [
      'Eres el motor explicativo de economía circular de SmartSwap.',
      `Redacta una explicación concisa de EXACTAMENTE 2 oraciones en ${language} sobre por qué esta ruta de trueque circular o directo es justa en valor económico y beneficiosa para el medio ambiente.`,
      'Devuelve ÚNICAMENTE un objeto JSON válido con estas claves:',
      '{',
      `  "explanation": "Explicación de 2 oraciones en ${language} mencionando a los participantes/artículos y el impacto ecológico.",`,
      '  "fairnessScore": numero_entero_entre_50_y_100',
      '}',
    ].join('\n');

    const userPrompt = JSON.stringify({
      objectiveText: dto.objectiveText,
      computedFairness,
      steps: dto.steps,
    });

    const rawResult = await this.openAiClient.chatJson<RouteExplanationResult>(
      systemPrompt,
      userPrompt,
      fallbackFactory,
    );

    const fallback = fallbackFactory();
    const explanation =
      typeof rawResult.explanation === 'string' &&
      rawResult.explanation.trim().length > 15
        ? rawResult.explanation.trim()
        : fallback.explanation;

    const fairnessScore =
      typeof rawResult.fairnessScore === 'number' &&
      Number.isFinite(rawResult.fairnessScore) &&
      rawResult.fairnessScore >= 0 &&
      rawResult.fairnessScore <= 100
        ? Math.round(rawResult.fairnessScore)
        : computedFairness;

    return {
      explanation,
      fairnessScore,
      source: rawResult.source === 'openai' ? 'openai' : 'fallback',
    };
  }

  /**
   * Computes a deterministic value-parity fairness score (0..100) across all swap steps.
   */
  computeFairnessScore(steps: RouteStepExplanationInput[]): number {
    if (!Array.isArray(steps) || steps.length === 0) {
      return 85;
    }

    let totalParity = 0;
    for (const step of steps) {
      const gives = Math.max(1, step.givesItemValue || 100);
      const receives = Math.max(1, step.receivesItemValue || 100);
      const maxVal = Math.max(gives, receives);
      const minVal = Math.min(gives, receives);
      const ratio = minVal / maxVal;
      totalParity += ratio;
    }

    const avgRatio = totalParity / steps.length;
    const scaled = Math.round(55 + avgRatio * 45);
    return Math.max(50, Math.min(99, scaled));
  }

  private buildFallbackExplanation(
    dto: ExplainRouteDto,
    fairnessScore: number,
  ): RouteExplanationResult {
    const stepCount = dto.steps.length;
    const firstStep = dto.steps[0];
    const co2Estimated = (stepCount * 8.4).toFixed(1);

    const participantsSummary = dto.steps
      .map(
        (s) =>
          `${s.userName} (${s.givesItemName} → ${s.receivesItemName})`,
      )
      .join(', ');

    if (dto.locale === 'en') {
      const englishSentence1 =
        stepCount === 1 && firstStep
          ? `This direct swap fulfills the goal "${dto.objectiveText}" by connecting ${firstStep.userName}, trading ${firstStep.givesItemName} for ${firstStep.receivesItemName} with a ${fairnessScore}% value fairness index.`
          : `This ${stepCount}-link circular route connects ${participantsSummary} to reach "${dto.objectiveText}" while keeping ${fairnessScore}% market value parity without using money.`;
      const englishSentence2 = `By reusing these items in the SmartSwap community, the cycle avoids roughly ${co2Estimated} kg of CO₂ emissions and extends the useful life of the equipment.`;

      return {
        explanation: `${englishSentence1} ${englishSentence2}`,
        fairnessScore,
        source: 'fallback',
      };
    }

    const sentence1 =
      stepCount === 1 && firstStep
        ? `Este intercambio directo permite cumplir el objetivo "${dto.objectiveText}" conectando a ${firstStep.userName} mediante el trueque de ${firstStep.givesItemName} por ${firstStep.receivesItemName} con un índice de equidad de valor del ${fairnessScore}%.`
        : `Esta ruta circular de ${stepCount} eslabones conecta a ${participantsSummary} para alcanzar "${dto.objectiveText}" manteniendo una paridad de valor comercial del ${fairnessScore}% sin uso de dinero.`;

    const sentence2 = `Al reutilizar estos artículos en la comunidad SmartSwap, el ciclo evita aproximadamente ${co2Estimated} kg de emisiones de CO₂ y extiende la vida útil del equipamiento.`;

    return {
      explanation: `${sentence1} ${sentence2}`,
      fairnessScore,
      source: 'fallback',
    };
  }
}
