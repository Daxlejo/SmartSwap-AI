import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Attempt lazy connect without blocking application boot if DB is offline
    this.$connect()
      .then(() => {
        this.logger.log('Prisma connected to database successfully.');
      })
      .catch((error) => {
        this.logger.warn(
          `Database not reachable on startup: ${(error as Error).message}. Operating in disconnected mode.`,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Prisma disconnected from database.');
    } catch (error) {
      this.logger.warn(
        `Error disconnecting from database: ${(error as Error).message}`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const probeQuery = this.$queryRawUnsafe('SELECT 1');
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database probe timeout')), 2000),
      );

      await Promise.race([probeQuery, timeout]);
      return true;
    } catch {
      return false;
    }
  }
}
