# SmartSwap Monorepo Code Map

> **AI Agent Rule (Graph-First):** Read this index FIRST before running file searches.
> Restrict edits to your assigned module boundary. Keep context lean.

## 1. Monorepo Structure
- `api/`: NestJS 10, Prisma 5, PostgreSQL, JWT Auth, Clean Arch (Controllers -> Services -> Prisma).
- `mobile/`: React 18, Vite 5, Tailwind CSS, Capacitor 8 (Android), i18n (`es` default), central `apiClient`.
- `docs/`: OpenAPI specs (`docs/contract/openapi.yaml`), architecture graphs (`docs/graph/`).

## 2. REST Endpoints Quick Reference
| Method | Route | Controller | Handler | Summary |
|:---|:---|:---|:---|:---|
| `POST` | `/ai/analyze-photo` | `AiController` | `analyzePhoto` | Analyze an item photo and/or hint text to generate structured catalog metadata |
| `POST` | `/ai/estimate-value` | `AiController` | `estimateValue` | Estimate fair circular swap value (COP) for an item |
| `POST` | `/ai/explain-route` | `AiController` | `explainRoute` | Generate a concise 2-sentence Spanish explanation of a multi-party circular swap route |
| `POST` | `/auth/login` | `AuthController` | `login` | Authenticate with email and password |
| `GET` | `/auth/me` | `AuthController` | `getMe` | Get current authenticated user profile |
| `POST` | `/auth/register` | `AuthController` | `register` | Register a new user account |
| `GET` | `/geo/departments` | `GeoController` | `listDepartments` | List the departments of Colombia |
| `GET` | `/geo/municipalities` | `GeoController` | `listMunicipalities` | List or search municipalities (accent-insensitive name search) |
| `GET` | `/geo/resolve` | `GeoController` | `resolveLocation` | Resolve a GPS position to the closest municipality |
| `GET` | `/health` | `HealthController` | `getHealth` | Healthcheck probe |
| `GET` | `/items` | `ItemsController` | `findAll` | List public items with optional search and filters |
| `POST` | `/items` | `ItemsController` | `create` | Create a new item and synchronize its wants |
| `DELETE` | `/items/:id` | `ItemsController` | `remove` | Delete an item owned by the authenticated user |
| `GET` | `/items/:id` | `ItemsController` | `findOne` | Get a single item by ID |
| `PATCH` | `/items/:id` | `ItemsController` | `update` | Update an item owned by the authenticated user |
| `POST` | `/items/analyze-photo` | `ItemsController` | `analyzePhoto` | Analyze an item photo and/or hint text to generate structured catalog metadata |
| `GET` | `/items/me` | `ItemsController` | `findMine` | List all items owned by the authenticated user |
| `GET` | `/items/mine` | `ItemsController` | `findMine` | List all items owned by the authenticated user |
| `POST` | `/items/upload-image` | `ItemsController` | `uploadImage` | Upload a base64 item image to Supabase Storage |
| `GET` | `/notifications` | `NotificationsController` | `listUserNotifications` | List user notifications with unread count |
| `DELETE` | `/notifications/:id` | `NotificationsController` | `deleteNotification` | Delete a notification |
| `PATCH` | `/notifications/:id/read` | `NotificationsController` | `markAsReadPatch` | Mark a notification as read (PATCH) |
| `POST` | `/notifications/:id/read` | `NotificationsController` | `markAsReadPost` | Mark a notification as read (POST) |
| `PATCH` | `/notifications/read-all` | `NotificationsController` | `markAllAsReadPatch` | Mark all unread notifications as read (PATCH) |
| `POST` | `/notifications/read-all` | `NotificationsController` | `markAllAsReadPost` | Mark all unread notifications as read (POST) |
| `GET` | `/notifications/unread-count` | `NotificationsController` | `getUnreadCount` | Get total unread notifications count |
| `GET` | `/proposals` | `ProposalsController` | `listMyRoutes` | List all barter proposals where the authenticated user is initiator or participant |
| `POST` | `/proposals` | `ProposalsController` | `proposeRoute` | Create exchange proposal, lock involved items, and notify participants |
| `GET` | `/proposals/:id` | `ProposalsController` | `getRouteById` | Get a single proposal by route ID or human-readable SW-XXXX code |
| `POST` | `/proposals/:id/cancel` | `ProposalsController` | `cancelRoute` | Cancel a pending swap route proposal (initiator only) and unlock its items |
| `POST` | `/proposals/:id/complete` | `ProposalsController` | `completeRoute` | Confirm delivery and finalize a confirmed circular swap route proposal |
| `POST` | `/proposals/:id/respond` | `ProposalsController` | `respondToRoute` | Accept or reject a proposed swap route step with distributed consensus transitions |
| `GET` | `/routes` | `RoutesController` | `listMyRoutes` | List all persisted swap routes where the authenticated user is initiator or participant |
| `GET` | `/routes/:id` | `RoutesController` | `getRouteById` | Get a single persisted swap route by ID or code |
| `POST` | `/routes/:id/cancel` | `RoutesController` | `cancelRoute` | Cancel a pending swap route proposal (initiator only) and unlock its items |
| `POST` | `/routes/:id/complete` | `RoutesController` | `completeRoute` | Confirm delivery and finalize a confirmed circular swap route, updating items and eco metrics |
| `POST` | `/routes/:id/propose` | `RoutesController` | `proposeRouteById` | OpenAPI path-compatible endpoint to propose a discovered circular swap route |
| `POST` | `/routes/:id/respond` | `RoutesController` | `respondToRoute` | Accept or reject a proposed swap route step with distributed consensus transitions |
| `POST` | `/routes/find` | `RoutesController` | `findRoutesAlias` | Alias endpoint to discover multi-hop circular swap routes |
| `POST` | `/routes/propose` | `RoutesController` | `proposeRoute` | Propose a circular swap route, lock involved items, and notify participants |
| `POST` | `/routes/search` | `RoutesController` | `searchRoutes` | Discover optimal 2-, 3-, and 4-hop circular swap routes matching the user objective |
| `GET` | `/users/me` | `UsersController` | `getMe` | Get authenticated user profile |
| `PATCH` | `/users/me` | `UsersController` | `updateMe` | Update authenticated user profile |
| `POST` | `/users/me/avatar` | `UsersController` | `uploadAvatar` | Upload the authenticated user profile photo |
| `GET` | `/users/me/stats` | `UsersController` | `getMeStats` | Get authenticated user statistics and operational metrics |

## 3. Backend Modules (`api/src/modules/`)
- **`auth/`**: `auth.controller.ts`, `auth.service.ts`, `dto/` — Register, JWT login, `GET /auth/me`.
- **`users/`**: `users.controller.ts`, `users.service.ts`, `mappers/user.mapper.ts` — Profile updates, stats.
- **`items/`**: `items.controller.ts`, `items.service.ts`, `storage/supabase-storage.service.ts` — Item CRUD & uploads.
- **`routes/`**: `routes.controller.ts`, `routes.service.ts`, `engine/swap-graph.engine.ts`, `engine/route-scoring.strategy.ts` — Bounded DFS cycle finder (k=2,3,4) & atomic swap consensus.
- **`ai/`**: `ai.controller.ts`, `services/ai-vision.service.ts`, `services/ai-explainer.service.ts`, `services/openai-client.service.ts` — OpenAI vision, valuation, and route explanation.
- **`health/`**: `health.controller.ts` — DB probe and service liveness check.
- **`geo/`**: `geo.controller.ts`, `geo.service.ts`, `data/colombia-municipalities.ts` (DANE, generated) — public municipality lookup, GPS resolve and radius queries; users and items carry `departmentCode`/`municipalityCode`.
- **`notifications/`**: `notifications.controller.ts`, `notifications.service.ts`, `mappers/notification.mapper.ts` — In-app notification center (list, unread count, read, delete).
- **`common/` & `prisma/`**: `jwt-auth.guard.ts`, `zod-validation.pipe.ts`, `prisma.service.ts` (soft-delete/logging).

## 4. Mobile Architecture (`mobile/src/`)
- **Services (`services/`)**: `http/apiClient.ts` (sole HTTP client), `auth/`, `items/`, `routes/`, `ai/`, `notifications/`, `geo/` (departments, municipalities, GPS resolve), `storage/tokenStorage.ts`, `storage/preferencesStorage.ts` (theme/locale/search area). Prices: `utils/currency.ts` (COP). Location UI: `components/LocationPicker.tsx`, `LocationScopeSelector.tsx`.
- **State (`context/`)**: `AppContext.tsx` (swaps, active routes, mock fallback), `ThemeContext.tsx` (default `light`).
- **Screens (`screens/`)**: `SplashScreen`, `LoginScreen`, `RegisterScreen`, `HomeScreen`, `ExploreScreen`, `PublishScreen`, `SearchingScreen`, `RouteResultsScreen`, `RouteDetailScreen`, `ConfigureSwapScreen`, `ProposalConfirmScreen`, `TradesScreen`, `NotificationsScreen`, `ProfileScreen`.
- **i18n & Theme**: `i18n/es.ts` (source of truth, `TranslationSchema`) + `i18n/en.ts`; default `es`/`light`, persisted as `smartswap_locale` / `smartswap_theme`; use `hooks/useTranslation.ts`. Catalog values stay Spanish, labels via `catalog.*`. Brand: Primary `#00685f`, Accent `#fd761a`.

## 5. Architectural Guardrails (Zero Spaghetti)
1. **Graph-First**: Consult this code map first. Do NOT scan `node_modules`, `dist`, or build folders.
2. **Backend**: Strict flow: `dto/` (Zod validation) -> `controller` (`JwtAuthGuard`) -> `service` (Prisma `$transaction`) -> `mapper`.
3. **Frontend**: Components must never call `fetch()` directly; always route through `apiClient.ts` services.
4. **Security**: Never expose `passwordHash`. Never place private API keys in `mobile/`.
5. **Git Discipline**: Atomic Conventional Commits (`feat(scope): ...`, `fix(scope): ...`), one responsibility per commit.
