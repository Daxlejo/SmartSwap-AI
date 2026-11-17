/**
 * Runs the market-price estimate against the real OpenAI API for the reference cases of
 * Phase 4a and prints what the publish form would show.
 *
 *   npm --workspace=api run price:cases     (needs OPENAI_API_KEY in api/.env)
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { EstimateValueDto } from '../src/modules/ai/dto/estimate-value.dto';
import { AiPriceService } from '../src/modules/ai/services/ai-price.service';
import { OpenAiClientService } from '../src/modules/ai/services/openai-client.service';

const formatCopForLog = (value: number): string =>
  `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value)}`;

const CASES: EstimateValueDto[] = [
  {
    name: 'Control PS5 nuevo',
    category: 'Videojuegos',
    condition: 'LIKE_NEW',
    description: 'Control inalámbrico DualSense original para PlayStation 5, sellado en su caja.',
  },
  {
    name: 'Bicicleta rodado 29 usada',
    category: 'Deportes',
    condition: 'GOOD',
    description: 'Bicicleta de montaña rin 29, marco de aluminio, frenos de disco mecánicos, uso normal.',
  },
  {
    name: 'iPhone 12 usado',
    category: 'Tecnología',
    condition: 'GOOD',
    description: 'iPhone 12 de 64 GB, batería al 84 %, pantalla sin rayones, con cargador.',
  },
];

const main = async (): Promise<void> => {
  const client = new OpenAiClientService(new ConfigService());
  if (!client.isApiKeyConfigured()) {
    console.error('OPENAI_API_KEY is not configured in api/.env; the app would show no suggestion.');
    process.exitCode = 1;
    return;
  }
  const service = new AiPriceService(client);
  for (const dto of CASES) {
    const result = await service.estimate(dto);
    if (result.available) {
      console.log(
        `| ${dto.name} | ${formatCopForLog(result.minValue)} a ${formatCopForLog(result.maxValue)} | ${formatCopForLog(result.estimatedValue)} | ${result.reasoning} |`,
      );
    } else {
      console.log(`| ${dto.name} | sin sugerencia (${result.reason}) | — | — |`);
    }
  }
};

void main();
