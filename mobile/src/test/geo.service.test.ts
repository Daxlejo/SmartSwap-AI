import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/http/apiClient';
import { geoService, type Municipality } from '@/services/geo/geo.service';

const pasto: Municipality = {
  code: '52001',
  name: 'Pasto',
  departmentCode: '52',
  departmentName: 'Nariño',
  label: 'Pasto, Nariño',
};

describe('geoService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    geoService.clearCache();
  });

  it('loads the departments once and serves later calls from memory', async () => {
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue([{ code: '52', name: 'Nariño' }]);

    await geoService.listDepartments();
    const second = await geoService.listDepartments();

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith('/geo/departments', { skipAuth: true });
    expect(second).toEqual([{ code: '52', name: 'Nariño' }]);
  });

  it('caches the municipalities of each department separately', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([pasto]);

    await geoService.listMunicipalities('52');
    await geoService.listMunicipalities('52');
    await geoService.listMunicipalities('05');

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledWith('/geo/municipalities', {
      params: { department: '52' },
      skipAuth: true,
    });
  });

  it('searches municipalities by name without authentication', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([pasto]);

    const results = await geoService.searchMunicipalities({ query: 'pas', limit: 5 });

    expect(results).toEqual([pasto]);
    expect(getSpy).toHaveBeenCalledWith('/geo/municipalities', {
      params: { department: undefined, q: 'pas', limit: 5 },
      skipAuth: true,
    });
  });

  it('resolves a GPS position to a municipality', async () => {
    const getSpy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ municipality: pasto, distanceKm: 1.2 });

    const result = await geoService.resolvePosition(1.2136, -77.2811);

    expect(result.municipality.label).toBe('Pasto, Nariño');
    expect(getSpy).toHaveBeenCalledWith('/geo/resolve', {
      params: { lat: 1.2136, lon: -77.2811 },
      skipAuth: true,
    });
  });
});
