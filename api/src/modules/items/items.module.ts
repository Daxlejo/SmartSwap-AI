import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GeoModule } from '../geo/geo.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemMapper } from './mappers/item.mapper';
import { SupabaseStorageService } from './storage/supabase-storage.service';

@Module({
  imports: [AiModule, GeoModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemMapper, SupabaseStorageService],
  exports: [ItemsService, ItemMapper, SupabaseStorageService],
})
export class ItemsModule {}
