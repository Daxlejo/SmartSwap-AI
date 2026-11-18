import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService, toAiCondition } from '@/services/ai/ai.service';
import { apiClient } from '@/services/http/apiClient';
import { mergeUniqueWants } from '@/utils/wantedItems';

describe('aiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeItemPhoto', () => {
    it('calls POST /items/analyze-photo and normalizes the AI photo analysis contract', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        name: 'Cámara Sony Alpha A6400',
        category: 'Fotografía',
        condition: 'LIKE_NEW',
        description: 'Cámara mirrorless 4K con lente 16-50mm en impecable estado.',
        estimatedValue: 850,
        minValue: 750,
        maxValue: 950,
        suggestedWants: ['MacBook Air', 'iPad Pro', 'Bicicleta'],
        aiTags: ['sony', 'mirrorless', '4k', 'fotografia'],
        confidence: 0.94,
        source: 'openai',
      });

      const payload = {
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        hintText: 'Sony A6400',
        locale: 'es' as const,
      };

      const result = await aiService.analyzeItemPhoto(payload);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/items/analyze-photo', payload);
      expect(result).toEqual({
        name: 'Cámara Sony Alpha A6400',
        category: 'Fotografía',
        condition: 'LIKE_NEW',
        description: 'Cámara mirrorless 4K con lente 16-50mm en impecable estado.',
        estimatedValue: 850,
        minValue: 750,
        maxValue: 950,
        suggestedWants: ['MacBook Air', 'iPad Pro', 'Bicicleta'],
        aiTags: ['sony', 'mirrorless', '4k', 'fotografia'],
        confidence: 0.94,
      });
    });

    it('computes fallback minValue and maxValue when the backend returns only estimatedValue', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        name: 'Nintendo Switch OLED',
        category: 'Videojuegos',
        condition: 'Excelente',
        description: 'Consola híbrida con dock blanco y controles Joy-Con.',
        estimatedValue: 300,
        wants: ['PlayStation 5'],
        tags: ['nintendo', 'oled'],
        source: 'openai',
      });

      const result = await aiService.analyzeItemPhoto({
        hintText: 'Nintendo Switch OLED',
        locale: 'es',
      });

      expect(result.estimatedValue).toBe(300);
      expect(result.minValue).toBe(255);
      expect(result.maxValue).toBe(345);
      expect(result.suggestedWants).toEqual(['PlayStation 5']);
      expect(result.aiTags).toEqual(['nintendo', 'oled']);
    });
  });

  describe('suggested wants', () => {
    it('drops the ideas of a fallback answer, which do not come from the item', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        name: 'Guitarra',
        estimatedValue: 300000,
        suggestedWants: ['Tablet', 'Smartphone', 'Auriculares'],
        source: 'fallback',
      });

      const result = await aiService.analyzeItemPhoto({ hintText: 'Guitarra', locale: 'es' });

      expect(result.suggestedWants).toEqual([]);
    });
  });

  describe('estimateItemValue', () => {
    it('sends the condition code the API expects and returns the price range', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        available: true,
        estimatedValue: 780000,
        minValue: 700000,
        maxValue: 860000,
        reasoning: 'Una Trek Marlin 7 usada se vende entre 700 y 860 mil pesos.',
        source: 'openai',
      });

      const result = await aiService.estimateItemValue({
        name: 'Bicicleta Trek Marlin 7',
        category: 'Deportes',
        condition: 'Excelente estado',
        description: 'Rodado 29 talle M frenos hidráulicos Shimano.',
      });

      expect(postSpy).toHaveBeenCalledWith('/ai/estimate-value', {
        name: 'Bicicleta Trek Marlin 7',
        category: 'Deportes',
        condition: 'EXCELLENT',
        description: 'Rodado 29 talle M frenos hidráulicos Shimano.',
      });
      expect(result).toEqual({
        estimatedValue: 780000,
        minValue: 700000,
        maxValue: 860000,
        reasoning: 'Una Trek Marlin 7 usada se vende entre 700 y 860 mil pesos.',
      });
    });

    it('returns no suggestion when the API has no trustworthy estimate', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        available: false,
        reason: 'ai_unavailable',
      });

      await expect(
        aiService.estimateItemValue({ name: 'Control PS5', category: 'Videojuegos', condition: 'Como nuevo' }),
      ).resolves.toBeNull();
    });

    it('returns no suggestion when the range is incoherent', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        available: true,
        estimatedValue: 900000,
        minValue: 200000,
        maxValue: 400000,
      });

      await expect(
        aiService.estimateItemValue({ name: 'Control PS5', category: 'Videojuegos', condition: 'Como nuevo' }),
      ).resolves.toBeNull();
    });

    it('maps every publish condition label to its API code', () => {
      expect(toAiCondition('Como nuevo')).toBe('LIKE_NEW');
      expect(toAiCondition('Excelente estado')).toBe('EXCELLENT');
      expect(toAiCondition('Buen estado')).toBe('GOOD');
      expect(toAiCondition('Para repuesto')).toBe('FOR_PARTS');
      expect(toAiCondition('LIKE_NEW')).toBe('LIKE_NEW');
      expect(toAiCondition('FOR_PARTS')).toBe('FOR_PARTS');
    });
  });

  describe('mergeUniqueWants helper', () => {
    it('appends AI suggested wants without overwriting or duplicating manually added wants', () => {
      const existing = ['Cámara', 'iPad'];
      const suggested = ['ipad', 'Laptop', 'Smartwatch', 'cámara'];

      const merged = mergeUniqueWants(existing, suggested);

      expect(merged).toEqual(['Cámara', 'iPad', 'Laptop', 'Smartwatch']);
    });
  });
});
