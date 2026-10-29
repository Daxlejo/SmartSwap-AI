import { apiClient } from '@/services/http/apiClient';

export interface Department {
  code: string;
  name: string;
}

export interface Municipality {
  code: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  /** Display label, e.g. "Pasto, Nariño". */
  label: string;
}

export interface ResolvedLocation {
  municipality: Municipality;
  distanceKm: number;
}

export interface SearchMunicipalitiesParams {
  department?: string;
  query?: string;
  limit?: number;
}

// Departments and the municipalities of a department never change at runtime: cache them for the session.
let departmentsCache: Department[] | null = null;
const municipalitiesCache = new Map<string, Municipality[]>();

export const geoService = {
  async listDepartments(): Promise<Department[]> {
    if (!departmentsCache) {
      departmentsCache = await apiClient.get<Department[]>('/geo/departments', {
        skipAuth: true,
      });
    }
    return departmentsCache;
  },

  async listMunicipalities(departmentCode: string): Promise<Municipality[]> {
    const cached = municipalitiesCache.get(departmentCode);
    if (cached) return cached;

    const municipalities = await apiClient.get<Municipality[]>('/geo/municipalities', {
      params: { department: departmentCode },
      skipAuth: true,
    });
    municipalitiesCache.set(departmentCode, municipalities);
    return municipalities;
  },

  async searchMunicipalities(params: SearchMunicipalitiesParams): Promise<Municipality[]> {
    return apiClient.get<Municipality[]>('/geo/municipalities', {
      params: { department: params.department, q: params.query, limit: params.limit },
      skipAuth: true,
    });
  },

  /** Closest municipality to a GPS fix. The API never stores the coordinates. */
  async resolvePosition(latitude: number, longitude: number): Promise<ResolvedLocation> {
    return apiClient.get<ResolvedLocation>('/geo/resolve', {
      params: { lat: latitude, lon: longitude },
      skipAuth: true,
    });
  },

  /** Test helper: forgets the cached lists. */
  clearCache(): void {
    departmentsCache = null;
    municipalitiesCache.clear();
  },
};

export default geoService;
