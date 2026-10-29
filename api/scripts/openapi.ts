/**
 * Generates docs/contract/openapi.yaml from the running code: routes, summaries, params and
 * responses come from the Nest Swagger decorators, request bodies from the Zod DTO schemas.
 *
 *   npm run openapi          -> rewrite the contract
 *   npm run openapi:check    -> exit 1 if the committed contract is out of date
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';
import { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AppModule } from '../src/app.module';
import { buildSwaggerConfig } from '../src/config/swagger.config';
import { analyzePhotoSchema } from '../src/modules/ai/dto/analyze-photo.dto';
import { estimateValueSchema } from '../src/modules/ai/dto/estimate-value.dto';
import { explainRouteSchema } from '../src/modules/ai/dto/explain-route.dto';
import { loginSchema } from '../src/modules/auth/dto/login.dto';
import { registerSchema } from '../src/modules/auth/dto/register.dto';
import { createItemSchema } from '../src/modules/items/dto/create-item.dto';
import { queryItemsSchema } from '../src/modules/items/dto/query-items.dto';
import { updateItemSchema } from '../src/modules/items/dto/update-item.dto';
import { uploadImageSchema } from '../src/modules/items/dto/upload-image.dto';
import { proposeRouteSchema } from '../src/modules/routes/dto/propose-route.dto';
import { respondRouteSchema } from '../src/modules/routes/dto/respond-route.dto';
import { searchRoutesSchema } from '../src/modules/routes/dto/search-routes.dto';
import { updateProfileSchema } from '../src/modules/users/dto/update-profile.dto';

export const CONTRACT_PATH = resolve(__dirname, '../../docs/contract/openapi.yaml');
const PREFIX = '/api/v1';

const HEADER = [
  '# GENERATED FILE - do not edit by hand.',
  '# Source: Nest Swagger decorators + Zod DTO schemas (api/scripts/openapi.ts).',
  '# Regenerate with `npm run openapi`; CI/tests run `npm run openapi:check`.',
  '',
].join('\n');

/** Request body schema per "METHOD /path" (paths without the /api/v1 prefix). */
const BODY_SCHEMAS: Record<string, ZodTypeAny> = {
  'POST /auth/register': registerSchema,
  'POST /auth/login': loginSchema,
  'PATCH /users/me': updateProfileSchema,
  'POST /items': createItemSchema,
  'PATCH /items/{id}': updateItemSchema,
  'POST /items/upload-image': uploadImageSchema,
  'POST /items/analyze-photo': analyzePhotoSchema,
  'POST /ai/analyze-photo': analyzePhotoSchema,
  'POST /ai/estimate-value': estimateValueSchema,
  'POST /ai/explain-route': explainRouteSchema,
  'POST /routes/search': searchRoutesSchema,
  'POST /routes/find': searchRoutesSchema,
  'POST /routes/propose': proposeRouteSchema,
  'POST /routes/{id}/propose': proposeRouteSchema,
  'POST /proposals': proposeRouteSchema,
  'POST /routes/{id}/respond': respondRouteSchema,
  'POST /proposals/{id}/respond': respondRouteSchema,
};

/** Write endpoints that intentionally take no body. */
const NO_BODY = new Set([
  'POST /routes/{id}/cancel',
  'POST /proposals/{id}/cancel',
  'POST /routes/{id}/complete',
  'POST /proposals/{id}/complete',
  'POST /notifications/read-all',
  'PATCH /notifications/read-all',
  'POST /notifications/{id}/read',
  'PATCH /notifications/{id}/read',
]);

/** Query schemas for GET endpoints whose controllers read a validated query object. */
const QUERY_SCHEMAS: Record<string, ZodTypeAny> = {
  'GET /items': queryItemsSchema,
};

type JsonSchema = Record<string, unknown>;
type Operation = Record<string, unknown> & { parameters?: Array<Record<string, unknown>> };

const toJsonSchema = (schema: ZodTypeAny): JsonSchema => {
  const json = zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'none',
  }) as JsonSchema;
  delete json.$schema;
  return json;
};

const WRITE_METHODS = new Set(['post', 'put', 'patch']);

export const buildContract = async (): Promise<string> => {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  app.setGlobalPrefix(PREFIX.slice(1));
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  await app.close();

  const missing: string[] = [];
  for (const [path, item] of Object.entries(document.paths)) {
    const shortPath = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
    for (const [method, op] of Object.entries(item as Record<string, Operation>)) {
      const key = `${method.toUpperCase()} ${shortPath}`;

      const bodySchema = BODY_SCHEMAS[key];
      if (bodySchema) {
        op.requestBody = {
          required: true,
          content: { 'application/json': { schema: toJsonSchema(bodySchema) } },
        };
      } else if (WRITE_METHODS.has(method) && !NO_BODY.has(key)) {
        missing.push(key);
      }

      const querySchema = QUERY_SCHEMAS[key];
      if (querySchema && !(op.parameters ?? []).some((p) => p.in === 'query')) {
        const properties = (toJsonSchema(querySchema).properties ?? {}) as Record<string, JsonSchema>;
        op.parameters = [
          ...(op.parameters ?? []),
          ...Object.entries(properties).map(([name, schema]) => ({
            name,
            in: 'query',
            required: false,
            schema,
          })),
        ];
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Write endpoints without a request body schema (add them to BODY_SCHEMAS or NO_BODY):\n  ${missing.join('\n  ')}`,
    );
  }

  return HEADER + yaml.dump(document, { noRefs: true, lineWidth: 120 });
};

const main = async () => {
  const contract = await buildContract();

  if (process.argv.includes('--check')) {
    const committed = readFileSync(CONTRACT_PATH, 'utf8').replace(/\r\n/g, '\n');
    if (committed !== contract) {
      console.error('docs/contract/openapi.yaml is out of date. Run `npm run openapi` and commit the result.');
      process.exit(1);
    }
    console.log('OpenAPI contract is up to date.');
    return;
  }

  writeFileSync(CONTRACT_PATH, contract, 'utf8');
  const pathCount = contract.match(/^ {2}\/api\/v1\//gm)?.length ?? 0;
  console.log(`Wrote docs/contract/openapi.yaml (${pathCount} paths).`);
};

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
