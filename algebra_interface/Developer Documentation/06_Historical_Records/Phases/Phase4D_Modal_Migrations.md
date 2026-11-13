# Phase 4D — Remaining modal preview migrations

## 4D-1: Equality application (implemented; browser verification pending)

**Baseline:** Phase 4C Hardened Negation Hotfix; user reported 65/65 browser tests passed. Node baseline: 378/378.

Equality is the second live modal-lease consumer, after negation. This is an intentionally narrow migration; identity, grouping, distribution and factorisation remain feature-owned and are **not** yet lease participants.

- `app.js` acquires the same `modalPreviewOwnership` registry lease after the equality coordinator prepares its candidate, and before the equality commit lifecycle opens or the inline preview is rendered.
- The equality preview's mathematical candidate, clipboard snapshot, DOM controller, and single-use commit lifecycle are unchanged.
- Acquisition failure does not replace an existing modal preview. Failure to open the commit lifecycle releases the newly acquired lease.
- Equality cancellation uses nested `try/finally`: the commit lifecycle is cancelled even if UI cleanup throws; the exact equality lease is released even if either step throws.
- Equality confirmation continues to use its existing source-stamp validation, atomic publication and history handling. It calls cancellation for all terminal paths.
- The existing reciprocal negation/equality guards remain in place until both migrations are independently verified. Arming an equality operation is not acquiring a modal lease.
- Equation rerender and object switching already invoke equality cancellation when the equality commit lifecycle is open.

**Verification:** 378/378 Node tests passed locally; new browser test covers cancel/reacquire/confirm. The full browser suite is pending. Do not mark 4D-1 accepted until it passes.

**Remaining work:** Migrate other genuinely modal preview families individually, verifying reciprocal exclusion, teardown and exactly-once publication. Do not force non-modal animations into this registry. Reconcile outdated historical status paragraphs only after the migration is verified.

## 4D-1 verification update (7 November 2026)

The user reported that all 66 Playwright tests passed after the equality-menu
reopening test was corrected. The corrected 4D-1 archive is the browser-verified
baseline for 4D-2. Earlier "browser pending" wording above is historical.

## 4D-2: Identity insertion (implemented; browser verification pending)

**Scope:** Only the deliberate identity *confirmation preview* holds a view-local
modal lease. The toolbar drag, target interpretation, and transient feedback do
not acquire a lease. Mathematical eligibility and source-state checks remain
with the existing coordinator and arbitration adapter; commit authorization
remains with `identityCommitLifecycle`.

- The toolbar cannot start a new identity drag while a different modal preview
  owns the view. The drop adapter also rejects a newly occupied view.
- Once a valid identity proposal is chosen, the application acquires an
  `identity` lease before opening the existing commit gate or rendering amber
  confirmation. A rejected acquisition leaves the other owner's lease intact.
- All post-acquisition preview presentation is inside one error boundary.
- Cancellation, successful confirmation, stale confirmation, pointer cancellation,
  rerender, and object switching use the established `cancelIdentityTool` path,
  which now releases the exact lease in `finally`.
- The existing identity mathematics, DOM geometry, amber highlighting, and
  atomic publication are unchanged. Do not replace them with registry logic.

**Verification:** 378/378 Node tests passed in the implementation run. One new
Playwright test checks cancel/reopen/confirm with exactly one history addition;
67 browser tests are expected. This build is NOT browser-verified until the user
reports the results. The lease registry is not a mathematical validator.

**Next:** Audit 4D-2 and then migrate grouping (4D-3), distribution (4D-4),
and factorisation (4D-5) one at a time. Phase 4E reviews non-modal animations;
4F verifies cross-family behaviour. Audit Phases 1-4 before Phase 5.

## 4D-2 verification and 4D-3 grouping migration (7 November 2026)

The user reports **67/67 browser tests passed** on the 4D-2 hardened build.
That is the accepted baseline for this increment. Earlier 4D-2 browser-pending
notes above are historical.

**4D-3 scope:** Only the deliberate grouping *confirmation preview* acquires
an exclusive `grouping` lease. Ctrl/Cmd-click, touch selection, and the blue
selection envelope remain non-modal and do not acquire a lease. Acquisition
occurs after the grouping coordinator and pure intent adapter approve a
candidate, but before the existing single-use commit lifecycle opens and the
blue bracket preview renders. The lease does not authorize mathematical
validity or commit history.

- `cancelRangeGroupingPreview()` cancels the proposal and restores selection
  before releasing the exact lease in `finally`.
- `resetRangeSelection()` releases a lease even if proposal cancellation fails.
- Grouping commit success, stale rejection, and commit failure release ownership.
- Changing bracket style cancels the old preview and lease, then requests a
  fresh candidate and lease without clearing the selected operand IDs.
- Full equation rerender and workspace/object switching close grouping preview
  before replacing its DOM; existing feature-specific educational overlays
  and confirmation controls remain authoritative for presentation.
- Existing reciprocal feature guards are retained during the partial migration.
  Distribution and factorisation remain future 4D-4/4D-5 migrations.

**Verification:** 378/378 Node tests passed; a new browser test exercises
style replacement, cancel/reopen and exactly-one commit. The expanded browser
suite is **pending user verification**. Do not mark 4D-3 accepted until then.


## Phase 4D-3 grouping cleanup hardening (2026-11-07)

The grouping lease is released in an independent `finally` boundary during proposal cancellation, selection reset, confirmation error, and stale rejection. `cleanGroupingPresentation` first restores non-modal grouping state and then independently attempts overlay, toolbar and selection cleanup; one presentation exception cannot skip later cleanup steps. The original mathematical commit error is retained for user-facing diagnostics while secondary cleanup failures are logged. `resetRangeSelection` explicitly cancels a pending proposal before clearing its operand selection; its callers include document/object switching, history navigation, expression rebuilding and selection-reset input paths.

This is feature-local cleanup, **not** a generic modal manager, new mathematical validator, or a promise of recovery from arbitrary DOM failures. An additional Playwright test switches Mathematical Objects during a grouping preview and verifies that the original expression can open a new preview after returning. Baseline: 68/68 browser tests reported passed; hardening Node suite 378/378 passed; 69 browser tests pending. Fault-injection of presentation exceptions remains a desirable Phase 4F coverage item; do not claim it has been tested here.

## 4D-4: Distribution modal lease migration (2026-11-07)

**Baseline:** User reported 69/69 Playwright tests passing for Phase 4D-3
Hardened; Node baseline 378/378. Distribution is the fourth modal-lease
consumer, following negation, equality, identity, and grouping (five families
in total including negation from Phase 4C).

- Ordinary pointer dragging, geometric target detection, and amber eligible-plus
  feedback remain **non-modal**. A distribution lease is acquired only after the
  coordinator has validated the rule and a detached candidate has been prepared,
  immediately before the existing single-use distribution commit lifecycle opens.
- `distributionPreviewLease` holds the exact view-local lease; `releaseDistributionPreviewLease()`
  releases it idempotently. The lease is independent of the candidate and history.
- Opening failures cancel the feature-owned candidate, restore presentation as
  far as possible, and release the lease. The original opening error is retained
  for status reporting if cleanup also throws.
- Cancellation and workspace/object/history/expression reset release ownership;
  confirmation success, stale rejection, and failure release ownership before
  rerendering. The source AST, provenance arrows, amber copies, mathematical
  eligibility and atomic publication are unchanged.
- Other modal owners cannot be replaced by a distribution proposal. The
  distribution drag pickup also declines to start while the view is leased.
- **Verification:** 378/378 Node tests passed in the implementation environment.
  One new browser test covers object-switch cancellation and reacquisition;
  70 Playwright tests expected, awaiting user verification.

**Limits:** Browser confirmation is pending. Exception recovery is best-effort
for DOM failures; lease release is not a guarantee that arbitrary broken DOM
operations can be repaired. Phase 4D-5 migrates factorisation; Phase 4E audits
non-modal animations; Phase 4F checks cross-family exclusivity and fault paths.

## 4D-4 targeted hardening: rebuild and failure diagnostics (2026-11-07)

**Reason:** The original Phase 4D-4 build passed 70/70 browser tests, but a source audit found that `buildExpression()` cancelled the distribution proposal and removed its preview without releasing the view-local lease. This could strand modal ownership after a successful expression rebuild.

**Correction:** The rebuild path now calls the existing `cancelDistributionPreview(false)` before replacing the AST. That path cancels the proposal, clears transient preview state, rerenders the original tree, and releases the lease in a `finally` boundary. The subsequent build publishes the newly parsed expression as before. The distribution confirmation catch now attempts lease release and render recovery independently, reporting the original commit exception even if render recovery throws. No mathematical rule, provenance, or publication code was changed.

**Regression:** `e2e/phase4d4-distribution-lease.spec.js` now opens a distribution preview, rebuilds the expression, rebuilds the original distributable expression, and verifies a new preview can open and cancel without history publication. This tests *reacquisition*, not just preview disappearance. Node: 378/378 passed. Browser: 71 expected, pending. Exception recovery is best-effort and does not claim to repair arbitrary DOM failures.


## 4D-5: Factorisation modal lease migration (8 November 2026)

**Baseline:** 4D-4 Hardened browser-verified by owner (71/71). 4D-5 is implemented and Node-verified (378/378); browser verification pending (72 tests).

- Only a deliberate, mathematically prepared factorisation confirmation preview acquires `owner: 'factorisation'` on the canonical `equationViewId`. Factor selection and amber extraction-zone dragging are non-modal.
- The existing coordinator and teaching policy decide mathematical eligibility. The modal lease never approves mathematics or commits history. Candidate rendering, faded factors, persistent provenance arrows, confirmation and atomic publication remain feature-owned.
- `releaseFactorisationPreviewLease()` releases the exact lease idempotently. `cancelFactorisationPreview()` independently attempts candidate-DOM restoration, proposal cancellation, toolbar/selection repaint and lease release; arbitrary DOM recovery is not guaranteed.
- Preview opening is exception-protected. Confirmation success, stale rejection, failure and cancellation release the lease. Full rerender, expression rebuild, history restore and Mathematical Object switching cancel the preview before the mathematical source is replaced.
- The new Playwright test `phase4d5-factorisation-lease.spec.js` exercises expression rebuild while preview is open and subsequent preview reacquisition/cancellation. Existing factorisation tests continue to protect exactly-once publication and provenance.
- **Next:** 72 browser tests, independent audit, Phase 4E non-modal effects, then 4F cross-family modal conflict and fault-injection matrix. Retain existing feature guards until those tests justify removing them.
