# SmartSwap Mobile

SmartSwap is a mobile-first circular bartering platform prototype built with React and TypeScript. Instead of traditional 1-to-1 exchanges, SmartSwap discovers multi-user circular trade loops (e.g., Bicycle -> Ball -> Headphones -> Laptop -> Camera) so that everyone gets what they desire without spending money.

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3.4 (with customized design system tokens)
- **Routing**: React Router v6
- **Typography**: `@fontsource/plus-jakarta-sans`, `@fontsource/inter`
- **Icons**: `material-symbols`
- **Utilities**: `clsx`
- **Quality & Tooling**: ESLint + Prettier

## Folder Structure

```text
design/
  stitch-reference/       # Visual reference from Stitch (read-only)
src/
  assets/                 # Local SVGs for logos, avatars, and item thumbnails
  components/
    ui/                   # Primitive reusable UI atoms (Button, Input, Badge, Avatar, Chip, Icon)
    BottomNav.tsx         # Mobile bottom navigation bar
    ObjectCard.tsx        # Item feed & catalog card
    TopBar.tsx            # Header bar with navigation and notifications
  data/
    mockData.ts           # Strict typed mock users, items, and circular chains
  layouts/
    AppLayout.tsx         # Main frame (TopBar + BottomNav + 390px desktop frame)
    AuthLayout.tsx        # Authentication layout (clean 390px container)
  screens/
    ConfigureSwapScreen.tsx # Multi-step "Lo que ofreces" / "Lo que deseas recibir"
    ExchangesScreen.tsx   # Exchanges placeholder
    ExploreScreen.tsx     # Explore placeholder
    HomeScreen.tsx        # Discovery feed with circular route visualizer
    LoginScreen.tsx       # Authentication screen with demo mode
    NotificationsScreen.tsx # Notifications placeholder
    ProfileScreen.tsx     # User profile placeholder
    PublishScreen.tsx     # Publish item placeholder
    SearchingScreen.tsx   # Searching routes simulation placeholder
  services/
    swapService.ts        # Async data access layer simulating network latency
  types/
    index.ts              # Domain models (User, Item, SwapRoute, Proposal)
  App.tsx                 # Root application component
  main.tsx                # React 18 bootstrap
  router.tsx              # Application route definitions
  index.css               # Global styles, fonts, safe area utilities
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`. On desktop screens, it automatically renders inside a centered 390px mobile phone frame.

### 3. Verification & Linting

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```
