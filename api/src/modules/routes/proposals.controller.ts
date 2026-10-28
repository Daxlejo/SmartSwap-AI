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
import { SwapRouteDto } from './mappers/route.mapper';
import { RoutesService } from './routes.service';

@ApiTags('proposals')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all barter proposals where the authenticated user is initiator or participant',
  })
  @ApiResponse({
    status: 200,
    description: 'User swap route proposals ordered by updatedAt DESC',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listMyRoutes(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<SwapRouteDto[]> {
    return this.routesService.listMyRoutes(currentUser.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single proposal by route ID or human-readable SW-XXXX code',
  })
  @ApiResponse({ status: 200, description: 'Swap route proposal detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Swap route proposal not found' })
  async getRouteById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<SwapRouteDto> {
    return this.routesService.getRouteById(currentUser.sub, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create exchange proposal, lock involved items, and notify participants',
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

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Accept or reject a proposed swap route step with distributed consensus transitions',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated swap route proposal after recording decision',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a route participant' })
  @ApiResponse({ status: 404, description: 'Swap route proposal not found' })
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
      'Confirm delivery and finalize a confirmed circular swap route proposal',
  })
  @ApiResponse({
    status: 200,
    description: 'Completed or updated swap route proposal',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a route participant' })
  @ApiResponse({ status: 404, description: 'Swap route proposal not found' })
  @ApiResponse({ status: 409, description: 'Route is not in CONFIRMED state' })
  async completeRoute(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<SwapRouteDto> {
    return this.routesService.completeRoute(currentUser.sub, id);
  }
}
