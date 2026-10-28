---
name: quality-gates
description: Standard checklist for running `typecheck`, `test`, `build`, and `npm run graphify` across `api` and `mobile` workspaces.
---

# Quality Gates Skill

## Overview
This skill provides the comprehensive checklist and execution sequence for validating code changes across both backend (`api`) and frontend (`mobile`) workspaces before staging, committing, or deploying.

## When to Use
- Before creating a commit or finalizing an architectural phase.
- After modifying TypeScript types, DTOs, or service contracts.
- Before opening or merging pull requests.

## Quality Gate Checklist

### Gate 1: Architecture Graph Synchronization
Whenever routes, controllers, or modules are added or modified:
```bash
npm run graphify
```
- **Validation**: Confirm `docs/graph/CODE_MAP.md` is updated and remains under 150 lines.
- **Validation**: Confirm `docs/graph/CODE_GRAPH.json` is valid JSON.

### Gate 2: Static Type Checking
Run strict TypeScript checks across both workspaces:
```bash
npm run typecheck
```
- Or individually:
  - Backend: `npm --workspace=api run typecheck` (`tsc --noEmit`)
  - Mobile: `npm --workspace=mobile run typecheck` (`tsc --noEmit`)
- **Criteria**: Zero TypeScript compilation errors, zero `any` regressions.

### Gate 3: Automated Test Execution
Run test suites across both workspaces:
```bash
npm run test:api
npm run test:mobile
```
- **Criteria**: All unit tests pass. No broken assertions or mocked regressions.

### Gate 4: Production Build Verification
Ensure both workspaces bundle cleanly:
```bash
npm run build:api
npm run build:mobile
```
- **Criteria**: NestJS compiles to `api/dist/`, Vite bundles to `mobile/dist/` with no packaging errors.

### Gate 5: Security & Hygiene Audit
Verify:
1. No secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) committed to git or exposed in `mobile/`.
2. No `passwordHash` exposed in any controller responses or DTOs.
3. Default theme is `light` and default language is `es`.
4. Working tree is clean: `git status`.
