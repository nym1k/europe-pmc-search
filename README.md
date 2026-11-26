# Europe PMC search

A search page for the [Europe PMC](https://europepmc.org) literature database. You build a query from terms joined with `AND`, `OR` and `NOT`, see the query it produces as you type, and page through the results 25 at a time. Each result links to its Europe PMC article. It uses the public [Europe PMC REST API](https://europepmc.org/RestfulWebService) and is built with Vue 3, TypeScript and Vite.

## Requirements

- Node.js 22 (the version CI uses) and npm

## Commands

```sh
npm ci            # install dependencies from the lockfile
npm run dev       # start the dev server; Vite prints the URL (http://localhost:5173 unless that port is taken)
npm test          # run the unit and component tests once (Vitest, jsdom)
npm run lint      # type-check with vue-tsc
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
```

The tests never call the live API: they mock `fetch` with saved responses in `src/__fixtures__/`. CI runs lint, tests and build on every push and pull request.

## Project structure

- `src/utils/buildQuery.ts`: turns the builder's terms into a Europe PMC query string, with uppercase operators, quoting and brackets.
- `src/composables/useSearch.ts`: calls the search endpoint and handles cursor paging, loading, errors, cancelling and retry.
- `src/utils/cleanTitle.ts`: turns escaped markup in article titles into plain text.
- `src/components/QueryBuilder.vue` and `src/App.vue`: the search form with its live query preview, and the page that shows the count, results, paging and status messages.

Tests sit beside the code as `*.spec.ts`. [`CLAUDE.md`](CLAUDE.md) holds the project conventions given to the AI assistant used during development.

## Accessibility

The page was checked against WCAG 2.2 AA.

**How it was checked**
- axe-core (WCAG 2.0, 2.1 and 2.2 A and AA rules) in Chromium with saved API responses, on the first visit and the loading, results, no-results and error states, at 320, 375 and 1280px wide: no violations.
- A keyboard-only pass: every control reached with Tab and used with Enter or Space, with focus checked after each action.
- VoiceOver in Safari, keyboard only: searching, paging, no results and errors were each announced once, and the rotor listed the expected headings and landmarks.
- Component tests cover the live region text, focus after paging and retrying, and the result range.

**What passes**
- Tab order follows the visual order, and a 3px focus outline shows on every control, including the Results heading when focus moves there after paging.
- Focus is managed: adding a term focuses it, removing one focuses the previous term, paging moves focus to the Results heading, a failed page change or retry leaves focus on the button pressed, and a new search leaves focus in the form.
- One polite live region announces loading, the result range, no results and errors.
- Contrast: body text 17:1, secondary text 8.8:1, links and focus ring 6.4:1, errors 6.5:1, control borders 5.2:1.
- No horizontal scrolling at 320px; every control is at least 24 by 24px.
- Forced colours keep focus outlines, borders, disabled buttons and the loading spinner visible.
- One `h1`, then `h2` and `h3` with no skipped levels; `main`, a labelled search form and a labelled results navigation; page title "Search Europe PMC", language `en-GB`.

**Fixed during development**
- A new search that cancelled a page still loading moved focus to the Results heading; focus now stays in the form.
- Retry removed itself while retrying, which dropped focus; it now stays until the retry finishes.
- VoiceOver skipped a repeated error because the text was unchanged; repeat failures now name their attempt ("attempt 2").
- Loading and errors only showed at the top of the page, out of view after pressing Next; they are now repeated above the paging buttons (hidden from screen readers, which hear the live region), with the result range there otherwise.
- In forced colours the spinner looked frozen; its moving segment now uses the system highlight colour.

**Accepted**
- On page 2, VoiceOver reads a result as "26" and "1 of 25". Both are true: the visible number is the overall position, VoiceOver's count is the position on the page.
- The operator select keeps the browser's native styling: native controls are exempt from the 3:1 border rule, and they are the most robust for keyboard, VoiceOver and forced colours.
- Before Safari 16 (no CSS subgrid), result numbers sit above each result instead of beside it.

**Not checked**
- A real Windows contrast theme; forced colours were checked with Chromium's emulation only.

Known gaps are listed in [`NOTES.md`](NOTES.md#limitations-and-next-steps).
