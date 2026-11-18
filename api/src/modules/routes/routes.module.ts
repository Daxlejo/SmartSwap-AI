import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GeoModule } from '../geo/geo.module';
import { RouteScoringStrategy } from './engine/route-scoring.strategy';
import { SwapGraphEngine } from './engine/swap-graph.engine';
import { HandoffController } from './handoff/handoff.controller';
import { HandoffService } from './handoff/handoff.service';
import { RouteMapper } from './mappers/route.mapper';
import { ProposalsController } from './proposals.controller';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [AiModule, GeoModule],
  controllers: [RoutesController, ProposalsController, HandoffController],
  providers: [
    RoutesService,
    HandoffService,
    RouteMapper,
    SwapGraphEngine,
    RouteScoringStrategy,
  ],
  exports: [RoutesService, RouteMapper, SwapGraphEngine, RouteScoringStrategy],
})
export class RoutesModule {}
