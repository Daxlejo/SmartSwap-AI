import {
  Body,
  Controller,
  Get,
  Patch,
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
  UpdateProfileDto,
  updateProfileSchema,
} from './dto/update-profile.dto';
import { PublicUserProfile, UserMapper } from './mappers/user.mapper';
import { UserStatsResponse, UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user public profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<PublicUserProfile> {
    const user = await this.usersService.findByIdOrThrow(currentUser.sub);
    return UserMapper.toPublicProfile(user);
  }

  @Get('me/stats')
  @ApiOperation({
    summary: 'Get authenticated user statistics and operational metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile with operational statistics',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMeStats(
    @CurrentUser() currentUser: CurrentUserPayload,
  ): Promise<UserStatsResponse> {
    return this.usersService.getUserStats(currentUser.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Updated user public profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ): Promise<PublicUserProfile> {
    const updatedUser = await this.usersService.updateProfile(
      currentUser.sub,
      dto,
    );
    return UserMapper.toPublicProfile(updatedUser);
  }
}
