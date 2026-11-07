# Preview Visual Consistency v1 — handover

## Purpose and baseline

This increment is based on Equality Function Application v1.2. It addresses the visually heavy amber background around copied operands during the inline equality preview. It does **not** change algebraic transformations, clipboard contents, identity allocation, gesture dispatch, or history commits.

## Design contract

- The distribution/factorisation amber palette (`--distribution-ink`, `--distribution-halo`, `--distribution-soft`) is the shared source of preview colours, with separate light and dark theme definitions.
- In an equality-function preview, **only the outermost inserted clipboard operand occurrence on each side** receives `.equality-inserted-operand`. Both are selected by their fresh AST node IDs in `js/app.js`; do not infer identity from printed symbols.
- Structural `Add`/`Multiply` wrappers created around the pre-existing equation sides remain neutral. Internal nodes of a compound clipboard expression do not acquire separate amber classes.
- The amber outline and halo are painted without changing box geometry, so mathematical hit-testing and layout are unaffected.
- Clicking an amber operand or the Confirm control commits the existing candidate; Cancel restores the original DOM and leaves history unchanged.

## Implementation locations

- `styles.css`: distribution colour variables and `.distribution-preview__copy` provide the reference vocabulary. The `.equality-inline-preview .equality-inserted-operand` rules now reuse those variables with a lightly mixed background, dashed outline and subtle halo. Avoid a solid amber fill on the whole compound subtree.
- `js/app.js`, `openEqualityApplication`: selects exactly two copied-operand root IDs from the engine result and assigns the visual class. No change made in this increment.
- `e2e/equality-function-application.spec.js`: a new computed-style test uses a compound operand, checks the shared ink colour, verifies two outlined copied occurrences, and checks cancellation without a history commit.

## Verification

- Node suite: 214/214 passing in the implementation environment (`node --test tests/*.test.js`).
- JavaScript syntax: checked.
- Browser suite: **not run here**; expected total 24 Playwright tests, including the new visual regression. Run `npm run test:e2e` in a browser-equipped environment and manually compare the appearance of distribution, factorisation and equality previews in light/dark themes.
- Browser screenshot/visual approval: pending user verification. The computed-style test does not replace visual review.

## Future architectural direction

Keep visual roles (new operand, existing operand, structural wrapper, confirmation target) separate from mathematical rules. Avoid introducing a new preview framework solely for colour consistency. The same visual semantics should eventually extend to other relations, function application, vectors and matrices without treating all generated AST nodes as newly introduced visible operands.

## Known limitations

The original v1.2 equality preview still re-renders the full proposed expression in place; this change only standardizes visual treatment. The browser suite has a previously observed intermittent history-navigation failure under high parallelism; do not attribute it to this CSS change without evidence. More complete image-based regression and physical touch-device review are future improvements.
