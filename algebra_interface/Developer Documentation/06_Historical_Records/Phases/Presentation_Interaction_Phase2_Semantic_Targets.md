# Phase 2: View-scoped semantic target resolver

## Purpose and mathematical authority

`js/rendering/semanticTargetResolver.js` indexes the renderer's DOM metadata against the current AST occurrence map. It is read-only: no mathematical wrappers, node IDs, rules, history, hitboxes, or geometry are generated. An occurrence can be navigable while not draggable. The mathematical object ID and view are explicit boundaries, preparing for independent views without implementing the Window Manager.

## Contract

Construct with `{ view, getRoot, getMathematicalObjectId }`. Call `refresh()` after the renderer replaces view children; call `resolve({ mathematicalObjectId, nodeId, targetRole?, operatorPosition? })` to obtain `{ outcome, representation, element, elements }`. Target roles: `preferred`, `occurrence`, `content`, `operator`. Outcomes: `found`, `content-only`, `operator-only`, `unavailable`. Explicit roles do not fall back to other geometries. `operatorPosition` matches renderer operand-boundary `data-operator-index` (first binary operator is 1, second is 2). Detached targets are filtered on resolution; object ID mismatch and missing AST IDs are unavailable. `describe(nodeId)` supplies the previous inspector counts/representation shape.

The index reads `data-hitbox-role=occurrence` and `data-node-id`, `data-hitbox-role=content` and `data-parent-id`, or `data-operator-owner-id` with optional `data-operator-index`. It does not infer AST identity from DOM ancestry. `refresh` performs one DOM scan and builds a view-local map. The caller controls the refresh lifecycle; consumers must not cache element references across a rerender.

## Integration and compatibility

`app.js` constructs one resolver for the equation view and refreshes it immediately after `replaceChildren`, before navigator and inspector refresh. Structure Navigator now uses the resolver for highlighting and display, while its AST navigation and selection callback remain unchanged. Renderer Inspector uses `describe` instead of independently querying DOM per occurrence. `visualFeedbackController` accepts an optional resolver and can accept `{ mathematicalObjectId, nodeId, targetRole?, operatorPosition?, role, hint? }` as an alternative to its existing `{ element, role, hint? }` descriptors. The navigator uses this semantic path. Existing feedback producers using direct DOM descriptors continue unchanged. Hit-testing still owns pointer geometry.

The legacy `mapRenderedOccurrences` function is retained as a compatibility API for external/test callers; do not remove it without caller and browser parity evidence. Do not migrate animation clones or detached preview candidates to the live view index: those have different ownership and lifecycles.

## Verification and limitations

Four new Node tests cover leaf/group/root targets, content-only operations, multiple indexed operators, independent views, detached DOM invalidation, and semantic feedback ownership with legacy overlap. The complete Node suite passed 301/301 in this delivery. Browser tests and computed-style checks on this Phase 2 build are **pending**; the user's earlier browser success covered Phase 1, not this build. Full Playwright plus keyboard navigator, inspector opt-in, theme, visibility, drag, and preview smoke checks remain release gates.

## Handover

Changed: new resolver and tests; `app.js`, `structureNavigator.js`, `rendererInspector.js`, `visualFeedbackController.js`, this document, and the master plan. No AST, mathematical rules, history, persistence, CSS, or geometry modifications. If browser regression appears, inspect actual renderer metadata and object identity before changing the AST or weakening tests. The next phase concerns interaction recognition/arbitration, not a redesign of this resolver.

## Phase 2 hardening (2026-11-07)

The renderer already indexes operators by the following operand's index: for `a+b+c`, the plus glyphs are **1** and **2**. The resolver and tests now document and honor that existing contract without modifying renderer output.

Mixed DOM/semantic feedback descriptors are supported only when the explicit element is among the resolver's matching targets. An incomplete address, wrong Mathematical Object, or mismatched element is rejected atomically; legacy DOM-only descriptors remain valid. Additional tests cover object switching, detached elements before refresh, empty views, and stable IDs across rerenders. Browser integration tests remain the final gate.
