import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  QueryMunicipalitiesDto,
  queryMunicipalitiesSchema,
  ResolveLocationDto,
  resolveLocationSchema,
} from './dto/geo-query.dto';
import { GeoService } from './geo.service';
import { GeoDepartment, MunicipalityDto } from './geo.types';

/** Public endpoints: users pick their location while registering, before they have a token. */
@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('departments')
  @ApiOperation({ summary: 'List the departments of Colombia' })
  @ApiResponse({ status: 200, description: 'Departments in alphabetical order' })
  listDepartments(): GeoDepartment[] {
    return this.geoService.listDepartments();
  }

  @Get('municipalities')
  @ApiOperation({
    summary: 'List or search municipalities (accent-insensitive name search)',
  })
  @ApiQuery({ name: 'department', required: false, description: '2-digit DANE department code' })
  @ApiQuery({ name: 'q', required: false, description: 'Name search, e.g. "popayan"' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Matching municipalities' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  listMunicipalities(
    @Query(new ZodValidationPipe(queryMunicipalitiesSchema))
    query: QueryMunicipalitiesDto,
  ): MunicipalityDto[] {
    return this.geoService.listMunicipalities({
      departmentCode: query.department,
      query: query.q,
      limit: query.limit ?? (query.department ? undefined : 25),
    });
  }

  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve a GPS position to the closest municipality',
    description:
      'The coordinates are used only to find the municipality and are never stored.',
  })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lon', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Closest municipality and distance to its center' })
  @ApiResponse({ status: 400, description: 'Position outside Colombia' })
  resolveLocation(
    @Query(new ZodValidationPipe(resolveLocationSchema))
    query: ResolveLocationDto,
  ): { municipality: MunicipalityDto; distanceKm: number } {
    const { municipality, distanceKm } = this.geoService.nearestMunicipality(
      query.lat,
      query.lon,
    );
    return {
      municipality: this.geoService.toDto(municipality),
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
  }
}
