# SmartSwap AI — Project Rules & Architecture Guardrails

This document defines the strict, non-negotiable guardrails and architectural standards for all AI agents and contributors working on the SmartSwap-AI monorepo.

---

## 1. Token Optimization & Graph-First Rule
- **Read First, Scan Never**: Always read `docs/graph/CODE_MAP.md` before navigating the codebase. Locate modules and endpoints directly from the map instead of executing deep searches or scanning the workspace.
- **Run Indexer When Architecture Changes**: If endpoints, modules, or services are added/renamed, execute `npm run graphify` to keep `docs/graph/CODE_MAP.md` and `docs/graph/CODE_GRAPH.json` up to date.
- **Strict Boundary Scoping**: Only open and read files directly within your assigned task domain. Never scan or touch `node_modules/`, `dist/`, `build/`, `android/app/build/`, or unrelated modules.

---

## 2. UI & Localization Defaults
- **Default Language**: Spanish (`es`) is the primary and mandatory default locale. English (`en`) is an optional user toggle stored in localStorage key `smartswap_locale`.
- **Default Theme**: Light mode (`light`) is the mandatory default theme. Dark mode (`dark`) is an optional user toggle stored in localStorage key `smartswap_theme`.
- **Brand Palette Tokens**:
  - Primary Teal: `#00685f` (Buttons, active tabs, header branding, trust indicators)
  - Secondary/Accent Orange: `#fd761a` (CTA accents, badges, swap cycle highlights, notifications)
  - Neutral Backgrounds: Light `#f8fafc`, Dark `#0f172a`
  - Text: Light `#0f172a`, Dark `#f8fafc`

---

## 3. Architecture & Code Quality (Zero Spaghetti)
- **Strict TypeScript**:
  - `noImplicitAny: true`, zero usage of `any`.
  - Prefer strongly-typed Zod schemas and derived TypeScript types (`z.infer<typeof schema>`).
- **Backend Architecture (`api/`)**:
  - **Controllers**: Strictly routing, HTTP status codes, Swagger metadata, and `@UseGuards(JwtAuthGuard)`. No business logic.
  - **DTOs & Validation**: All request payloads validated using Zod schemas with `ZodValidationPipe`. DTOs reside in `src/modules/<module>/dto/`.
  - **Services**: All business logic and database access. Multi-table write operations MUST use Prisma `$transaction` for atomicity.
  - **Mappers**: Transform Prisma entities to sanitized DTOs (e.g. `UserMapper`, `ItemMapper`, `RouteMapper`).
  - **Security**:
    - NEVER return `passwordHash` in any DTO, mapper, or API response.
    - NEVER store sensitive keys (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) in frontend or public configs.
- **Frontend Architecture (`mobile/`)**:
  - **Zero Direct Fetch**: Never call `window.fetch()` or Axios directly inside React components or hooks.
  - **Central API Client**: All HTTP requests MUST route through `mobile/src/services/http/apiClient.ts` via dedicated service modules (`services/auth/`, `services/items/`, `services/routes/`, `services/ai/`).
  - **State Separation**: Global application state in `src/context/` (`AppContext`, `ThemeContext`), screen logic in `src/screens/`, presentation components in `src/components/`.

---

## 4. Git & Commit Discipline
- **Atomic Conventional Commits**: Every commit MUST have a single logical responsibility and pass verification.
  - Format: `<type>(<scope>): <concise present-tense description>`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`
  - Scopes: `api`, `mobile`, `routes`, `auth`, `items`, `ai`, `tooling`, `docs`
  - Example: `feat(routes): implement 3-hop cycle scoring strategy`
- **Clean Working Tree**: Before completing any task, ensure `git status` contains no unexpected artifacts or leftover scratch files.

---

## 5. Development & Verification Commands
- `npm run graphify`: Generate updated `docs/graph/CODE_MAP.md` and `docs/graph/CODE_GRAPH.json`.
- `npm run typecheck`: Typecheck all monorepo workspaces (`api` and `mobile`).
- `npm run test:api`: Run backend Jest unit tests.
- `npm run test:mobile`: Run mobile Vitest unit tests.
- `npm run dev:api`: Start NestJS backend development server.
- `npm run dev:mobile`: Start Vite mobile development server.
