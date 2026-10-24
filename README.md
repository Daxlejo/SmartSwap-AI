# SmartSwap Monorepo

SmartSwap is a circular bartering platform designed to discover multi-user exchange loops (e.g., *Bicycle → Ball → Headphones → Camera → Bicycle*), eliminating monetary transactions in favor of sustainable circular trade.

This repository is structured as an npm monorepo with workspace orchestration across the mobile client and backend API.

## Monorepo Architecture

```text
SmartSwap/
├── docs/
│   └── contract/
│       └── openapi.yaml       # OpenAPI 3.1 specification for SmartSwap API
├── mobile/                    # React 18 + Vite + Capacitor Android Application
│   ├── android/               # Native Android project & Gradle wrapper
│   ├── release/               # Compiled Android APKs
│   ├── scripts/               # Asset generation utilities
│   ├── src/                   # React source code (components, screens, services)
│   ├── capacitor.config.ts    # Capacitor native configuration
│   ├── package.json           # Mobile package workspace ("name": "mobile")
│   └── vite.config.ts         # Vite bundler configuration
├── package.json               # Monorepo root configuration & npm workspaces
├── .gitignore                 # Monorepo-wide git exclusion rules
└── README.md
```

> **Note:** The `api/` workspace is owned and maintained by the backend engineering team (Agent 1B) and conforms to `docs/contract/openapi.yaml`.

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+ recommended)
- Android SDK & JDK 21 (for native Android builds)

### Monorepo Root Scripts

From the repository root (`SmartSwap/`):

| Command | Description |
|---|---|
| `npm run dev:mobile` | Launch mobile Vite development server |
| `npm run build:mobile` | Typecheck and build mobile production bundle to `mobile/dist` |
| `npm run test:mobile` | Run mobile test suite (Vitest) |
| `npm run dev:api` | Launch NestJS API development server |
| `npm run build:api` | Compile NestJS backend API |
| `npm run test:api` | Run NestJS unit and integration tests |
| `npm run typecheck` | Run type checking across all workspaces |

---

## Mobile Application (`mobile/`)

The mobile client is built with:
- **Framework:** React 18 + Vite
- **Mobile Container:** Capacitor v8 (Android)
- **Styling:** Tailwind CSS v3.4 (Custom Design Tokens)
- **State & Routing:** React Router v6
- **Typography:** Inter, Plus Jakarta Sans

### Running Mobile Independently

```bash
cd mobile
npm install
npm run dev
```

### Mobile Verification & Typechecking

```bash
cd mobile
npm run typecheck
npm run build
```

### Android Native Build & APK

Refer to `mobile/GUIA_EQUIPO.md` for complete native build, ADB installation, and deployment instructions:

```powershell
cd mobile
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
cd ..
```

Compiled APK output: `mobile/release/SmartSwap-debug-v2.4.apk`.

---

## API Contract (`docs/contract/`)

The backend API contract is defined in `docs/contract/openapi.yaml` using the **OpenAPI 3.1.0** standard. It covers:
- `/health`: Health status & uptime probe
- `/auth/*`: Registration, login, token refresh, and user profile
- `/items/*`: Item CRUD and user inventory
- `/routes/*`: Circular barter graph algorithm discovery (`find`, `recommended`, `{id}`)
- `/notifications/*`: User notifications and mark-as-read endpoints
- `/proposals/*`: Direct and circular swap proposal lifecycle
