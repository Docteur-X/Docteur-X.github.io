# Distribution — Shared Transformation Commit Lifecycle Migration v1

## Scope and baseline

Based on the browser-verified Identity Insertion Shared Lifecycle Migration v1 (234 Node tests, 29 Playwright tests). Only distribution's preview proposal/confirmation lifecycle was migrated. No change was intended to its drag gesture, plus-sign eligibility, amber preview, provenance arrows, animation, or algebraic law.

## Information flow

1. The existing hit tester and `distributionActionRequest()` produce the DOM-free rule request.
2. The Transformation Coordinator validates the rule and returns the verified distribution plan.
3. **Important:** `applyDistribution()` mutates the AST supplied to it. The application therefore calls it on `structuredClone(state.expressionRoot)` to prepare the result before preview. Never call it on the live Mathematical Object during preview.
4. The shared `createTransformationCommitLifecycle()` gate captures the proposed result and `transformationSourceStamp()` (document, object, cursor, root ID and structural fingerprint).
5. The existing distribution preview renders using the verified plan, without publishing the proposed tree.
6. Confirmation consumes the gate's proposal once, rejects stale source stamps, and uses `prepareAtomicTransformationCommit()` to build a detached root/history pair. The pair is then published synchronously. A failed history preparation cannot partially mutate the live tree/history.
7. DOM rendering, provenance animation and autosave occur after the mathematical commit. A save failure is a durability problem, not permission to erase a valid in-memory step.
8. Escape/click-away, object switching, history navigation and expression rebuild cancel the pending gate and its visual preview.

## Invariants and limitations

- Preserve existing node identities according to the distribution engine's provenance contract; cloned distributed factors have independent new identities.
- Keep the original DOM-based preview and post-commit animation unchanged. The commit gate knows nothing about rendering or pointer events.
- The proposal is computed once, before confirmation, on a detached AST. A valid source stamp ensures it cannot overwrite a different mathematical revision.
- The gate prevents duplicate/reentrant confirmation, but does not provide an IndexedDB transaction or automatically roll back autosave failures.
- This migration does not move distribution's presentation controller out of `app.js`, and does not migrate factorisation, grouping, rearrangement or numeric calculation.

## Verification and handover

`node --test tests/*.test.js` tests the engine and shared gate, including left/right order, non-mutating preview construction, cancellation, stale-state rejection, duplicate confirmation and injected history-construction failure. Playwright's existing distribution tests and the new cancellation/confirmation test exercise the browser path. The browser suite must be run in a Chromium-equipped environment before release closure.

Future contributors should keep mathematical validity in the Engine, gesture interpretation in its adapter, preview roles in the renderer/visualiser, and state/history commits through the shared lifecycle. This remains compatible with future vectors/matrices, noncommutative multiplication, multiple mathematical windows, and the student's authority to choose their own reasoning path.
