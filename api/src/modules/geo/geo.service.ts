import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RAW_DEPARTMENTS,
  RAW_MUNICIPALITIES,
} from './data/colombia-municipalities';
import {
  GeoDepartment,
  GeoMunicipality,
  MunicipalityDto,
  NearbyMunicipality,
} from './geo.types';
import { haversineKm, normalizeSearchText } from './geo.utils';

interface IndexedMunicipality extends GeoMunicipality {
  searchKey: string;
}

@Injectable()
export class GeoService {
  private readonly departments: GeoDepartment[] = RAW_DEPARTMENTS.map(
    ([code, name]) => ({ code, name }),
  );

  private readonly departmentNames = new Map(
    this.departments.map((department) => [department.code, department.name]),
  );

  private readonly municipalities: IndexedMunicipality[] = RAW_MUNICIPALITIES.map(
    ([code, name, latitude, longitude]) => {
      const departmentCode = code.slice(0, 2);
      return {
        code,
        name,
        departmentCode,
        departmentName: this.departmentNames.get(departmentCode) ?? departmentCode,
        latitude,
        longitude,
        searchKey: normalizeSearchText(name),
      };
    },
  );

  private readonly byCode = new Map(
    this.municipalities.map((municipality) => [municipality.code, municipality]),
  );

  /** Alphabetical (Spanish collation), the order users scan a dropdown in. */
  listDepartments(): GeoDepartment[] {
    return this.departments
      .map((department) => ({ ...department }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  /**
   * Lists municipalities, optionally restricted to a department and/or filtered by name
   * (accent-insensitive prefix matches rank first).
   */
  listMunicipalities(
    options: { departmentCode?: string; query?: string; limit?: number } = {},
  ): MunicipalityDto[] {
    const { departmentCode, query, limit } = options;
    const normalizedQuery = query ? normalizeSearchText(query) : '';

    let results = this.municipalities.filter(
      (municipality) =>
        (!departmentCode || municipality.departmentCode === departmentCode) &&
        (!normalizedQuery || municipality.searchKey.includes(normalizedQuery)),
    );

    if (normalizedQuery) {
      results = [...results].sort((a, b) => {
        const aPrefix = a.searchKey.startsWith(normalizedQuery) ? 0 : 1;
        const bPrefix = b.searchKey.startsWith(normalizedQuery) ? 0 : 1;
        return aPrefix - bPrefix || a.name.localeCompare(b.name, 'es');
      });
    } else {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    return results.slice(0, limit ?? results.length).map((m) => this.toDto(m));
  }

  findMunicipality(code: string): GeoMunicipality | undefined {
    return this.byCode.get(code);
  }

  requireMunicipality(code: string): GeoMunicipality {
    const municipality = this.byCode.get(code);
    if (!municipality) {
      throw new BadRequestException(`Unknown municipality code "${code}"`);
    }
    return municipality;
  }

  label(municipality: GeoMunicipality): string {
    return municipality.name === municipality.departmentName
      ? municipality.name
      : `${municipality.name}, ${municipality.departmentName}`;
  }

  toDto(municipality: GeoMunicipality): MunicipalityDto {
    return {
      code: municipality.code,
      name: municipality.name,
      departmentCode: municipality.departmentCode,
      departmentName: municipality.departmentName,
      label: this.label(municipality),
    };
  }

  /** Closest municipal centroid to a GPS fix (the raw coordinates are never stored). */
  nearestMunicipality(
    latitude: number,
    longitude: number,
  ): { municipality: GeoMunicipality; distanceKm: number } {
    let best = this.municipalities[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const municipality of this.municipalities) {
      const distance = haversineKm(
        latitude,
        longitude,
        municipality.latitude,
        municipality.longitude,
      );
      if (distance < bestDistance) {
        best = municipality;
        bestDistance = distance;
      }
    }
    return { municipality: best, distanceKm: bestDistance };
  }

  /** Distance between two municipalities (centroid to centroid), or null if either is unknown. */
  distanceKm(codeA: string, codeB: string): number | null {
    const a = this.byCode.get(codeA);
    const b = this.byCode.get(codeB);
    if (!a || !b) return null;
    return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  }

  /** Municipalities whose centroid lies within `radiusKm` of the center (including the center). */
  municipalitiesWithin(centerCode: string, radiusKm: number): NearbyMunicipality[] {
    const center = this.byCode.get(centerCode);
    if (!center) return [];
    return this.municipalities
      .map((municipality) => ({
        code: municipality.code,
        distanceKm: haversineKm(
          center.latitude,
          center.longitude,
          municipality.latitude,
          municipality.longitude,
        ),
      }))
      .filter((entry) => entry.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
