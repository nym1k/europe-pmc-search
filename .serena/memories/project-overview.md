# europe-pmc-search

Search front end for the Europe PMC REST API (`https://www.ebi.ac.uk/europepmc/webservices/rest/search`) with an AND / OR / NOT query builder.

## Stack
- Vue 3 (Composition API, `<script setup>`) + TypeScript, Vite
- Vitest + Vue Test Utils (being added in Phase 1)

## Structure
- `src/` — `App.vue`, `main.ts`, `components/`, `assets/`
- `src/__fixtures__/` — saved API responses (`results-page.json`, `zero-results.json`) for tests and offline dev
- `.claude/plans/` — flat, canonical format; `index.md` has the `**Active plan**:` pointer
- `docs/` — `project-overview.md`, `doc-queue.md`

## Phase 1: Foundations and query builder (active)
Plan file: `.claude/plans/phase-01-foundations-and-query-builder.md`
1. Add Vitest + Vue Test Utils (Vite defaults, no extra lint config)
2. Pure `buildQuery(terms)` — tests first. Rules: no operator on the first term, NOT can't be first, quote multi-word terms, strip or escape user quotes, bracket mixed AND/OR left to right `((a AND b) OR c)`, trim and ignore empty terms, never output a dangling operator
3. Simple builder UI that uses `buildQuery`
No API calls yet. Stop for review after each step.

## Conventions
See CLAUDE.md: UK English, accessibility first, no `v-html` on API data, tests mock `fetch` (never the live API), small explanatory commits.

## Setup state (audited 2026-11-25)
Identity pre-commit hook installed (no Husky). Registered in proj picker. No ticket tracker.
