---
name: atomic-commits
description: Workflow for splitting multi-file changes into granular, single-responsibility Conventional Commits (`build`, `feat`, `refactor`, `test`, `docs`, `chore`) and verifying git status cleanliness.
---

# Atomic Commits Skill

## Overview
This skill guides agents in splitting complex, multi-file code modifications into clean, isolated, single-responsibility Conventional Commits. It ensures repository history remains reversible, legible, and bisectable.

## When to Use
- When completing a phase of work or preparing to commit changes.
- When multiple files across backend, mobile, tooling, or docs have been edited.
- Before submitting a pull request or ending a session.

## Commit Types & Scopes

### Types
- `feat`: A new user-facing feature or API endpoint.
- `fix`: A bug fix.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding or updating automated tests.
- `docs`: Documentation updates or OpenAPI updates.
- `chore`: Maintenance tasks, config changes, dependency bumps.
- `build`: Changes affecting build systems, packaging, or tooling scripts.

### Common Scopes
- `(routes)` / `(mobile-routes)`: Swap route graph engine, scoring, route services, or UI screens.
- `(auth)` / `(mobile-auth)`: Authentication controllers, JWT guards, login/register UI.
- `(items)` / `(mobile-items)`: Item management, photo uploads, item cards.
- `(ai)` / `(mobile-ai)`: OpenAI integrations, vision analysis, route explanation.
- `(notifications)`: In-app and push notifications.
- `(tooling)`: Scripts such as `graphify.mjs`, agent skills, linters.

## Workflow

### Step 1: Inspect Staging Area
Run:
```bash
git status -s
```
Identify each distinct logical responsibility among the modified and untracked files.

### Step 2: Group by Responsibility
Group files into separate commits. Never combine unrelated changes:
- Do NOT combine tooling (`scripts/`) with product code (`api/` or `mobile/`).
- Do NOT combine backend service logic with frontend UI components in a single commit.
- Do NOT combine tests with refactoring if the refactoring is broad.

### Step 3: Stage and Commit Atomically
Stage only the files belonging to the first group:
```bash
git add <file1> <file2>
git commit -m "<type>(<scope>): <concise description>"
```

Repeat for subsequent groups:
```bash
git add <file3>
git commit -m "<type>(<scope>): <concise description>"
```

### Step 4: Verify Clean State
Ensure no accidental untracked or temporary files remain:
```bash
git status
```
The working tree must be clean.
