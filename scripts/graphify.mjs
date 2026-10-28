import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  { prefix: 'api', dir: path.join(ROOT_DIR, 'api', 'src') },
  { prefix: 'mobile', dir: path.join(ROOT_DIR, 'mobile', 'src') },
];

const PRISMA_MODELS = [
  'User',
  'Item',
  'Want',
  'SwapRoute',
  'SwapRouteStep',
  'Notification',
];

function normalizePath(p) {
  return p.split(path.sep).join('/');
}

function getAllSourceFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      results.push(...getAllSourceFiles(fullPath));
    } else if (entry.isFile()) {
      if (
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function extractExports(content) {
  const exports = new Set();
  const exportDeclRegex = /export\s+(?:default\s+)?(?:async\s+)?(?:class|function|interface|type|const|enum)\s+([A-Za-z0-9_$]+)/g;
  let match;
  while ((match = exportDeclRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }

  const exportNamedRegex = /export\s*\{([^}]+)\}/g;
  while ((match = exportNamedRegex.exec(content)) !== null) {
    const items = match[1].split(',');
    for (const item of items) {
      const parts = item.trim().split(/\s+as\s+/);
      const name = parts[parts.length - 1].trim();
      if (name && !name.startsWith('type ')) {
        exports.add(name.replace(/^type\s+/, ''));
      }
    }
  }

  const exportDefaultRegex = /export\s+default\s+([A-Za-z0-9_$]+);/g;
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }

  return Array.from(exports).sort();
}

function extractImports(content) {
  const imports = new Set();
  const importRegex = /import\s+(?:[\w*\s{},$]+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  return Array.from(imports).sort();
}

function extractPrismaModels(content) {
  const found = new Set();
  for (const model of PRISMA_MODELS) {
    const lowerFirst = model.charAt(0).toLowerCase() + model.slice(1);
    const pattern = new RegExp(`\\bprisma\\.${lowerFirst}\\b|\\bPrisma\\.${model}\\b`, 'i');
    if (pattern.test(content)) {
      found.add(model);
    }
  }
  return Array.from(found).sort();
}

function extractEndpoints(content, relPath) {
  const endpoints = [];
  const controllerMatch = content.match(/@Controller\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/);
  if (!controllerMatch) return endpoints;

  let baseRoute = controllerMatch[1] || '';
  if (baseRoute && !baseRoute.startsWith('/')) {
    baseRoute = '/' + baseRoute;
  }
  baseRoute = baseRoute.replace(/\/$/, '');

  const controllerClassMatch = content.match(/export\s+class\s+([A-Za-z0-9_$]+)/);
  const controllerName = controllerClassMatch ? controllerClassMatch[1] : 'UnknownController';

  // Match method definitions with decorators preceding them
  // Matches: @Get(...), @Post(...), etc. followed by any other decorators (@...), followed by method name
  const httpDecoratorRegex = /@(Get|Post|Patch|Delete|Put)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let httpMatch;
  while ((httpMatch = httpDecoratorRegex.exec(content)) !== null) {
    const httpMethod = httpMatch[1].toUpperCase();
    let subPath = httpMatch[2] || '';
    if (subPath && !subPath.startsWith('/')) {
      subPath = '/' + subPath;
    }
    const fullPath = (baseRoute + subPath) || '/';

    // Scan forward from the HTTP decorator to find method name and ApiOperation
    const sliceAfter = content.slice(httpMatch.index);
    // Find the next method declaration (an identifier followed by '(' that does NOT start with '@')
    const methodDeclMatch = sliceAfter.match(/\n\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\(/);
    const handler = methodDeclMatch ? methodDeclMatch[1] : 'handler';

    // Check for ApiOperation summary in the block preceding or following
    const blockWindow = content.slice(Math.max(0, httpMatch.index - 200), httpMatch.index + (methodDeclMatch ? methodDeclMatch.index + 50 : 300));
    const summaryMatch = blockWindow.match(/@ApiOperation\s*\(\s*\{[\s\S]*?summary:\s*['"`]([^'"`]+)['"`]/);
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';

    endpoints.push({
      method: httpMethod,
      path: fullPath,
      controller: controllerName,
      handler,
      summary,
      file: relPath,
    });
  }

  return endpoints;
}

function assignModuleGroup(relPath) {
  const parts = relPath.split('/');
  if (parts[0] === 'api' && parts[1] === 'src') {
    if (parts[2] === 'modules' && parts[3]) {
      return `api/${parts[3]}`;
    }
    if (parts[2]) {
      return `api/${parts[2]}`;
    }
  } else if (parts[0] === 'mobile' && parts[1] === 'src') {
    if (parts[2]) {
      return `mobile/${parts[2]}`;
    }
  }
  return 'root';
}

function run() {
  console.log('🔍 Scanning SmartSwap monorepo architecture...');

  const allFiles = [];
  for (const scan of SCAN_DIRS) {
    const files = getAllSourceFiles(scan.dir);
    allFiles.push(...files);
  }

  const filesMap = {};
  const modulesMap = {};
  const allEndpoints = [];

  let apiFilesCount = 0;
  let mobileFilesCount = 0;

  for (const filePath of allFiles) {
    const relPath = normalizePath(path.relative(ROOT_DIR, filePath));
    const content = fs.readFileSync(filePath, 'utf8');

    if (relPath.startsWith('api/')) apiFilesCount++;
    if (relPath.startsWith('mobile/')) mobileFilesCount++;

    const exportsList = extractExports(content);
    const importsList = extractImports(content);
    const prismaModels = extractPrismaModels(content);
    const endpoints = extractEndpoints(content, relPath);

    if (endpoints.length > 0) {
      allEndpoints.push(...endpoints);
    }

    const modGroup = assignModuleGroup(relPath);
    if (!modulesMap[modGroup]) {
      modulesMap[modGroup] = [];
    }
    modulesMap[modGroup].push(relPath);

    filesMap[relPath] = {
      module: modGroup,
      exports: exportsList,
      imports: importsList,
      ...(endpoints.length > 0 ? { endpoints } : {}),
      ...(prismaModels.length > 0 ? { prismaModels } : {}),
    };
  }

  // Sort endpoints logically: path, then method
  allEndpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  const codeGraph = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalFiles: allFiles.length,
      apiFiles: apiFilesCount,
      mobileFiles: mobileFilesCount,
      endpointsCount: allEndpoints.length,
    },
    endpoints: allEndpoints,
    modules: modulesMap,
    files: filesMap,
  };

  const outputDir = path.join(ROOT_DIR, 'docs', 'graph');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'CODE_GRAPH.json');
  fs.writeFileSync(jsonPath, JSON.stringify(codeGraph, null, 2), 'utf8');
  console.log(`✅ Generated ${normalizePath(path.relative(ROOT_DIR, jsonPath))} (${allFiles.length} files, ${allEndpoints.length} endpoints)`);

  // Generate concise CODE_MAP.md (< 150 lines)
  const codeMapLines = [
    '# SmartSwap Monorepo Code Map',
    '',
    '> **AI Agent Rule (Graph-First):** Read this index FIRST before running file searches.',
    '> Restrict edits to your assigned module boundary. Keep context lean.',
    '',
    '## 1. Monorepo Structure',
    '- `api/`: NestJS 10, Prisma 5, PostgreSQL, JWT Auth, Clean Arch (Controllers -> Services -> Prisma).',
    '- `mobile/`: React 18, Vite 5, Tailwind CSS, Capacitor 8 (Android), i18n (`es` default), central `apiClient`.',
    '- `docs/`: OpenAPI specs (`docs/contract/openapi.yaml`), architecture graphs (`docs/graph/`).',
    '',
    '## 2. REST Endpoints Quick Reference',
    '| Method | Route | Controller | Handler | Summary |',
    '|:---|:---|:---|:---|:---|',
  ];

  for (const ep of allEndpoints) {
    const summary = ep.summary ? ep.summary.replace(/\|/g, '\\|') : '-';
    codeMapLines.push(`| \`${ep.method}\` | \`${ep.path}\` | \`${ep.controller}\` | \`${ep.handler}\` | ${summary} |`);
  }

  codeMapLines.push(
    '',
    '## 3. Backend Modules (`api/src/modules/`)',
    '- **`auth/`**: `auth.controller.ts`, `auth.service.ts`, `dto/` — Register, JWT login, `GET /auth/me`.',
    '- **`users/`**: `users.controller.ts`, `users.service.ts`, `mappers/user.mapper.ts` — Profile updates, stats.',
    '- **`items/`**: `items.controller.ts`, `items.service.ts`, `storage/supabase-storage.service.ts` — Item CRUD & uploads.',
    '- **`routes/`**: `routes.controller.ts`, `routes.service.ts`, `engine/swap-graph.engine.ts`, `engine/route-scoring.strategy.ts` — Bounded DFS cycle finder (k=2,3,4) & atomic swap consensus.',
    '- **`ai/`**: `ai.controller.ts`, `services/ai-vision.service.ts`, `services/ai-explainer.service.ts`, `services/openai-client.service.ts` — OpenAI vision, valuation, and route explanation.',
    '- **`health/`**: `health.controller.ts` — DB probe and service liveness check.',
    '- **`notifications/`**: `notifications.module.ts` — Day 5 push/in-app notification engine (pending).',
    '- **`common/` & `prisma/`**: `jwt-auth.guard.ts`, `zod-validation.pipe.ts`, `prisma.service.ts` (soft-delete/logging).',
    '',
    '## 4. Mobile Architecture (`mobile/src/`)',
    '- **Services (`services/`)**: `http/apiClient.ts` (sole HTTP client), `auth/`, `items/`, `routes/`, `ai/`, `storage/tokenStorage.ts`.',
    '- **State (`context/`)**: `AppContext.tsx` (swaps, active routes, mock fallback), `ThemeContext.tsx` (default `light`).',
    '- **Screens (`screens/`)**: `SplashScreen`, `LoginScreen`, `RegisterScreen`, `HomeScreen`, `ExploreScreen`, `PublishScreen`, `SearchingScreen`, `RouteResultsScreen`, `RouteDetailScreen`, `ConfigureSwapScreen`, `ProposalConfirmScreen`, `TradesScreen`, `NotificationsScreen`, `ProfileScreen`.',
    '- **i18n & Theme**: `i18n/` (default `es`, optional `en`). Brand colors: Primary `#00685f`, Accent `#fd761a`.',
    '',
    '## 5. Architectural Guardrails (Zero Spaghetti)',
    '1. **Graph-First**: Consult this code map first. Do NOT scan `node_modules`, `dist`, or build folders.',
    '2. **Backend**: Strict flow: `dto/` (Zod validation) -> `controller` (`JwtAuthGuard`) -> `service` (Prisma `$transaction`) -> `mapper`.',
    '3. **Frontend**: Components must never call `fetch()` directly; always route through `apiClient.ts` services.',
    '4. **Security**: Never expose `passwordHash`. Never place private API keys in `mobile/`.',
    '5. **Git Discipline**: Atomic Conventional Commits (`feat(scope): ...`, `fix(scope): ...`), one responsibility per commit.'
  );

  const mdPath = path.join(outputDir, 'CODE_MAP.md');
  const mdContent = codeMapLines.join('\n') + '\n';
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  const lineCount = mdContent.split('\n').length;
  console.log(`✅ Generated ${normalizePath(path.relative(ROOT_DIR, mdPath))} (${lineCount} lines, limit < 150)`);

  if (lineCount >= 150) {
    console.error(`⚠️ WARNING: CODE_MAP.md exceeds 150 lines (${lineCount} lines)!`);
    process.exit(1);
  }
}

run();
