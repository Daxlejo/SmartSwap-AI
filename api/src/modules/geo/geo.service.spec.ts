import { BadRequestException } from '@nestjs/common';
import { GeoService } from './geo.service';
import { haversineKm, normalizeSearchText } from './geo.utils';

describe('GeoService', () => {
  const geo = new GeoService();

  describe('dataset', () => {
    it('contains the 33 departments and 1,122 municipalities of the DANE DIVIPOLA', () => {
      expect(geo.listDepartments()).toHaveLength(33);
      expect(geo.listMunicipalities({ limit: 5000 })).toHaveLength(1122);
    });

    it('has unique municipality codes that all belong to a listed department', () => {
      const departmentCodes = new Set(geo.listDepartments().map((d) => d.code));
      const municipalities = geo.listMunicipalities({ limit: 5000 });

      expect(new Set(municipalities.map((m) => m.code)).size).toBe(municipalities.length);
      expect(municipalities.every((m) => departmentCodes.has(m.departmentCode))).toBe(true);
    });

    it('keeps every centroid inside the bounding box of Colombia', () => {
      for (const { code } of geo.listMunicipalities({ limit: 5000 })) {
        const municipality = geo.requireMunicipality(code);
        expect(municipality.latitude).toBeGreaterThan(-5);
        expect(municipality.latitude).toBeLessThan(14);
        expect(municipality.longitude).toBeGreaterThan(-82);
        expect(municipality.longitude).toBeLessThan(-66);
      }
    });
  });

  describe('lookup', () => {
    it('builds readable labels', () => {
      expect(geo.label(geo.requireMunicipality('52001'))).toBe('Pasto, Nariño');
      expect(geo.label(geo.requireMunicipality('11001'))).toBe('Bogotá, D.C.');
    });

    it('rejects unknown municipality codes', () => {
      expect(geo.findMunicipality('00000')).toBeUndefined();
      expect(() => geo.requireMunicipality('00000')).toThrow(BadRequestException);
    });

    it('lists the municipalities of a department alphabetically', () => {
      const nariño = geo.listMunicipalities({ departmentCode: '52' });
      const names = nariño.map((m) => m.name);

      expect(nariño).toHaveLength(64);
      expect(names).toEqual(expect.arrayContaining(['Pasto', 'Ipiales', 'San Andrés de Tumaco']));
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    });

    it('searches by name ignoring accents and ranking prefix matches first', () => {
      const popayan = geo.listMunicipalities({ query: 'popayan' });
      expect(popayan[0].label).toBe('Popayán, Cauca');

      const san = geo.listMunicipalities({ query: 'san ', departmentCode: '52' });
      expect(san.length).toBeGreaterThan(0);
      expect(san[0].name.toLowerCase().startsWith('san ')).toBe(true);
    });

    it('honors the result limit', () => {
      expect(geo.listMunicipalities({ query: 'san', limit: 5 })).toHaveLength(5);
    });
  });

  describe('distances', () => {
    it('resolves a GPS fix to the closest municipality', () => {
      const pasto = geo.nearestMunicipality(1.2136, -77.2811);
      expect(pasto.municipality.code).toBe('52001');
      expect(pasto.distanceKm).toBeLessThan(3);

      const medellin = geo.nearestMunicipality(6.2442, -75.5812);
      expect(medellin.municipality.code).toBe('05001');
    });

    it('measures centroid distances with haversine', () => {
      const pastoIpiales = geo.distanceKm('52001', '52356');
      expect(pastoIpiales).toBeGreaterThan(50);
      expect(pastoIpiales).toBeLessThan(70);
      expect(geo.distanceKm('52001', 'nope')).toBeNull();
      expect(haversineKm(0, 0, 0, 0)).toBe(0);
    });

    it('lists municipalities within a radius, nearest first and including the center', () => {
      const within = geo.municipalitiesWithin('52001', 70);
      const codes = within.map((entry) => entry.code);

      expect(codes[0]).toBe('52001');
      expect(codes).toContain('52356');
      expect(codes).not.toContain('19001');
      expect(within.map((e) => e.distanceKm)).toEqual(
        [...within.map((e) => e.distanceKm)].sort((a, b) => a - b),
      );
      expect(geo.municipalitiesWithin('nope', 50)).toEqual([]);
    });
  });

  describe('normalizeSearchText', () => {
    it('strips accents and lowercases', () => {
      expect(normalizeSearchText(' Bogotá, D.C. ')).toBe('bogota, d.c.');
    });
  });
});
