# Input architecture migration: inventory, contract and proof slice

**Status (latest):** negation activation is integrated into production event handlers and Node-verified; broader input architecture remains experimental and browser verification is pending. 2026-11-10.

## Scope and authority

The shipped `js/app.js` remains authoritative for interaction behavior. Negation activation now uses the semantic contract through a production adapter; the wider `js/input/semanticInput.js` is NOT a replacement for the existing semantic target resolver, intent arbitration or preview lifecycle. The purpose of the slice is to establish a stable seam without risking live behavior. Existing Node tests are regression evidence, not browser verification.

## Event-flow inventory (source-grounded)

| Input / initiation | Source entry | Interpretation | Rule / proposal | Preview / completion | Migration concern |
|---|---|---|---|---|---|
| Ordinary operand drag | `app.js` equation `pointerdown`, window `pointermove/up/cancel`; `startDrag`, `updateDragTarget`, `finishDrag` | `hitTesting`, `dragFeedback`, `ordinaryDropArbitration`, `intentArbitration` | Rule-dependent distribution, numeric combination, insertion/rearrangement, negation compression | Per-feature lifecycle / distribution preview | Geometry and rule decisions still coupled in app; final release re-hit-tests; settled geometry matters |
| Factor drag | `app.js` pointerdown and window pointermove/up | factor-drag functions and `factorDropArbitration` | factorisation | factorisation preview lifecycle | Different drag owner and cleanup from ordinary drag |
| Identity tool drag | `app.js` identity toolbar pointerdown, window pointermove/up/cancel | `identityDropArbitration`, `identityTool` | `identity.introduce` | identity modal and lifecycle | Toolbar-origin drag and target semantics differ from occurrence drag |
| Negation operator click | `app.js` equation click on `.negate-operator-hitbox` | `openNegationPreview` + `negationOperatorArbitration` | `negation.expand` | negation inline preview and lifecycle | **Prototype input-to-request slice**; currently production code still direct |
| Negation operator keyboard | `app.js` equation keydown Enter/Space | Same `openNegationPreview` path | `negation.expand` | Same preview | Equivalent action, but event normalization not shared in production |
| Occurrence click / touch tap | `app.js` equation click, pointerup touch controller | selection / range selection | No transformation | selection feedback | Distinguish selection from transformation intent |
| Ctrl/Cmd selection and grouping | `app.js` pointerdown/click, group toolbar actions | grouping arbitration | grouping candidate | modal bracket preview, confirm/cancel | Preserve adjacent sibling checks, stable IDs, non-layout-changing overlay |
| Keyboard distribution | `app.js` equation keydown, `classifyOccurrenceKey`, AST parent/neighbor lookup | Direct neighbor eligibility search | distribution plan | distribution preview | Keyboard and pointer have different interpretation paths |
| Keyboard rearrangement | `app.js` equation keydown ArrowLeft/ArrowRight | `moveNodeWithKeyboard` | rearrangement | current feature path | Preserve structural sibling constraints |
| Equality interaction | `equalityInteractionController` + `app.js` | equality-specific input and policy | equality action | equality preview lifecycle | Equation-wide operations distinct from substitution of an equality |
| Escape / outside pointerdown | `app.js` document/window listeners | multiple feature flags and lease checks | no new rule | cancel different preview modes | Replace with one preview host routing priority |
| Blur, visibility, scroll, resize | `app.js` window/document listeners | drag cancellation, geometry refresh, overlay refresh | no rule | cleanup/reposition | Must preserve pointer cancellation and geometry refresh semantics |
| History, workspace, expression edits | `app.js` toolbar/form listeners | document and history controllers | may replace committed source | invalidate pending proposals | Preview stale-source and view-local scope |

Inventory is based on the current source entry points and architecture audit, not a full trace of every branch. Before replacing handlers, capture each path with browser interaction tests and characterize pointer capture, focus and cancellation.

## Proposed semantic input contract v0

`semanticInput({ phase, method, viewId, objectId, source?, target, modifiers? })` returns frozen, DOM-free data.

- `phase`: `activate | press | hover | release | cancel`.
- `method`: `pointer | keyboard` (future touch, pen, assistive technology and programmatic adapters require deliberate policy).
- `viewId` and `objectId`: nonempty view-local and mathematical-object identifiers.
- `source` and `target`: semantic addresses `{nodeId, role, operatorPosition?}`; `role` is `occurrence | content | operator`.
- `modifiers`: normalized `ctrl, meta, shift, alt` booleans.
- Not included: DOM elements, CSS classes, pixel positions, mathematical eligibility, preview or history mutation.

**Unresolved contract questions:** operator boundaries need owner node and index (existing renderer uses first boundary index 1); implicit multiplication and group brackets require role extensions; multi-view source revisions and matrix coordinates require explicit design. For now the contract is intentionally minimal and **not approved for broad production migration**.

## First proof slice

`js/input/semanticInput.js` has a prototype negation-only DOM adapter translating `click` and `keydown` Enter/Space into identical `activate` events except for input method; a pure recognizer uses the existing `expandNegationAction` helper to generate the same DOM-free rule request. It does not propose, validate, preview or commit a transformation. `tests/semanticInputContract.test.js` checks parity, unsupported keys, detached elements, immutable addresses and invalid roles.

**Important limitation:** the prototype adapter uses the legacy `.negate-operator-hitbox` CSS class. This is an interim bridge. Production adapters should use the existing view-local `semanticTargetResolver` and an address extraction/index API; a DOM-to-address API is not yet provided by that resolver. The proposed contract's `source` field is not a substitute for a drag session state machine.

## Integration plan and acceptance criteria

1. Add reverse DOM-to-address lookup to the view-local resolver; test nested occurrences, operators, explicit groups, detached nodes, rerenders and multiple views.
2. Introduce a view-scoped input adapter that emits normalized semantic events. Keep gesture session ownership, pointer IDs, capture, thresholds and cancel semantics outside the pure event record.
3. Route negation click/keyboard through the new adapter and recognizer **without a second live event listener**. Use existing transformation coordinator, intent arbiter and preview lifecycle. Verify no duplicate commits.
4. Add Playwright tests for pointer and keyboard activation, modal exclusivity, confirm, cancel, stale source, focus, and history parity. Run visual baseline before removing old code.
5. Migrate one ordinary drag path, retaining settled drop geometry and release re-hit-test; only then consider unifying preview hosts.

## Architecture constraints

- Engine is the mathematical authority; recognizers only propose intentions.
- Candidate AST is detached; preview must not mutate committed AST or history.
- One view-local preview owner; reject unrelated input until confirm/cancel.
- Preserve AST occurrence IDs, exact arithmetic, branching history, explicit Group semantics and accessibility.
- Do not change production behavior until tests demonstrate parity. Keep code and documentation aligned with verified status.

## Increment: bidirectional semantic target resolution (2026-11-10)

**Implemented in experimental working copy; production event handlers remain unchanged.**

`js/rendering/semanticTargetResolver.js` now exposes `addressFromElement(element, { mathematicalObjectId })` in addition to `resolve(address)`. The resolver indexes renderer-declared occurrence, content and operator targets during `refresh()` and records a reverse mapping from each actual DOM element to its semantic address. It walks parent elements to support descendants within a target and chooses the nearest indexed target for nested mathematics. It never reads CSS classes or infers an AST identity from geometry. The output is a frozen plain semantic address containing `mathematicalObjectId`, `nodeId`, `role` and, for indexed operators, `operatorPosition`. It is compatible with `semanticInput`'s target field (which intentionally drops the object ID because that ID is already present on the enclosing event).

Safety contract: the caller must specify the current mathematical object ID; targets must be attached to the resolver's own view; only renderer-indexed elements are trusted; stale elements from a rerender are rejected after refresh; malformed operator positions fail closed. **Important limitation:** until refresh, if a renderer reuses an element while changing its metadata in place, the reverse index can be stale. Production integration must refresh after all relevant DOM/AST changes and may require an explicit render generation token. The view's `contains()` is the attachment authority, not a complete freshness proof. The API also does not yet perform geometric pointer hit-testing or determine mathematical eligibility.

Verification: `tests/semantic-reverse-targets.test.js` adds three tests covering semantic roles and event compatibility, nested targets and view boundaries, and detachment/malformed metadata. Full Node suite: **459 passed, 0 failed**. Browser and accessibility verification remain pending.

Next migration step: replace the negation prototype's feature-specific `.negate-operator-hitbox` adapter with a view-scoped adapter using `addressFromElement`. Before production wiring, validate actual renderer markup for negation, plus, equality and grouped expressions in browser tests, then connect the semantic activation to the existing preview/commit path behind an incremental migration seam. Do not bypass preview exclusivity or stable AST IDs.

## Increment: first production semantic activation integration (2026-11-10)

**Implemented in `js/app.js`, Node-verified, browser verification pending.** The earlier statements in this document that negation production handlers remain unchanged are historical descriptions of the prior increments and are superseded by this section.

`js/input/negationActivationAdapter.js` now bridges the current renderer's explicit `.negate-operator-hitbox` affordance to the view-local `semanticTargetResolver.addressFromElement`. It requires the active mathematical object ID, rejects detached/foreign controls, non-operator roles, indexed n-ary operators, and unsupported keyboard events. It constructs the immutable `semanticInput` record and passes it through `recognizeNegationExpansion`, returning a DOM-free rule request. The app's click and keyboard handlers share a single activation function; the previous direct `operator.dataset.operatorOwnerId` lookup was removed from both. The existing `openNegationPreview` continues to validate and own preview/commit/history. The pointerdown suppression remains for drag compatibility.

**Boundary caveat:** the feature-specific CSS selector is still used to distinguish an activation control from arbitrary mathematical operators. It is not used to determine mathematical identity. A future generic affordance registry can remove that selector when renderer/interaction contracts are approved. The prototype `negationActivationFromDom` in `semanticInput.js` is retained only for historical contract tests and should be retired after those tests migrate.

**Verification:** `tests/negationActivationAdapter.test.js` covers click/Enter/Space equivalence and stale/foreign/wrong-role rejection. Full Node suite **461 passed, 0 failed**; documentation links **406 valid**. Playwright was not installed in this execution environment; no browser, visual, keyboard-focus or accessibility parity is claimed. Do not remove legacy preview code until those checks pass. The in-place DOM metadata mutation freshness limitation remains open.

**Next steps:** (1) install project dependencies in a browser-capable environment and run Playwright against actual negation click/Enter/Space, confirm/cancel, history and modal exclusivity; (2) investigate render-generation stamps or explicit invalidation for reused DOM elements; (3) migrate the next interaction only after behavioural parity is demonstrated.
