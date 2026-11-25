# Phase 1 — Foundations and query builder

**Status**: active
**Started**: 2026-11-25
**Completed**: --

## Goal
Set up minimal test tooling, then build a pure, unit-tested `buildQuery(terms)` function and a simple builder UI that uses it. No API calls yet. Stop for review after each step.

## Tasks
- [ ] Step 1: Add Vitest and Vue Test Utils (keep Vite defaults, no extra lint config). Stop for review.
- [ ] Step 2: Write `buildQuery(terms)` unit tests first, then the implementation. Stop for review.
  - No operator on the first term
  - NOT can't be the first term
  - Quote multi-word terms; strip or escape quotes the user types
  - Bracket mixed AND/OR left to right: `((a AND b) OR c)`
  - Trim whitespace and ignore empty terms
  - Never output a dangling operator
- [ ] Step 3: Simple builder UI that uses `buildQuery`. Stop for review.

## Decisions
- Operators are UPPERCASE AND / OR / NOT (Europe PMC syntax).
- No API calls in this phase.

## Notes
- Builder rules are listed under Step 2.
