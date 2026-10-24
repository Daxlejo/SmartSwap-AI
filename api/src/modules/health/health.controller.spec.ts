import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return connected status when database is reachable', async () => {
    const response = await controller.getHealth();
    expect(response).toEqual({
      status: 'ok',
      db: 'connected',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
      version: '2.4.0',
    });
  });

  it('should return disconnected status when database is unreachable', async () => {
    jest.spyOn(prismaService, 'isHealthy').mockResolvedValue(false);
    const response = await controller.getHealth();
    expect(response).toEqual({
      status: 'ok',
      db: 'disconnected',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
      version: '2.4.0',
    });
  });
});
