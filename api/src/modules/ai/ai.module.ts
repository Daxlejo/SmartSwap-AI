import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiEmbeddingService } from './services/ai-embedding.service';
import { AiExplainerService } from './services/ai-explainer.service';
import { AiVisionService } from './services/ai-vision.service';
import { OpenAiClientService } from './services/openai-client.service';

@Module({
  imports: [],
  controllers: [AiController],
  providers: [
    OpenAiClientService,
    AiVisionService,
    AiEmbeddingService,
    AiExplainerService,
  ],
  exports: [
    OpenAiClientService,
    AiVisionService,
    AiEmbeddingService,
    AiExplainerService,
  ],
})
export class AiModule {}
