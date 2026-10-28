import { apiClient } from '@/services/http/apiClient';

export const healthService = {
  /**
   * Pings GET /health. Resolves true when the API answers, false on any error
   * (offline, DNS failure, or the free Render instance still booting).
   */
  async isServerUp(): Promise<boolean> {
    try {
      await apiClient.get<unknown>('/health', { skipAuth: true });
      return true;
    } catch {
      return false;
    }
  },
};

export default healthService;
