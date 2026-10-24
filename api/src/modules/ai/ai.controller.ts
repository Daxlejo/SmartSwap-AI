import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  AnalyzePhotoDto,
  analyzePhotoSchema,
} from './dto/analyze-photo.dto';
import {
  EstimateValueDto,
  estimateValueSchema,
} from './dto/estimate-value.dto';
import {
  ExplainRouteDto,
  explainRouteSchema,
} from './dto/explain-route.dto';
import {
  AiExplainerService,
  RouteExplanationResult,
} from './services/ai-explainer.service';
import {
  AiVisionService,
  ValueEstimationResult,
  VisionAnalysisResult,
} from './services/ai-vision.service';

@ApiTags('AI')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiVisionService: AiVisionService,
    private readonly aiExplainerService: AiExplainerService,
  ) {}

  @Post('analyze-photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Analyze an item photo and/or hint text to generate structured catalog metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'Structured item classification, valuation, and suggested wants',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzePhoto(
    @Body(new ZodValidationPipe(analyzePhotoSchema)) dto: AnalyzePhotoDto,
  ): Promise<VisionAnalysisResult> {
    return this.aiVisionService.analyzePhoto(dto);
  }

  @Post('estimate-value')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Estimate fair circular swap value (USD) for an item',
  })
  @ApiResponse({
    status: 200,
    description: 'Estimated swap value range, tags, and reasoning',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async estimateValue(
    @Body(new ZodValidationPipe(estimateValueSchema)) dto: EstimateValueDto,
  ): Promise<ValueEstimationResult> {
    return this.aiVisionService.estimateValue(dto);
  }

  @Post('explain-route')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate a concise 2-sentence Spanish explanation of a multi-party circular swap route',
  })
  @ApiResponse({
    status: 200,
    description: 'Spanish explanation and fairness score',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async explainRoute(
    @Body(new ZodValidationPipe(explainRouteSchema)) dto: ExplainRouteDto,
  ): Promise<RouteExplanationResult> {
    return this.aiExplainerService.explainSwapRoute(dto);
  }
}
