# Factorisation — Manipulator architecture migration

**Status:** Implemented in the architecture-v1 migration; browser verification pending.

## Ownership

- `operations/factorisation.js` remains the DOM-free authority for common-left/common-right matching, transformation construction, stable IDs, and provenance.
- `teaching/factorisationPolicy.js` independently restricts extraction to a visually established scope. This is not a mathematical restriction.
- `manipulator/factorisationGesture.js` turns the eligible selection/extraction gesture into a frozen, DOM-free action request. It does not calculate a result.
- `manipulator/transformationCoordinator.js` dispatches the request to the Engine; `app.js` currently registers a small factorisation-specific adapter which verifies the selected factors, direction, products and teaching policy and constructs one independent proposed tree.
- `manipulator/factorisationVisual.js` describes the semantic source and destination IDs. Existing `interaction/factorisationPreview.js` and `interaction/transformationPreview.js` continue drawing the extraction zone and the one-line faded-factor/amber-arrow explanation.
- `manipulator/previewCoordinator.js` guards against committing a proposal after the history cursor changes. The mathematical plan and teaching scope are also rechecked on confirmation; the proposed AST is **not** reconstructed, preserving preview node IDs.
- Document/history are updated only after confirmation. Cancellation preserves the original expression and selection.

## Boundaries and future work

The shared coordinator and preview contracts are intentionally generic, but the existing pointer geometry and overlay are retained to avoid regressing the stable interaction. Factorisation is not a special case in the renderer. Future extraction gestures can use the same request contract, including menu and keyboard invocation. A broader interaction-controller refactor can move the remaining application orchestration out of `app.js` after browser tests.

## Browser regression checklist

1. Extract common left factors from `(a*b+a*c)` and right factors from `(b*a+c*a)`; inspect fading, arrows, amber factor and confirmation.
2. Confirm that unbracketed `a*b+a*c` is blocked by the default teaching policy, but mandatory parentheses under multiplication remain eligible.
3. Cancel a preview and confirm that selected factors, node IDs and history are unchanged.
4. Factorise within both sides of an equation; confirm that the opposite side remains intact.
5. Switch objects or restore history during/after a preview; verify that no stale proposal commits.
