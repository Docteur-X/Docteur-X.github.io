# Working-state isolation — 604 Node tests

## Finding

`loadActiveObject()` cloned the AST but assigned `state.history = object.history` and shallow-copied `object.substitutions`. These references could mutate a published document snapshot without replacing its identity. The workspace save coordinator relies on snapshot identity to distinguish saved and unsaved versions. This was a real boundary violation, not merely a stylistic issue.

## Change

`js/core/objectWorkingState.js` now constructs an independent editable AST, history and substitution map from the active committed object. `js/app.js` uses that boundary when loading objects. The document controller and save coordinator remain unchanged. The helper has no DOM, storage, preview or gesture dependencies. AST cloning retains node identities; it does not regenerate IDs.

## Tests

`tests/objectWorkingState.test.js` covers detached editing and independent empty states. Full Node suite: 604/604 passed using `node scripts/run-node-tests.mjs`; documentation links: 410/410 passed. Browser Playwright verification is pending for this increment; the user reported that the preceding 602-test version passed.

## Remaining risks and next steps

1. Inspect other paths that assign document-owned history/substitution references into mutable application state, including history restoration and import.
2. Verify object switching, editing, undo/history branching and save/reload in Playwright.
3. Do not add a document revision counter or read-only proxy unless a remaining concrete identity violation warrants it.
4. Consolidate authoritative documentation after validating the architecture; historical files are reference only.
