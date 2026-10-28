import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RouteScoringStrategy } from './engine/route-scoring.strategy';
import { SwapGraphEngine } from './engine/swap-graph.engine';
import { RouteMapper } from './mappers/route.mapper';
import { ProposalsController } from './proposals.controller';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [AiModule],
  controllers: [RoutesController, ProposalsController],
  providers: [
    RoutesService,
    RouteMapper,
    SwapGraphEngine,
    RouteScoringStrategy,
  ],
  exports: [RoutesService, RouteMapper, SwapGraphEngine, RouteScoringStrategy],
})
export class RoutesModule {}
