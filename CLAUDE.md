# europe-pmc-search

## About
Search front end for the Europe PMC REST API with an AND / OR / NOT query builder. Vue 3 + Vite + TypeScript.

## Plans
Plans live in `.claude/plans/`. Check `.claude/plans/index.md` for the active plan and only load that file into context — don't load all plan files.

## Project-specific rules
- Vue 3 Composition API with `<script setup>` and TypeScript.
- UK English in all UI text.
- Accessibility first: semantic HTML, labelled controls, visible focus, `aria-live` for result updates.
- Never use `v-html` on API data.
- Tests use Vitest and Vue Test Utils with mocked `fetch`, never the live API. Use the JSON in `src/__fixtures__/` for tests and offline dev.
- Never commit, quote or reference anything in docs-private/ in tracked files.
- Keep commits small and explanatory: reviewers read the history to judge the AI-assisted work.
- Work in small steps and stop for review after each one.

## Key files
- `src/__fixtures__/results-page.json`, `src/__fixtures__/zero-results.json` — sample API responses
