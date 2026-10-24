import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemMapper } from './mappers/item.mapper';
import { SupabaseStorageService } from './storage/supabase-storage.service';

@Module({
  imports: [],
  controllers: [ItemsController],
  providers: [ItemsService, ItemMapper, SupabaseStorageService],
  exports: [ItemsService, ItemMapper, SupabaseStorageService],
})
export class ItemsModule {}
