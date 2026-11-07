# Equality Function Application v1 — developer handover

## Educational purpose

The equality sign is an *interactive relation*, not punctuation. The student deliberately arms it with an operation, then applies a remembered scalar expression to **both** sides. This is the first cross-document mathematical use of the session clipboard. The source document and clipboard are never mutated. The result remains a proposal until confirmed.

## Scope and known limitations

- Supported: right addition `x -> x+c`, left multiplication `x -> cx`, right multiplication `x -> xc` for scalar expressions. The menu visibly disables subtraction, division and arbitrary `f(x)` pending mathematical semantics and domain checks. These disabled controls are **not** implemented features.
- The Engine returns a **forward implication**, not a universal reversible equivalence. Multiplication by zero, for example, loses information about solutions. Addition in the present scalar domain is reversible.
- The present `isScalarExpression()` check is syntactic: the language currently assumes symbols are scalars. It is not a future-proof proof of scalar type. Matrix types, shape compatibility, assumptions and domains must be checked by a future typed operation system before enabling them.
- One root `Equal` is displayed in the active view. Future compound statements and multiple relations per window require arming keyed by relation ID and a richer relation-specific drop resolver.
- A clipboard expression may come from another document. It is captured as an independent snapshot, and two **new** occurrences are created in the transformed equation. Original equality/side identities remain stable.
- Subtree drops are reserved for future *equality-justified substitution*. A drop on a subtree does not silently fall back to the armed equality action. A drop on `=` or relation background is a relation-level action.
- The UI offers a keyboard/click alternative in the equality menu: **Use selected clipboard expression**. Pointer dragging from a clipboard item also works on touch/mouse/stylus; a tap selects the item.
- Current preview uses a native `<dialog>` for deliberate confirmation. We intentionally do not rerender the real equation during preview.

## Module boundaries

- `js/relations/equalityFunctionApplication.js`: pure Engine function-context application; input validation, AST construction, new IDs, provenance. No DOM, gestures, clipboard service or browser state.
- `js/manipulator/equalityFunctionGesture.js`: DOM-free frozen action request. It records the intended relation, context, clipboard entry and revision; no mathematics.
- `js/app.js`: temporary arming state, accessible operation menu, pointer hit-test, preview lifecycle, stale-state rejection and commit through the existing branching history API.
- `js/core/clipboardLibrary.js`: unchanged session-wide snapshot library.
- `js/rendering/domRenderer.js`: unchanged mathematical renderer. The app decorates its existing equals-sign DOM element with a transient menu without altering AST layout.

## Information flow

1. Student copies an expression; the clipboard stores its immutable AST snapshot.
2. Student clicks `=` and chooses `+`, `c·` or `·c`. The chosen option can be clicked again to disarm. Arming does not create a history event.
3. Student drags a clipboard item to `=`/relation background, or uses the accessible menu alternative.
4. Gesture adapter freezes an action request. Engine applies the corresponding one-hole function context to both sides, producing a fresh candidate tree.
5. A modal preview shows the candidate. Cancel leaves mathematics and history unchanged.
6. Confirm checks document ID, object ID, history cursor, equality ID **and complete source AST fingerprint** to reject stale proposals. Only then does the candidate become the live root and one history event record the context, source and captured operand.

## Verification

- `npm test`: existing 210 Node tests plus four focused Engine/gesture tests (214 total).
- `npm run test:e2e`: existing 19 browser tests plus two new relation-menu/preview tests (21 expected). Browser tests require Chromium installed locally and have not been executed in this environment.
- `npm run test:mutation`: existing distribution mutation probe, not altered by this milestone.

## Next steps (not prerequisites)

1. Verify on real touch hardware that clipboard drag works and menu targets are large enough.
2. Design the *mathematical* semantics of subtraction/division, including nonzero conditions, domain and solution-set preservation. Do not simply expose enabled buttons.
3. Add typed contexts for matrices and other noncommutative structures, preserving explicit left/right placement and shape constraints.
4. Implement justified substitution independently, with priority for specific subtree targets and no automatic fallback to relation application.
5. Generalize relation capabilities to inequalities, divisibility and logical statements. Function monotonicity/injectivity must be justified under explicit domains and assumptions, not unconditional metadata.
6. Support per-relation arming when a window displays multiple equations; keep view focus and mathematical state independent.
7. Continue long-term plans: mathematical windows with multiple synchronized views, snapping, structured annotations and freeform worksheet ink. Presentation and annotation never change mathematical truth.

## Design rationale

The student's *intent* belongs to a gesture adapter; mathematical eligibility belongs to the Engine; history stores the result only on deliberate confirmation. This keeps the application extensible for richer mathematics while protecting stable node identities and educationally meaningful previews. Do not add mathematical rules directly to `app.js`.
