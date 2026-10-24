import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '@/services/ai/ai.service';
import { apiClient } from '@/services/http/apiClient';
import { mergeUniqueWants } from '@/screens/PublishScreen';

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

  describe('estimateItemValue', () => {
    it('calls POST /ai/estimate-value and returns the normalized valuation contract', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        estimatedValue: 780,
        minValue: 700,
        maxValue: 860,
        reasoning: 'Basado en el mercado secundario para Trek Marlin 7 en excelente estado.',
      });

      const payload = {
        name: 'Bicicleta Trek Marlin 7',
        category: 'Deportes',
        condition: 'Excelente estado',
        description: 'Rodado 29 talle M frenos hidráulicos Shimano.',
      };

      const result = await aiService.estimateItemValue(payload);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith('/ai/estimate-value', payload);
      expect(result).toEqual({
        estimatedValue: 780,
        minValue: 700,
        maxValue: 860,
        reasoning: 'Basado en el mercado secundario para Trek Marlin 7 en excelente estado.',
      });
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
