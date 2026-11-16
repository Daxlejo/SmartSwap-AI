import { EstimateValueDto } from '../dto/estimate-value.dto';
import { AiPriceService } from './ai-price.service';
import { OpenAiClientService } from './openai-client.service';
import { checkPriceRange, resolvePriceCategory, roundCop } from './price-bounds';

const ps5Controller: EstimateValueDto = {
  name: 'Control PS5 nuevo',
  category: 'Videojuegos',
  condition: 'LIKE_NEW',
  description: 'Control DualSense blanco, sellado.',
};

const buildService = (answer: unknown) => {
  const chatJsonOrNull = jest.fn().mockResolvedValue(answer);
  const client = { chatJsonOrNull } as unknown as OpenAiClientService;
  return { service: new AiPriceService(client), chatJsonOrNull };
};

describe('AiPriceService', () => {
  it('sends title, description, category, condition and the Colombian market context', async () => {
    const { service, chatJsonOrNull } = buildService(null);

    await service.estimate(ps5Controller);

    const [systemPrompt, userPrompt] = chatJsonOrNull.mock.calls[0] as [string, string];
    expect(systemPrompt).toContain('precio de mercado en Colombia, en COP');
    expect(systemPrompt).toContain('JSON');
    expect(userPrompt).toContain('Título: Control PS5 nuevo');
    expect(userPrompt).toContain('Descripción: Control DualSense blanco, sellado.');
    expect(userPrompt).toContain('Categoría: Videojuegos');
    expect(userPrompt).toContain('Estado: Como nuevo');
    expect(userPrompt).toContain('precio de mercado en Colombia, en COP');
  });

  it('returns a rounded range when the answer is valid', async () => {
    const { service } = buildService({
      estimatedValue: 284_500,
      minValue: 241_000,
      maxValue: 352_000,
      reasoning: 'Un DualSense nuevo se consigue entre 240 y 350 mil pesos.',
    });

    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: true,
      estimatedValue: 280_000,
      minValue: 240_000,
      maxValue: 350_000,
      reasoning: 'Un DualSense nuevo se consigue entre 240 y 350 mil pesos.',
      source: 'openai',
    });
  });

  it('gives no suggestion when the AI is offline', async () => {
    const { service } = buildService(null);
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'ai_unavailable',
    });
  });

  it('reports a declined estimate as low confidence, not as a broken answer', async () => {
    const { service } = buildService({ estimatedValue: null });
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'low_confidence',
    });
  });

  it.each([
    ['an empty object', {}],
    ['a price written as text', { estimatedValue: '300.000', minValue: 1, maxValue: 2, reasoning: 'x' }],
    ['a missing reasoning', { estimatedValue: 300_000, minValue: 250_000, maxValue: 350_000 }],
  ])('gives no suggestion for %s', async (_label, answer) => {
    const { service } = buildService(answer);
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'invalid_response',
    });
  });

  it('rejects a range wider than twice its minimum', async () => {
    const { service } = buildService({
      estimatedValue: 400_000,
      minValue: 150_000,
      maxValue: 600_000,
      reasoning: 'x',
    });
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'range_too_wide',
    });
  });

  it('rejects an estimate outside its own range', async () => {
    const { service } = buildService({
      estimatedValue: 900_000,
      minValue: 200_000,
      maxValue: 400_000,
      reasoning: 'x',
    });
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'incoherent_range',
    });
  });

  it('rejects a price above the category ceiling', async () => {
    const { service } = buildService({
      estimatedValue: 7_000_000,
      minValue: 6_000_000,
      maxValue: 8_000_000,
      reasoning: 'x',
    });
    await expect(service.estimate(ps5Controller)).resolves.toEqual({
      available: false,
      reason: 'out_of_category_bounds',
    });
  });
});

describe('price bounds', () => {
  it('maps UI and AI categories to their price band', () => {
    expect(resolvePriceCategory('Videojuegos')).toBe('gaming');
    expect(resolvePriceCategory('Gaming')).toBe('gaming');
    expect(resolvePriceCategory('Tecnología')).toBe('technology');
    expect(resolvePriceCategory('Fotografía')).toBe('photography');
    expect(resolvePriceCategory('Deportes')).toBe('sports');
    expect(resolvePriceCategory('Libros')).toBe('books');
    expect(resolvePriceCategory('Cualquier cosa')).toBe('other');
  });

  it('rounds to thousands below 100.000 and to tens of thousands above', () => {
    expect(roundCop(45_400)).toBe(45_000);
    expect(roundCop(284_500)).toBe(280_000);
  });

  it('accepts a range of exactly twice the minimum', () => {
    const result = checkPriceRange(
      { estimatedValue: 300_000, minValue: 200_000, maxValue: 400_000 },
      'Videojuegos',
    );
    expect(result.ok).toBe(true);
  });

  it('rejects a book priced like a laptop', () => {
    const result = checkPriceRange(
      { estimatedValue: 900_000, minValue: 800_000, maxValue: 1_000_000 },
      'Libros',
    );
    expect(result).toEqual({ ok: false, reason: 'out_of_category_bounds' });
  });
});
