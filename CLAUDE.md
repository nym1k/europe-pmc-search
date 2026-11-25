# europe-pmc-search

Search front end for the Europe PMC REST API with an AND / OR / NOT query builder. Vue 3 + Vite + TypeScript.

## Commands
- `npm run lint` runs `vue-tsc -b`. The root tsconfig only holds project references, so `vue-tsc --noEmit` checks nothing; keep the `-b`.
- `npm test` runs Vitest once in jsdom (config is the `test` block in `vite.config.ts`).
- CI (`.github/workflows/ci.yml`) runs lint, tests and build on every PR.

## Code
- Vue 3 Composition API with `<script setup>` and TypeScript.
- UK English in all UI text.
- Accessibility first: semantic HTML, labelled controls, visible focus, `aria-live` for result updates.
- Render API data as text through template interpolation; `v-html` stays out of the codebase.
- Europe PMC operators are UPPERCASE: `AND`, `OR`, `NOT`.

## Tests
- Vitest and Vue Test Utils, with tests beside the code as `*.spec.ts`.
- Mock `fetch` and use the saved responses in `src/__fixtures__/` (`results-page.json`, `zero-results.json`). Tests never call the live API.

## Workflow
- Work is split into GitHub issues; each gets a `<n>-<slug>` branch and a PR with `Closes #n`. `main` only changes through PRs.
- Ideas outside the current issue become an issue labelled `later` and are not built.
- Work in small steps and stop for review after each one. Keep commits small, one change each, with a message that says why.
- When `.claude/plans/index.md` exists, it names the active plan; load only that plan file.
