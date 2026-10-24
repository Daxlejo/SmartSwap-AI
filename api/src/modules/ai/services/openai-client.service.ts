import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenAiTextContentPart {
  type: 'text';
  text: string;
}

export interface OpenAiImageContentPart {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type OpenAiContentPart = OpenAiTextContentPart | OpenAiImageContentPart;

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

interface OpenAiEmbeddingResponse {
  data?: Array<{
    embedding?: number[];
  }>;
}

@Injectable()
export class OpenAiClientService {
  private readonly logger = new Logger(OpenAiClientService.name);
  private readonly timeoutMs = 8000;
  private readonly chatEndpoint = 'https://api.openai.com/v1/chat/completions';
  private readonly embeddingsEndpoint = 'https://api.openai.com/v1/embeddings';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Checks whether OPENAI_API_KEY is a real production key rather than a development placeholder.
   */
  isApiKeyConfigured(): boolean {
    const key = (
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY ??
      ''
    ).trim();

    if (!key.startsWith('sk-') || key.length < 24) {
      return false;
    }

    const lower = key.toLowerCase();
    if (
      lower.startsWith('sk-proj-temporal') ||
      lower.startsWith('sk-mock') ||
      lower.includes('placeholder') ||
      lower.includes('your-key') ||
      lower.includes('replace')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Executes a JSON-mode chat completion request against gpt-4o-mini with an 8-second timeout.
   * Automatically invokes `fallbackFactory` when the API key is a placeholder or on network/API errors.
   */
  async chatJson<T extends Record<string, unknown>>(
    systemPrompt: string,
    userContent: string | OpenAiContentPart[],
    fallbackFactory: () => T,
  ): Promise<T> {
    if (!this.isApiKeyConfigured()) {
      return fallbackFactory();
    }

    const apiKey = (
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY ??
      ''
    ).trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `OpenAI chat completion returned HTTP ${response.status} — using deterministic fallback`,
        );
        return fallbackFactory();
      }

      const payload = (await response.json()) as OpenAiChatCompletionResponse;
      const rawContent = payload.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        this.logger.warn(
          'OpenAI chat completion returned empty content — using deterministic fallback',
        );
        return fallbackFactory();
      }

      const parsed = JSON.parse(rawContent) as Partial<T>;
      const fallbackBase = fallbackFactory();

      return {
        ...fallbackBase,
        ...parsed,
        source: 'openai',
      } as T;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.logger.warn(
        `OpenAI chatJson fallback triggered (${reason}) — continuing seamlessly`,
      );
      return fallbackFactory();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Requests a semantic vector embedding from `text-embedding-3-small` with an 8-second timeout.
   * Returns `null` when offline or when using a placeholder key so the caller can compute a deterministic vector.
   */
  async createEmbedding(
    text: string,
    dimensions = 64,
  ): Promise<number[] | null> {
    if (!this.isApiKeyConfigured()) {
      return null;
    }

    const apiKey = (
      this.configService.get<string>('OPENAI_API_KEY') ??
      process.env.OPENAI_API_KEY ??
      ''
    ).trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.embeddingsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 4000),
          dimensions,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `OpenAI embeddings returned HTTP ${response.status} — using deterministic embedding fallback`,
        );
        return null;
      }

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
      const vector = payload.data?.[0]?.embedding;

      if (!Array.isArray(vector) || vector.length === 0) {
        return null;
      }

      return vector;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Unknown embedding error';
      this.logger.warn(
        `OpenAI createEmbedding fallback triggered (${reason})`,
      );
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
