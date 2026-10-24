import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

export interface HealthCheckResponse {
  status: 'ok';
  db: 'connected' | 'disconnected';
  uptime: number;
  timestamp: string;
  version: '2.4.0';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Healthcheck probe',
    description:
      'Checks Prisma DB connectivity (SELECT 1) and returns operational status, uptime, and API version.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service operational status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        db: {
          type: 'string',
          enum: ['connected', 'disconnected'],
          example: 'connected',
        },
        uptime: { type: 'number', example: 12.34 },
        timestamp: {
          type: 'string',
          example: '2026-10-23T18:10:00.000Z',
        },
        version: { type: 'string', example: '2.4.0' },
      },
      required: ['status', 'db', 'uptime', 'timestamp', 'version'],
    },
  })
  async getHealth(): Promise<HealthCheckResponse> {
    const isDbConnected = await this.prisma.isHealthy();

    return {
      status: 'ok',
      db: isDbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '2.4.0',
    };
  }
}
