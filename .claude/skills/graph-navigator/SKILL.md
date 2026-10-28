---
name: graph-navigator
description: Instructions on using `npm run graphify` and reading `docs/graph/CODE_MAP.md` to locate any endpoint, service, or screen in 1 step with minimal token usage.
---

# Graph Navigator Skill

## Overview
This skill guides agents in navigating the SmartSwap AI monorepo using a **Graph-First** methodology. By checking the architectural map and module graph before opening files, agents reduce context consumption by 70% or more.

## When to Use
- At the start of ANY task involving finding, debugging, or adding endpoints, services, or screens.
- When an agent is unsure which file owns a specific route, database model, or UI screen.
- After adding or refactoring modules to keep the architecture map in sync.

## Workflow

### Step 1: Read the Compact Code Map
Before listing files or searching directories, read:
```bash
docs/graph/CODE_MAP.md
```
This single file (< 150 lines) contains:
1. Complete table of all REST endpoints, HTTP methods, controllers, and handlers.
2. Backend module structure (`api/src/modules/`).
3. Frontend screen and service catalog (`mobile/src/`).
4. Core architectural constraints.

### Step 2: Query the Machine-Readable Graph (If Needed)
For deeper dependency inspection, check `docs/graph/CODE_GRAPH.json`:
- Look up specific file exports and imports.
- Look up which files reference a given Prisma model (`User`, `Item`, `SwapRoute`, etc.).
- Inspect exact endpoint bindings.

### Step 3: Direct File Access (No Repo Scans)
- Jump directly to the relevant file based on the map.
- Avoid multi-file `grep` across the entire repository.
- Never inspect `node_modules/`, `dist/`, `build/`, or `.git/`.

### Step 4: Refreshing the Graph
Whenever new endpoints, controllers, services, or screens are added, updated, or removed:
```bash
npm run graphify
```
Verify that `docs/graph/CODE_MAP.md` and `docs/graph/CODE_GRAPH.json` reflect the updates.
