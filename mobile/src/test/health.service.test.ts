import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from '@/services/http/apiClient';
import { healthService } from '@/services/health/health.service';

describe('healthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the server as up when GET /health answers', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ status: 'ok' });

    await expect(healthService.isServerUp()).resolves.toBe(true);
    expect(getSpy).toHaveBeenCalledWith('/health', { skipAuth: true });
  });

  it('reports the server as down on network errors or 5xx responses', async () => {
    vi.spyOn(apiClient, 'get')
      .mockRejectedValueOnce(new ApiError({ statusCode: 0, message: 'Network error' }))
      .mockRejectedValueOnce(new ApiError({ statusCode: 503, message: 'Service Unavailable' }));

    await expect(healthService.isServerUp()).resolves.toBe(false);
    await expect(healthService.isServerUp()).resolves.toBe(false);
  });
});
