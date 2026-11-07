# Transformation Feature Contract v1 — implemented incremental integration

**Baseline:** Equality Function Application v1.3.2. **Scope:** registration, coordinator dispatch and semantic descriptors. This is NOT the planned broad `app.js` architectural consolidation.

## Founding requirement

Students choose mathematical transformations. The mathematical engine enforces valid mathematics, and the application preserves the student's chosen reasoning path. Gestures must not decide mathematical validity. The rendering layer must not invent transformations. Maintain low-end/offline accessibility and stable node identities. See `FOUNDING_VISION_STUDENT_AGENCY.md`.

## Ownership and flow

1. **Input/hit-testing** resolves DOM hitboxes and pointer locations to mathematical IDs and interaction state. No mathematical proof occurs here.
2. **Gesture adapter** returns a DOM-free action with stable `ruleId` and parameters. Multiple entry points may share one rule. Arming the equals sign is interaction state, not part of the AST.
3. **Registry** (`js/manipulator/transformationFeatures.js`) validates and stores feature references. It does not invoke them during registration. It accepts legacy `gesture`, optional `gestures` array, optional `feedback`, optional `visual`, required `propose`, and `confirmationMode: preview|immediate`.
4. **Coordinator** (`js/manipulator/transformationCoordinator.js`) dispatches `propose(root, parameters)` and exposes `feedback(candidate)` and `describe(candidate)` for semantic presentation. It does not commit history or draw DOM.
5. **Mathematical Engine** checks eligibility and produces a fresh candidate AST with provenance. The authoritative Mathematical Object is unchanged until confirmation.
6. **Renderer and visual adapters** interpret semantic roles (such as inserted operand IDs), not mathematics. They own hitboxes, brackets and highlights. The preview lifecycle belongs to the application interaction layer.
7. **Commit** rechecks the source state and adds a history event exactly once. Cancel makes no mathematical history entry.

## Actual equality integration

- `js/manipulator/equalityFunctionGesture.js`: `equalityFunctionActionRequest` expresses an intention.
- `js/composition/transformationFeatureAssembly.js`: `equality.apply-function` registration; checks that the requested relation ID matches the root, then delegates to `applyFunctionToEquality`.
- `js/relations/equalityFunctionApplication.js`: pure scalar equality rule; preserves old identities and returns new operand IDs and provenance.
- `js/manipulator/equalityFunctionVisual.js`: DOM-free preview and feedback descriptions.
- `js/app.js`: now uses `transformationCoordinator.propose` and `.describe` for equality, but still owns its existing menu, pointer handling, inline preview and history commit. **Do not mistake this for complete UI extraction.**

The captured clipboard operand is passed in proposal parameters as `operandRoot`. The session clipboard is never imported into the mathematical Engine. The Engine result's provenance includes an immutable snapshot of the operand, so the historical step survives clearing the clipboard.

## Adding a feature

1. Write the pure Engine rule and tests for mathematical correctness, invalid cases, assumptions, node identities and source immutability.
2. Define a stable `ruleId` and at least one DOM-free gesture/request adapter or an equivalent accessible command route.
3. Add optional semantic feedback and preview adapters; do not write CSS or DOM code in the Engine.
4. Register it once in the application feature assembly, and call it through the coordinator.
5. Use the existing preview/commit lifecycle, with stale-source validation and history provenance.
6. Add targeted Node and browser tests, document limitations, and explain the mathematical assumptions.

Example descriptor (not a registered rule):

```js
{
  id: 'example.rule',
  propose: proposeExample,
  gestures: [pointerExampleRequest, keyboardExampleRequest],
  feedback: describeExampleEligibility, // optional, semantic data only
  visual: describeExamplePreview,      // optional, semantic data only
  confirmationMode: 'preview'
}
```

## Important boundaries and limitations

- `gestures` is a declarative list, **not** an automatic gesture arbitration engine. The existing gesture resolver still decides which adapter to invoke.
- `feedback` is optional; the coordinator returns `null` if absent. Visual adapters remain feature-specific and may express different educational meanings.
- Proposal rejection currently uses `null` for the equality adapter; a richer conditions/unknown/invalid result is deferred until type/domain and assumptions work.
- Existing registry entries are not forced to migrate to `gestures`; legacy `gesture` is supported.
- The seven older rules retain their established interactions and preview paths. This increment deliberately does not rewrite them.
- Equality targeting currently assumes a root `Equal` in the active view. Nested relations, logical statements, matrices, domain proofs, annotation anchors, resizable windows and lazy-loaded capabilities are future work.
- The known amber default-outline and optional grouping/atomic bracket refinements from v1.3.2 are **not addressed here**. The intermittent history navigation test under parallel workers remains a separate investigation.

## Verification and handover

Run `node --test tests/*.test.js` (220 passing in the implementation environment). Run `npm run test:e2e` on a machine with Playwright Chromium; 26 browser tests are inherited and were **not run** in this environment. In particular, verify equality menu arming, clipboard drag, preview cancel/confirm and history, alongside distribution, factorisation and rearrangement. Source inspection and passing Node tests cannot replace real browser verification.

**Next milestone:** Architectural consolidation: extract equality UI, clipboard UI and preview lifecycle from `app.js` in bounded steps. Do not turn this contract into a large generic plugin framework before practical needs justify it.
