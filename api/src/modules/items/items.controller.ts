import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  AnalyzePhotoDto,
  analyzePhotoSchema,
} from '../ai/dto/analyze-photo.dto';
import {
  AiVisionService,
  VisionAnalysisResult,
} from '../ai/services/ai-vision.service';
import {
  CreateItemDto,
  createItemSchema,
} from './dto/create-item.dto';
import {
  QueryItemsDto,
  queryItemsSchema,
} from './dto/query-items.dto';
import {
  UpdateItemDto,
  updateItemSchema,
} from './dto/update-item.dto';
import {
  UploadImageDto,
  uploadImageSchema,
} from './dto/upload-image.dto';
import { ItemsService } from './items.service';
import { ItemResponseDto } from './mappers/item.mapper';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly aiVisionService: AiVisionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List public items with optional search and filters' })
  @ApiResponse({ status: 200, description: 'Filtered list of catalog items' })
  async findAll(
    @Query(new ZodValidationPipe(queryItemsSchema)) query: QueryItemsDto,
  ): Promise<ItemResponseDto[]> {
    return this.itemsService.findAll(query);
  }

  @Get(['mine', 'me'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all items owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user-owned items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMine(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<ItemResponseDto[]> {
    return this.itemsService.findMine(currentUser.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single item by ID' })
  @ApiResponse({ status: 200, description: 'Item detail with owner and wants' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findOne(@Param('id') id: string): Promise<ItemResponseDto> {
    return this.itemsService.findByIdOrThrow(id);
  }

  @Post('analyze-photo')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a base64 item image to Supabase Storage' })
  @ApiResponse({ status: 201, description: 'Public image URL returned' })
  @ApiResponse({ status: 400, description: 'Invalid base64 image payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(uploadImageSchema)) dto: UploadImageDto,
  ): Promise<{ url: string }> {
    return this.itemsService.uploadImage(
      currentUser.sub,
      dto.imageBase64,
      dto.mimeType,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new item and synchronize its wants' })
  @ApiResponse({ status: 201, description: 'Created item with wants' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(createItemSchema)) dto: CreateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.create(currentUser.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an item owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Updated item with wants' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not item owner)' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(currentUser.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an item owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Item and associated wants deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not item owner)' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async remove(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<{ deleted: boolean; id: string }> {
    return this.itemsService.remove(currentUser.sub, id);
  }
}
