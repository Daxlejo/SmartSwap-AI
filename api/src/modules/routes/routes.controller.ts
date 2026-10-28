import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ProposeRouteDto,
  proposeRouteSchema,
} from './dto/propose-route.dto';
import {
  RespondRouteDto,
  respondRouteSchema,
} from './dto/respond-route.dto';
import {
  SearchRoutesDto,
  searchRoutesSchema,
} from './dto/search-routes.dto';
import { SwapRouteDto } from './mappers/route.mapper';
import { RoutesService } from './routes.service';

@ApiTags('Routes')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Discover optimal 2-, 3-, and 4-hop circular swap routes matching the user objective',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranked circular swap routes enriched with AI explanations',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchRoutes(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(searchRoutesSchema.strip()))
    dto: SearchRoutesDto,
  ): Promise<SwapRouteDto[]> {
    return this.routesService.searchRoutes(currentUser.sub, dto);
  }

  @Post('find')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alias endpoint to discover multi-hop circular swap routes',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranked circular swap routes enriched with AI explanations',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findRoutesAlias(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(searchRoutesSchema.strip()))
    dto: SearchRoutesDto,
  ): Promise<SwapRouteDto[]> {
    return this.routesService.searchRoutes(currentUser.sub, dto);
  }

  @Post('propose')
  @ApiOperation({
    summary:
      'Propose a circular swap route, lock involved items, and notify participants',
  })
  @ApiResponse({
    status: 201,
    description: 'Persisted swap route proposal with locked items',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'One or more items are already locked in another proposal',
  })
  async proposeRoute(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(proposeRouteSchema.strip()))
    dto: ProposeRouteDto,
  ): Promise<SwapRouteDto> {
    return this.routesService.proposeRoute(currentUser.sub, dto);
  }

  @Post(':id/propose')
  @ApiOperation({
    summary:
      'OpenAPI path-compatible endpoint to propose a discovered circular swap route',
  })
  @ApiResponse({
    status: 201,
    description: 'Persisted swap route proposal with locked items',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'One or more items are already locked in another proposal',
  })
  async proposeRouteById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') _id: string,
    @Body(new ZodValidationPipe(proposeRouteSchema.strip()))
    dto: ProposeRouteDto,
  ): Promise<SwapRouteDto> {
    return this.routesService.proposeRoute(currentUser.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List all persisted swap routes where the authenticated user is initiator or participant',
  })
  @ApiResponse({
    status: 200,
    description: 'User swap routes ordered by updatedAt DESC',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listMyRoutes(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<SwapRouteDto[]> {
    return this.routesService.listMyRoutes(currentUser.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single persisted swap route by ID or code' })
  @ApiResponse({ status: 200, description: 'Swap route detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap route not found' })
  async getRouteById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<SwapRouteDto> {
    return this.routesService.getRouteById(currentUser.sub, id);
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept or reject a proposed swap route step with distributed consensus transitions',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated swap route after recording participant decision',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a route participant' })
  @ApiResponse({ status: 404, description: 'Swap route not found' })
  @ApiResponse({ status: 409, description: 'Route is not in PROPOSED state' })
  async respondToRoute(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(respondRouteSchema.strip()))
    dto: RespondRouteDto,
  ): Promise<SwapRouteDto> {
    return this.routesService.respondToRoute(currentUser.sub, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Confirm delivery and finalize a confirmed circular swap route, updating items and eco metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated or finalized COMPLETED swap route',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a route participant' })
  @ApiResponse({ status: 404, description: 'Swap route not found' })
  @ApiResponse({ status: 409, description: 'Route is not in CONFIRMED state' })
  async completeRoute(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<SwapRouteDto> {
    return this.routesService.completeRoute(currentUser.sub, id);
  }
}
