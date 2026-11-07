# Equality Function Application v1.3.2 — Visual and Grouping Corrections

## Purpose and scope

This release corrects three problems observed in actual student-facing screenshots: inserted operand previews lacked a sufficiently visible glow, copied compound products were not explicitly grouped, and the armed-operation indicator appeared after the whole equality instead of above the equals sign. This is a targeted change, **not** Transformation Feature Contract v1 or the broader application architectural consolidation.

## Mathematical versus educational responsibilities

- `js/relations/equalityFunctionApplication.js` remains the pure mathematical rule: applying a one-hole context to both sides of an equality is a *forward implication*. It creates two fresh operand occurrences and preserves the original side identities. It does not know about the DOM or the clipboard UI.
- `js/teaching/equalityGroupingPolicy.js` owns **optional** grouping of newly introduced compound operands. Default `group-compound` introduces a genuine `Group` AST node around a copied multi-term `Add` or `Multiply`. `minimal` does not introduce that optional Group. An existing Group is not wrapped again. A parser-produced one-child Add around a product or Group is unwrapped before applying the policy.
- **Mandatory** parentheses are never delegated to teaching preference. `operatorMetadata.needsAutomaticBrackets()` and `domRenderer.js` display the parentheses required for correct reading, including an original sum inside a new product. They need not become user-removable Group nodes.
- This version exposes the teaching policy through an optional Engine argument; a user-facing settings control is *not* yet implemented. The application uses the documented default. The chosen policy is recorded in rule provenance for future audit/replay decisions.

Examples: adding a copied `3yz` to `a=b` displays `a+(3yz)=b+(3yz)` under the default policy. Multiplying `a+b=d` by copied `3yz` on the right displays `(a+b)(3yz)=d(3yz)`. The first parentheses in the latter are mandatory precedence notation, while the copied product parentheses come from an explicit Group. Neither example automatically simplifies the expression.

## Renderer and interaction contracts

- `domRenderer.js` alone assigns `equality-inserted-operand` to the **outermost inserted occurrence** using Engine-supplied node IDs; the application does not traverse the DOM to guess which operands are new.
- `styles.css` gives that hitbox a visible amber border, inset dashed accent and luminous outer halo while leaving nested hitboxes and original operands neutral. This is a preview-only visual role and does not alter ASTs, history, or hit-testing geometry.
- `js/app.js` attaches the purely presentational `relation-armed-indicator` *inside* the equals-sign element. CSS absolutely positions it above the sign without adding a mathematical operand or changing the equation's flex layout. `paintEqualityArming()` updates the actual portal menu buttons' `aria-pressed` state; clicking the armed option again disarms it.
- The existing in-place preview, cancellation, revision checks, and history commit are unchanged.

## Tests and verification

Run `npm test` (218 Node tests expected) and `npm run test:e2e` (26 Chromium browser tests expected). New Node tests cover optional grouping of products, preservation of original node IDs, minimal policy, rejection of unknown policy values, and multiplication grouping. A browser regression checks the position of the armed badge relative to the equals sign, and the amber-style test checks the new solid outer border plus halo. **Browser tests must be run on a machine with Playwright installed; Node tests passing alone do not establish visual correctness.** Inspect both light and dark themes on actual hardware.

## Future development and handover

Do not use optional Group nodes to assert new mathematical facts. Future settings may select `minimal` or `group-compound` per teacher preference; doing so must never suppress mandatory precedence parentheses. Before adding arbitrary functions, division, matrices, or inequalities, implement explicit domain/type/assumption checks and distinguish implication from equivalence. The next separate milestone is Transformation Feature Contract v1 and application-level consolidation; do not expand `app.js` with additional feature-specific preview systems. Preserve student agency, stable node identities, offline accessibility, and low-resource performance.
