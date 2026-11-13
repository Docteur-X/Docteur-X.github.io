# Phase 3 — Interaction ownership audit and proposed arbitration contract

**Baseline:** `Manipulator_Phase2_Hardened.zip` (user reports all tests passed).  **Status:** design/audit only; no production modifications.  **Authority:** source code in `algebra_interface/js`, especially `app.js`, `interaction/hitTesting.js`, and the consolidation master plan. Proposed interfaces below are *not* existing APIs.

## 1. Current ownership map

| Concern | Current owner / entry point | Architectural boundary to preserve |
|---|---|---|
| Input dispatch | `app.js` listeners on equation, document, window and toolbar | Pointer, keyboard, and touch must remain equivalent where supported; avoid competing listeners consuming a gesture twice. |
| Geometric drop proposals | `interaction/hitTesting.js` and `app.js`'s geometry snapshot/refresh | Frozen rectangles are physical evidence, not mathematical authority. |
| Semantic occurrence lookup | `rendering/semanticTargetResolver.js` and renderer metadata | Addressable AST occurrences; not necessarily draggable hitboxes. |
| Ordinary drag session | `app.js` (`state.drag`, `updateDragTarget`, `finishDrag`, `cancelDrag`) | AST untouched until validated drop/commit; pointer identity and settled preview matter. |
| Factor drag | `app.js` (`state.factorDrag`, `updateFactorDrag`, `finishFactorDrag`, `cancelFactorDrag`) | Exclusive ownership of factor extraction gesture. |
| Identity tool drag | `app.js` (`identityDrag`, `identityPreviewModal`) | Toolbar-origin gesture and modal confirmation are distinct from ordinary drag. |
| Touch selection | `app.js` (`touchTap`, touch multi-select state) | Tap-vs-drag threshold and selection must not fire after drag. |
| Grouping/range selection | `app.js`, grouping preview, selection utilities | Modifier/touch selection and modal bracket preview must remain intentional. |
| Negation operator | Equation `pointerdown`, `click`, `keydown` handlers in `app.js` | Operator activation must not also start operand drag. |
| Preview feedback | `dragFeedback.js`, view-local feedback controller and feature previews | Feedback describes proposals; cannot veto valid mathematics. |
| Rule validation and publication | Transformation coordinator/lifecycle and operation modules | Recognizers never directly mutate AST or publish history. |

## 2. Confirmed source behaviour

- The ordinary drag snapshots geometry at pickup; `pointermove` updates a ghost and feedback without rerendering or mutating the AST. Scroll/resize refreshes geometry.
- `hitTestDrag()` returns `distribution`, `combine`, `insert`, `invalid`, or `none`. Visible settled insertion geometry is checked before the original snapshot when applicable.
- The blue insertion proposal is retained during an unsettled transition only under constrained conditions. `dragFeedback.show()` returns the *effective settled* target; only `activeTarget` may be committed.
- Rearrangement candidates are checked by the mathematical rules; invalid rearrangement is downgraded to `invalid`.
- Negation compression is checked after the geometric proposal and can replace it when the source is `-1`, the nested target matches, and `negation.compress` is mathematically eligible. This is an existing priority, not a general rule that negation always wins.
- Pointer-up takes a final target reading. `pointercancel`, blur, and visibility loss cancel sessions. Escape uses an ordered chain of active modes.
- The equation has multiple listeners for selection, nested occurrence pickup, negation operators, hitbox visibility, and drag initiation; ordering and propagation are therefore observable compatibility requirements.

## 3. Proposed contract (for approval before implementation)

**Input observation:** `{viewId, pointerId?, pointerType?, phase, coordinates?, modifiers, eventTarget, epoch}`. A view-scoped coordinator creates a session from a *single* pickup owner. `eventTarget` may be used for compatibility at the input boundary but is not passed into mathematical rules.

**Intent proposal:** `{kind, sourceOccurrenceId?, targetOccurrenceId?, operatorAddress?, insertionIndex?, parameters?, evidence, eligibility, sessionToken}`. `evidence` distinguishes DOM/geometry, semantic address and explicit toolbar action. `eligibility` is a result of rule validation, not CSS appearance. Do not force every gesture into one universal shape: define discriminated variants for combine, distribution, reorder, negation, factorisation, grouping, and identity.

**Arbitration result:** `{status: 'chosen'|'none'|'blocked', proposal?, reason?, sessionToken}`. Exactly one chosen intent for a single release; `blocked` never implies an AST mutation. Invalid targets may still receive explanatory feedback. The arbiter does not perform a commit.

**Lifecycle:** `idle -> acquired -> dragging -> (previewing | ready) -> committed | cancelled`. Modal confirmation is a separate continuation owned by the selected feature. A cancellation invalidates the session token; stale callbacks and pending animations cannot commit.

**Single writer:** One coordinator owns the active pointer gesture for a view. Feature recognizers are pure or side-effect-free with respect to AST/history. Feature-specific previews retain DOM/animation ownership. The existing transformation lifecycle remains the sole commit authorization path.

**Identity:** Store source Mathematical Object ID, view identity, root revision/fingerprint and source occurrence IDs. Revalidate at release/confirmation. No new global mutable interaction singleton.

## 4. Draft arbitration table (existing observed precedence vs target rule)

| Competing candidates / mode | Existing observed behavior | Proposed explicit policy |
|---|---|---|
| Negation operator click vs operand pickup | Operator `pointerdown` stops subsequent equation pickup; click/keyboard expands negation | Operator activation owns this event; no drag session. |
| Factor drag vs ordinary drag | Window move/up dispatch checks `state.factorDrag` before `state.drag` | Pickup acquires exactly one session owner; factor drag is exclusive once acquired. |
| Identity drag vs equation gestures | Identity drag/modal short-circuits equation drag and window drag handlers | Active identity tool owns pointer until cancel/confirm. |
| Grouping/factorisation/distribution modal vs new drag | Equation pickup returns while modal modes active | Modal mode blocks new ordinary drag unless feature explicitly delegates. |
| Touch tap vs drag | Movement threshold and pointer-up selection guard prevent double action | Gesture classification locks after drag threshold; no tap after drag. |
| Distribution plus vs numeric sibling | Hit-testing checks eligible plus before sibling combination | Explicit eligible plus target takes priority over sibling rectangle. |
| Numeric combination vs insertion gap | Eligible sibling before edge-gap insertion | Eligible sibling combination wins inside hitbox; gap proposes reorder. |
| Negation compression vs geometry result | Eligible `-1` compression may replace prior proposal | Preserve this specific precedence, but require exact nested semantic target and valid rule. |
| Insertion during animation vs other targets | Retains requested insertion only while transition unsettled; explicit eligible targets can supersede | Never commit unsettled preview; preserve intentional target switching. |
| Invalid drop vs cancellation | Invalid receives feedback; release does not commit | Neither invalid nor none publishes history. |
| Escape vs active modes | Ordered conditional cancellation in `app.js` | Cancel the *active owner*, once; preserve current mode priority until characterized. |

## 5. Unresolved details to characterize before extraction

1. Exact pickup arbitration between selected-factor drag, nested hitboxes, Alt outer selection, and modifier multi-select. Capture actual listener ordering and propagation with targeted browser tests.
2. Whether distribution and negation-compression targets can geometrically overlap in a valid state; add a deterministic overlap fixture rather than assuming a universal priority.
3. Keyboard equivalents for every pointer action: some are alternative commands rather than literal gesture emulations.
4. Touch `pointercancel`, scroll interruption, lost pointer capture, and preview modal cancellation on the actual browser.
5. The relationship between `requestedTarget`, `activeTarget`, animation completion, and pointer-up on the same frame; characterize with controlled animation timing.
6. Multi-view readiness: currently one active equation; test isolation at the contract level before creating multiple live views.

## 6. Implementation sequence and acceptance gates

**3A — Characterize without changing production.** Add a test matrix for pickup precedence, final pointer-up retarget, animation settling, cancel/blur, touch tap/drag, and keyboard operation. Record current behavior as a baseline.

**3B — Pure arbitration function.** Extract only the decision between already-derived proposals, with a documented precedence table and unit tests. Keep existing listeners and commits in place; compare old/new decisions in tests before switching.

**3C — One drag seam.** Route ordinary drag proposals through the arbiter, retaining the existing geometry snapshot, visual feedback, and transformation coordinator. Add same-gesture cancellation and single-commit tests.

**3D — Migrate other gesture owners incrementally.** Factor drag, identity, grouping, operator activation, touch/keyboard paths each get their own compatibility test gate. Avoid combining all migrations into one patch.

**3E — Verify and hand over.** Full Node and Playwright suites; manual preview geometry, nested hitboxes, accessibility, history, persistence, and view-scoping checks. Update architecture docs and record known differences. Roll back any increment that changes mathematics, stable IDs, or educational feedback unintentionally.

## 7. Non-goals

No new mathematical rules; no AST restructuring; no renderer rewrite; no general preview-lifecycle rewrite (Phase 4); no broad `app.js` decomposition (Phase 5); no Window Manager implementation (Phase 6).

## 8. Decision recommendation

Approve the **single view-local gesture owner + side-effect-free intent proposals + explicit arbitration + existing rule validation and commit** design, but do **not** lock a global priority list until 3A browser characterization confirms overlapping-target cases. The smallest safe first code increment is tests plus a pure decision seam, not a replacement of all event handlers.

## 9. Status and evidence policy

As of 7 November 2026 this document is a **proposed design and characterization plan**, not an implemented interaction coordinator or approved universal precedence algorithm. The owner reports that the Phase 2 Hardened browser suite passed; the latest archive remains the implementation baseline. Source contracts must be rechecked against code when implementing each increment. Browser characterization in 3A has not yet been executed.

## 10. Phase 3B implementation (7 November 2026)

`js/interaction/intentArbitration.js` is now a **pure, advisory decision seam**, not wired into `app.js` or live event listeners. Its `arbitrateIntents` entry point accepts explicit view, Mathematical Object, session token, gesture owner, source validity, modal state, and already validated intent proposals. It returns `chosen`, `none`, or `blocked`, with a reason. No DOM, geometry, mathematical rule, preview, or history imports are permitted.

Within `ordinary-drag`, observed precedence is encoded narrowly: eligible minus-one compression; eligible distribution; eligible sibling combination; settled insertion; settled rearrangement. This is **not** a universal priority list. An ambiguous same-kind choice blocks instead of relying on input order. Ineligible proposals are ignored; malformed, cross-view, stale-token, wrong-owner, cancelled, or stale-source input blocks. Unsettled insert/rearrange proposals are not selectable.

**Important integration boundary:** Phase 3C must map real `hitTestDrag` and `dragFeedback` outcomes into these proposals, including source revision/fingerprint revalidation. Do not assume that `eligible: true` in a proposal itself authorizes a commit. Keep final pointer-up retargeting and settled preview semantics. Do not attach this module to live gesture handlers in 3B.

**Verification:** `tests/phase3b-intent-arbitration.test.js` adds ten Node tests; full suite to be recorded from the actual run. Existing Phase 3A browser characterization remains the baseline and must be rerun when Phase 3C changes live behaviour.


### Phase 3B contract hardening (7 November 2026)

The advisory arbiter now has an explicit owner-to-intent capability map: ordinary-drag
(distribution, combine, insert, negation-compress, rearrange), factor-drag
(factorise), identity-drag (identity), grouping (group), and negation-operator
(negation-expand). Keyboard and touch-selection currently have no authorized
transformation proposals in this seam; characterize and extend these adapters
in Phase 3D rather than assuming they use the ordinary-drag contract.

Equivalent proposals with the same kind, source occurrence, target occurrence,
and insertion index coalesce; genuinely distinct actions remain ambiguous and
block. `none` for an unsettled insert/rearrange means **not currently selectable**,
not a command to cancel its active preview. The gesture coordinator retains
animation state and must re-arbitrate after settling or on final release.

`eligible` is a trusted adapter assertion, **not cryptographic proof or commit
permission**. Phase 3C must derive it from existing rule checks, revalidate the
source fingerprint and legality in the commit lifecycle, and never accept raw
DOM styling as mathematical evidence. The returned proposal is a frozen,
primitive-only snapshot of declared fields, not a shallow copy of arbitrary
recognizer metadata. No live gesture wiring is changed by this hardening.

Phase 3A's 56 browser tests and Phase 3B's 56 browser tests were reported passing
by the project owner. Node counts must be updated from the actual hardening run.


## Phase 3C — Ordinary drag release integration (2026-11-07)

**Status:** implemented; Node suite 325/325 passed locally; browser regression
verification pending. User reported all 56 browser tests passed for the prior
Phase 3B hardened baseline. Do not mark Phase 3C browser-verified yet.

### Implementation boundary

- `js/interaction/ordinaryDropArbitration.js` translates exactly one settled
  ordinary-drag release target into the pure Phase 3B intent contract. It
  accepts an injected mathematical eligibility callback and cannot mutate the
  AST, DOM, history, or previews.
- `js/app.js` creates a unique ordinary-drag session token and captures the
  current document/object/history revision/root fingerprint at pointerdown.
  On pointerup it rechecks that source and the original operand position.
- `updateDragTarget()` still performs final pointerup hit-testing and calls
  `dragFeedback.show()` to determine the visually **settled** `activeTarget`.
  Only this target reaches the new release arbiter; `requestedTarget` is never
  used to authorize a commit.
- The arbiter selects an advisory intent, never publishes a transformation.
  Existing distribution/negation modal preview gates, numeric combination
  commit lifecycle, and rearrangement candidate/atomic commit remain intact
  and revalidate mathematical legality at their original boundaries.
- Invalid/outside drops, click/tap selection, factor drag, identity insertion,
  grouping, keyboard, and touch-selection ownership are unchanged. Their
  broader migration belongs to Phase 3D.

### Verification and risks

`tests/phase3c-ordinary-drop-arbitration.test.js` adds seven Node tests. Run
all existing Playwright tests (expected 56), especially distribution,
combination, negation, rearrangement animation settling, cancellation, and
nested hitboxes. The release integration is deliberately not a replacement
for the full gesture coordinator. No browser result is claimed here.

**Future hardening:** the adapter's `validate` callback is trusted to call
existing mathematical rules, not to assert eligibility from CSS. The source
stamp is a defensive release-time check; existing single-use commit gates are
still mandatory. Future multi-view work should replace the temporary
`main-equation-view` identifier with an allocated view-slot identity.

## Phase 3C hardening checkpoint (2026-11-07)

Phase 3C release arbitration is advisory, not a second mathematical authority.
The adapter requires a complete ordinary-drag session and a valid settled target
before it invokes the feature's mathematical eligibility callback. Missing
occurrence identities, nonintegral insertion positions, and thrown eligibility
checks fail closed. Eligibility must be explicitly `true`; final preview/commit
validation remains independently authoritative. An invalid hitbox retains the
student-facing explanation `No rule applies to that hitbox. The expression is unchanged.`

Regression coverage: malformed sessions, invalid target identities/indices,
throwing validators, and nonboolean eligibility. Node suite: 329/329 passed.
Browser suite: awaiting user verification of this hardened build. Existing
Phase 3C browser baseline: user reported all 56 tests passing.

Known remaining verification boundary: the adapter's Node tests do not replace
browser coverage of the actual `finishDrag` path. Before Phase 3D, check
release-to-preview/commit behaviour and avoid duplicating source-of-truth
mathematical rules inside arbitration.
