# europe-pmc-search — overview

Search front end for the Europe PMC REST API (`https://www.ebi.ac.uk/europepmc/webservices/rest/search`), with a query builder for AND / OR / NOT terms.

## Stack
- Vue 3 (Composition API, `<script setup>`) + TypeScript
- Vite
- Vitest + Vue Test Utils (planned, Phase 1)

## Structure
- `src/` — app source (`App.vue`, `main.ts`, `components/`, `assets/`, `__fixtures__/`)
- `src/__fixtures__/` — saved API responses (`results-page.json`, `zero-results.json`) for tests and offline dev
- `public/` — static assets

## Phases
| Phase | Goal | Status |
| --- | --- | --- |
| 1. Foundations and query builder | Test tooling, `buildQuery(terms)` with unit tests, simple builder UI. No API calls. | active |
