export interface GeoDepartment {
  code: string;
  name: string;
}

export interface GeoMunicipality {
  code: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  latitude: number;
  longitude: number;
}

/** Public shape returned by the API (centroid coordinates stay server-side). */
export interface MunicipalityDto {
  code: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  /** Display label, e.g. "Pasto, Nariño". */
  label: string;
}

export interface NearbyMunicipality {
  code: string;
  distanceKm: number;
}

export type GeoScope = 'nearby' | 'department' | 'country';

/** Default radius for the "nearby" scope (intermunicipal swaps within about an hour by road). */
export const NEARBY_RADIUS_KM = 50;
