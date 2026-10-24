import { Injectable } from '@nestjs/common';
import { AnalyzePhotoDto } from '../dto/analyze-photo.dto';
import {
  EstimateValueDto,
  ItemConditionType,
} from '../dto/estimate-value.dto';
import {
  OpenAiClientService,
  OpenAiContentPart,
} from './openai-client.service';

export type ConditionLabelEs =
  | 'Como nuevo'
  | 'Excelente'
  | 'Bueno'
  | 'Para piezas';

export interface VisionAnalysisResult extends Record<string, unknown> {
  name: string;
  category: string;
  condition: ItemConditionType;
  conditionLabel: ConditionLabelEs;
  description: string;
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  aiTags: string[];
  suggestedWants: string[];
  confidence: number;
  source: 'openai' | 'fallback';
}

export interface ValueEstimationResult extends Record<string, unknown> {
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  condition: ItemConditionType;
  conditionLabel: ConditionLabelEs;
  reasoning: string;
  aiTags: string[];
  suggestedWants: string[];
  confidence: number;
  source: 'openai' | 'fallback';
}

const CONDITION_LABELS: Record<ItemConditionType, ConditionLabelEs> = {
  LIKE_NEW: 'Como nuevo',
  EXCELLENT: 'Excelente',
  GOOD: 'Bueno',
  FOR_PARTS: 'Para piezas',
};

const CONDITION_MULTIPLIERS: Record<ItemConditionType, number> = {
  LIKE_NEW: 1.15,
  EXCELLENT: 1.0,
  GOOD: 0.8,
  FOR_PARTS: 0.35,
};

interface ArchetypeTemplate {
  keywords: string[];
  name: string;
  category: string;
  condition: ItemConditionType;
  description: string;
  baseValue: number;
  aiTags: string[];
  suggestedWants: string[];
}

const ARCHETYPES: ArchetypeTemplate[] = [
  {
    keywords: ['guitarra', 'fender', 'yamaha', 'acustica', 'instrumento', 'pedal', 'ukelele', 'bajo'],
    name: 'Instrumento Musical Acústico / Eléctrico',
    category: 'Música',
    condition: 'EXCELLENT',
    description:
      'Instrumento musical en excelente estado de conservación, calibrado y listo para estudio o presentaciones en vivo.',
    baseValue: 240,
    aiTags: ['musica', 'instrumento', 'audio', 'estudio', 'creatividad'],
    suggestedWants: ['Interfaz de audio USB', 'Monitores de estudio', 'Tablet o iPad'],
  },
  {
    keywords: ['macbook', 'laptop', 'portatil', 'thinkpad', 'dell', 'asus', 'computador', 'pc'],
    name: 'Laptop Portátil de Alto Rendimiento',
    category: 'Tecnología',
    condition: 'EXCELLENT',
    description:
      'Computador portátil ideal para desarrollo de software, diseño y productividad académica con batería en óptimo estado.',
    baseValue: 520,
    aiTags: ['tecnologia', 'laptop', 'computacion', 'productividad', 'universidad'],
    suggestedWants: ['Monitor 4K UltraWide', 'Bicicleta urbana', 'Cámara Mirrorless'],
  },
  {
    keywords: ['monitor', 'pantalla', 'lg', 'samsung', 'ultrawide', '4k', 'display'],
    name: 'Monitor Profesional UltraHD IPS',
    category: 'Tecnología',
    condition: 'LIKE_NEW',
    description:
      'Monitor de alta resolución con panel IPS, excelente fidelidad de color y soporte ergonómico ajustable.',
    baseValue: 310,
    aiTags: ['monitor', 'setup', 'productividad', 'tecnologia', 'diseno'],
    suggestedWants: ['Silla ergonómica', 'Teclado mecánico inalámbrico', 'Audífonos ANC'],
  },
  {
    keywords: ['camara', 'sony', 'canon', 'nikon', 'fujifilm', 'lente', 'fotografia'],
    name: 'Cámara Digital Mirrorless con Lente',
    category: 'Fotografía',
    condition: 'EXCELLENT',
    description:
      'Cámara digital compacta de lentes intercambiables con sensor de alta sensibilidad, ideal para fotografía y video 4K.',
    baseValue: 460,
    aiTags: ['fotografia', 'camara', 'video', 'creacion-contenido', 'optica'],
    suggestedWants: ['Laptop ligera', 'Estabilizador Gimbal', 'Drone compacto'],
  },
  {
    keywords: ['bici', 'bicicleta', 'trek', 'specialized', 'mtb', 'ruta', 'scooter', 'patineta'],
    name: 'Bicicleta Urbana / MTB de Aluminio',
    category: 'Deportes',
    condition: 'GOOD',
    description:
      'Bicicleta con cuadro ligero de aluminio, frenos de disco y transmisión recién ajustada para movilidad sostenible.',
    baseValue: 290,
    aiTags: ['deportes', 'ciclismo', 'movilidad', 'outdoor', 'ecologico'],
    suggestedWants: ['Reloj GPS deportivo', 'Cámara de acción', 'Audífonos inalámbricos'],
  },
  {
    keywords: ['audifonos', 'airpods', 'sony wh', 'bose', 'auriculares', 'headset', 'parlante'],
    name: 'Audífonos Inalámbricos con Cancelación de Ruido',
    category: 'Audio',
    condition: 'LIKE_NEW',
    description:
      'Audífonos Bluetooth de alta fidelidad con cancelación activa de ruido (ANC) y estuche de transporte original.',
    baseValue: 185,
    aiTags: ['audio', 'bluetooth', 'anc', 'musica', 'portatil'],
    suggestedWants: ['Teclado mecánico', 'Kindle Paperwhite', 'Mochila impermeable'],
  },
  {
    keywords: ['nintendo', 'switch', 'ps5', 'playstation', 'xbox', 'consola', 'videojuego', 'steam'],
    name: 'Consola de Videojuegos Híbrida / Sobremesa',
    category: 'Gaming',
    condition: 'EXCELLENT',
    description:
      'Consola de videojuegos con controles originales y accesorios completos en excelente estado funcional.',
    baseValue: 270,
    aiTags: ['gaming', 'consola', 'entretenimiento', 'videojuegos'],
    suggestedWants: ['Monitor Gaming 144Hz', 'Audífonos inalámbricos', 'Tablet'],
  },
];

@Injectable()
export class AiVisionService {
  constructor(private readonly openAiClient: OpenAiClientService) {}

  /**
   * Analyzes an item photo (data URL or remote URL) and optional hint text via GPT-4o-mini Vision,
   * returning structured catalog metadata with deterministic fallback.
   */
  async analyzePhoto(dto: AnalyzePhotoDto): Promise<VisionAnalysisResult> {
    const fallbackFactory = (): VisionAnalysisResult =>
      this.buildFallbackVisionResult(dto.hintText, dto.imageBase64);

    const systemPrompt = [
      'Eres el motor de visión artificial y tasación circular de SmartSwap.',
      'Analiza el artículo de la imagen y/o descripción proporcionada y devuelve ÚNICAMENTE un objeto JSON estricto con estas claves exactas:',
      '{',
      '  "name": "Nombre comercial conciso en español (máx 60 caracteres)",',
      '  "category": "Tecnología | Música | Fotografía | Deportes | Audio | Gaming | Libros | Hogar | Otros",',
      '  "condition": "LIKE_NEW | EXCELLENT | GOOD | FOR_PARTS",',
      '  "conditionLabel": "Como nuevo | Excelente | Bueno | Para piezas",',
      '  "description": "Descripción atractiva y honesta en español de 1 a 2 oraciones destacando su estado y utilidad.",',
      '  "estimatedValue": numero_entero_en_USD,',
      '  "minValue": numero_entero_en_USD,',
      '  "maxValue": numero_entero_en_USD,',
      '  "aiTags": ["5 etiquetas semánticas en minúsculas"],',
      '  "suggestedWants": ["3 artículos sugeridos de valor similar para trueque"],',
      '  "confidence": numero_entre_0_y_1',
      '}',
    ].join('\n');

    const userParts: OpenAiContentPart[] = [
      {
        type: 'text',
        text: dto.hintText
          ? `Pista del usuario: "${dto.hintText}". Analiza el artículo y devuelve el JSON de catalogación.`
          : 'Analiza la imagen del artículo para catalogarlo en SmartSwap y devuelve el JSON.',
      },
    ];

    if (dto.imageBase64 && dto.imageBase64.trim().length > 0) {
      const normalizedImageUrl = this.normalizeImageSource(dto.imageBase64);
      userParts.push({
        type: 'image_url',
        image_url: {
          url: normalizedImageUrl,
          detail: 'low',
        },
      });
    }

    const rawResult = await this.openAiClient.chatJson<VisionAnalysisResult>(
      systemPrompt,
      userParts,
      fallbackFactory,
    );

    return this.sanitizeVisionResult(rawResult, fallbackFactory);
  }

  /**
   * Estimates the fair market swap value (USD) of an item based on its name, category, condition, and description.
   */
  async estimateValue(dto: EstimateValueDto): Promise<ValueEstimationResult> {
    const fallbackFactory = (): ValueEstimationResult =>
      this.buildFallbackValueEstimate(dto);

    const systemPrompt = [
      'Eres un tasador experto de economía circular y trueque tecnológico en Latinoamérica.',
      'Calcula el valor estimado de intercambio en USD según el nombre, categoría, condición y descripción.',
      'Devuelve ÚNICAMENTE un JSON válido con esta estructura:',
      '{',
      '  "estimatedValue": numero_entero_USD,',
      '  "minValue": numero_entero_USD,',
      '  "maxValue": numero_entero_USD,',
      '  "condition": "LIKE_NEW | EXCELLENT | GOOD | FOR_PARTS",',
      '  "conditionLabel": "Como nuevo | Excelente | Bueno | Para piezas",',
      '  "reasoning": "Explicación breve de 1 oración en español sobre la valoración.",',
      '  "aiTags": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4"],',
      '  "suggestedWants": ["sugerencia 1", "sugerencia 2", "sugerencia 3"],',
      '  "confidence": numero_entre_0_y_1',
      '}',
    ].join('\n');

    const userPrompt = JSON.stringify({
      name: dto.name,
      category: dto.category,
      condition: dto.condition,
      description: dto.description ?? '',
    });

    const rawResult = await this.openAiClient.chatJson<ValueEstimationResult>(
      systemPrompt,
      userPrompt,
      fallbackFactory,
    );

    const fallback = fallbackFactory();
    const condition = this.normalizeCondition(rawResult.condition, dto.condition);
    const estimatedValue =
      typeof rawResult.estimatedValue === 'number' &&
      Number.isFinite(rawResult.estimatedValue) &&
      rawResult.estimatedValue > 0
        ? Math.round(rawResult.estimatedValue)
        : fallback.estimatedValue;

    const minValue =
      typeof rawResult.minValue === 'number' &&
      Number.isFinite(rawResult.minValue) &&
      rawResult.minValue > 0
        ? Math.round(rawResult.minValue)
        : Math.max(10, Math.round(estimatedValue * 0.85));

    const maxValue =
      typeof rawResult.maxValue === 'number' &&
      Number.isFinite(rawResult.maxValue) &&
      rawResult.maxValue >= estimatedValue
        ? Math.round(rawResult.maxValue)
        : Math.round(estimatedValue * 1.15);

    return {
      estimatedValue,
      minValue,
      maxValue,
      condition,
      conditionLabel: CONDITION_LABELS[condition],
      reasoning:
        typeof rawResult.reasoning === 'string' &&
        rawResult.reasoning.trim().length > 0
          ? rawResult.reasoning.trim()
          : fallback.reasoning,
      aiTags:
        Array.isArray(rawResult.aiTags) && rawResult.aiTags.length > 0
          ? rawResult.aiTags.map((t) => String(t).toLowerCase().trim()).slice(0, 6)
          : fallback.aiTags,
      suggestedWants:
        Array.isArray(rawResult.suggestedWants) &&
        rawResult.suggestedWants.length > 0
          ? rawResult.suggestedWants.map((w) => String(w).trim()).slice(0, 4)
          : fallback.suggestedWants,
      confidence:
        typeof rawResult.confidence === 'number' &&
        rawResult.confidence >= 0 &&
        rawResult.confidence <= 1
          ? Number(rawResult.confidence.toFixed(2))
          : fallback.confidence,
      source: rawResult.source === 'openai' ? 'openai' : 'fallback',
    };
  }

  private normalizeImageSource(imageInput: string): string {
    const trimmed = imageInput.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:image/')
    ) {
      return trimmed;
    }
    return `data:image/jpeg;base64,${trimmed}`;
  }

  private normalizeCondition(
    candidate: unknown,
    defaultCondition: ItemConditionType = 'EXCELLENT',
  ): ItemConditionType {
    if (
      candidate === 'LIKE_NEW' ||
      candidate === 'EXCELLENT' ||
      candidate === 'GOOD' ||
      candidate === 'FOR_PARTS'
    ) {
      return candidate;
    }
    return defaultCondition;
  }

  private buildFallbackVisionResult(
    hintText?: string,
    imageBase64?: string,
  ): VisionAnalysisResult {
    const normalizedHint = (hintText ?? '').toLowerCase();
    const matched = ARCHETYPES.find((arch) =>
      arch.keywords.some((kw) => normalizedHint.includes(kw)),
    );

    if (matched) {
      const displayName =
        hintText && hintText.trim().length >= 3
          ? hintText.trim()
          : matched.name;
      const estimatedValue = matched.baseValue;
      return {
        name: displayName,
        category: matched.category,
        condition: matched.condition,
        conditionLabel: CONDITION_LABELS[matched.condition],
        description: matched.description,
        estimatedValue,
        minValue: Math.round(estimatedValue * 0.85),
        maxValue: Math.round(estimatedValue * 1.15),
        aiTags: matched.aiTags,
        suggestedWants: matched.suggestedWants,
        confidence: 0.86,
        source: 'fallback',
      };
    }

    // Deterministic hash selection when only an image or generic hint is supplied
    const seedSource = hintText?.trim() || imageBase64?.slice(0, 128) || 'smartswap';
    let hash = 0;
    for (let i = 0; i < seedSource.length; i++) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
    }

    const selected = ARCHETYPES[hash % ARCHETYPES.length];
    const displayName =
      hintText && hintText.trim().length >= 3
        ? hintText.trim()
        : selected.name;
    const estimatedValue = selected.baseValue;

    return {
      name: displayName,
      category: selected.category,
      condition: selected.condition,
      conditionLabel: CONDITION_LABELS[selected.condition],
      description: selected.description,
      estimatedValue,
      minValue: Math.round(estimatedValue * 0.85),
      maxValue: Math.round(estimatedValue * 1.15),
      aiTags: selected.aiTags,
      suggestedWants: selected.suggestedWants,
      confidence: 0.82,
      source: 'fallback',
    };
  }

  private buildFallbackValueEstimate(
    dto: EstimateValueDto,
  ): ValueEstimationResult {
    const combinedText =
      `${dto.name} ${dto.category} ${dto.description ?? ''}`.toLowerCase();
    const matched = ARCHETYPES.find((arch) =>
      arch.keywords.some((kw) => combinedText.includes(kw)),
    );

    const baseCategoryValue = matched
      ? matched.baseValue
      : this.inferCategoryBaseValue(dto.category);

    const multiplier = CONDITION_MULTIPLIERS[dto.condition] ?? 1.0;
    const estimatedValue = Math.max(
      15,
      Math.round((baseCategoryValue * multiplier) / 5) * 5,
    );
    const minValue = Math.max(10, Math.round(estimatedValue * 0.85));
    const maxValue = Math.round(estimatedValue * 1.15);
    const conditionLabel = CONDITION_LABELS[dto.condition];

    return {
      estimatedValue,
      minValue,
      maxValue,
      condition: dto.condition,
      conditionLabel,
      reasoning: `Valoración calculada para ${dto.name} en categoría ${dto.category} con estado "${conditionLabel}" según referencias del mercado circular.`,
      aiTags: matched
        ? matched.aiTags
        : [
            dto.category.toLowerCase(),
            dto.condition.toLowerCase(),
            'trueque',
            'smartswap',
          ],
      suggestedWants: matched
        ? matched.suggestedWants
        : [
            'Audífonos inalámbricos',
            'Monitor Full HD',
            'Accesorios tecnológicos',
          ],
      confidence: 0.85,
      source: 'fallback',
    };
  }

  private inferCategoryBaseValue(category: string): number {
    const lower = category.toLowerCase();
    if (lower.includes('tecnolog') || lower.includes('comput')) return 320;
    if (lower.includes('fotograf') || lower.includes('camara')) return 380;
    if (lower.includes('music') || lower.includes('audio')) return 210;
    if (lower.includes('deport') || lower.includes('bici')) return 240;
    if (lower.includes('gaming') || lower.includes('consol')) return 250;
    if (lower.includes('libro') || lower.includes('educa')) return 45;
    return 150;
  }

  private sanitizeVisionResult(
    raw: VisionAnalysisResult,
    fallbackFactory: () => VisionAnalysisResult,
  ): VisionAnalysisResult {
    const fallback = fallbackFactory();
    const condition = this.normalizeCondition(
      raw.condition,
      fallback.condition,
    );
    const estimatedValue =
      typeof raw.estimatedValue === 'number' &&
      Number.isFinite(raw.estimatedValue) &&
      raw.estimatedValue > 0
        ? Math.round(raw.estimatedValue)
        : fallback.estimatedValue;

    const minValue =
      typeof raw.minValue === 'number' &&
      Number.isFinite(raw.minValue) &&
      raw.minValue > 0
        ? Math.round(raw.minValue)
        : Math.max(10, Math.round(estimatedValue * 0.85));

    const maxValue =
      typeof raw.maxValue === 'number' &&
      Number.isFinite(raw.maxValue) &&
      raw.maxValue >= estimatedValue
        ? Math.round(raw.maxValue)
        : Math.round(estimatedValue * 1.15);

    return {
      name:
        typeof raw.name === 'string' && raw.name.trim().length > 0
          ? raw.name.trim()
          : fallback.name,
      category:
        typeof raw.category === 'string' && raw.category.trim().length > 0
          ? raw.category.trim()
          : fallback.category,
      condition,
      conditionLabel: CONDITION_LABELS[condition],
      description:
        typeof raw.description === 'string' && raw.description.trim().length > 0
          ? raw.description.trim()
          : fallback.description,
      estimatedValue,
      minValue,
      maxValue,
      aiTags:
        Array.isArray(raw.aiTags) && raw.aiTags.length > 0
          ? raw.aiTags.map((t) => String(t).toLowerCase().trim()).slice(0, 6)
          : fallback.aiTags,
      suggestedWants:
        Array.isArray(raw.suggestedWants) && raw.suggestedWants.length > 0
          ? raw.suggestedWants.map((w) => String(w).trim()).slice(0, 4)
          : fallback.suggestedWants,
      confidence:
        typeof raw.confidence === 'number' &&
        raw.confidence >= 0 &&
        raw.confidence <= 1
          ? Number(raw.confidence.toFixed(2))
          : fallback.confidence,
      source: raw.source === 'openai' ? 'openai' : 'fallback',
    };
  }
}
