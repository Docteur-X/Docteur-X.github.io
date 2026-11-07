# Increment 4 — Persistence milestone closure (2026-11-05)

## Scope and baseline

Closes the compact-history persistence milestone following Increment 3.1. The confirmed pre-closure baseline was 196 Node tests and 15 Chromium Playwright tests on Windows. No mathematical transformation rules, import/export schema, or IndexedDB behavior were changed in Increment 4.

## Code correction

`reserveNodeIds` now traverses `FunctionCall.arguments` in addition to the existing `operands`, `left`, `right`, `operand`, and `child` relationships. This prevents allocating a duplicate `node-N` after restoring a future-compatible function-call AST. New tests exercise direct reservation and reservation through mathematical documents.

## Verification

- Increment 4: 200/200 Node tests passed locally (Node v22.16.0).
- Existing Increment 3.1: 15/15 Chromium browser tests passed on the user's Windows machine; not rerun for this release.
- Added four closure tests: function-call ID reservation, document reservation, empty document/object compact round trips, and historical fixture compatibility.
- The ZIP must be tested by running `npm ci`, `npx playwright install chromium`, `npm test`, `npm run test:mutation`, and `npm run test:e2e` on the user's machine.

## Installation and lockfile caveat

The inherited `package-lock.json` has dependency versions and resolved URLs but lacks npm-generated `integrity` hashes. The user's prior installation required `npm install --package-lock-only` before `npm ci`. This environment does not have npm, so it cannot regenerate or independently verify the lockfile. We retain the inherited lockfile rather than inventing hashes or claiming a reproducible clean installation. Run `npm install --package-lock-only` once with npm and commit the generated lockfile in the next verified release. A lockfile consistency checker is provided in `scripts/check-release-lock.js`.

## Known limitations and future work

- The legacy-v1 fixture was synthesized using project APIs, not recovered from an original user export.
- Large-history cumulative memory and replay costs remain a performance consideration.
- A root with no committed history is supported as a draft; persistence policy may need refinement for future workflows.
- Structural replay integrity is not a mathematical proof checker.
- Document-level undo/redo, copy provenance, and cross-object transformations are outside this milestone.

## Next milestone

Design **Copy as New Mathematical Object** with fresh occurrence IDs, explicit source provenance, and document-level operation semantics. Prefer incremental expression-tree edits that preserve existing node IDs rather than rebuilding whole trees.
