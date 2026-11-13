> **HISTORICAL EXECUTION RECORD — NOT AN ACTIVE ROADMAP (8 November 2026).** Phases 0–5 are completed and accepted at their recorded verification scope (Phase 5F: 416/416 Node tests independently passed; 77/77 browser tests owner-confirmed). Phase 6 is intentionally deferred for creative design exploration. Older “current”, “next” and “pending” statements below describe earlier checkpoints only. For today’s truth see [Current Status](../Superseded_2026-11-12/Current_Status.md), [AI Handover](../Superseded_2026-11-12/AI_Handover.md), and [Creative Exploration](../../05_Roadmap/Creative_Exploration_and_Deferred_Phase6.md). This plan is retained to explain decisions and sequence; do not use it as an active implementation checklist.

# Presentation and Interaction Consolidation — Master Plan v1

**Historical status:** This document began as a Phase 0–6 execution plan and retains earlier milestone language as a chronological record. **Current status is maintained elsewhere**; Phases 0–5 are complete and Phase 6 remains deferred. See `Current_Status.md`.  
**Owner:** Future maintainers and coding assistants.  
**Purpose:** Make the Manipulator's presentation and interaction layers predictable, extensible, testable and comprehensible before Target Proxies and a multi-view Window Manager.

## Read this first

This was the original consolidated execution plan and is now a **historical design record**, not the active plan. Before each increment, read this plan and the authoritative documents in `02_Architecture`, `03_Developer_Guides`, and `04_Reference`. Reconcile the plan against the **actual current source**: names, line counts, assumptions and tests may have changed. Mark each increment planned / in progress / verified / blocked; keep history in Git, not copied Markdown chronicles. Update `Current_Status.md`, `Known_Issues.md` and `AI_Handover.md` after each verified increment.

**North star:** Student interaction -> recognized intent -> requested mathematical rule -> applicable rule result -> preview -> authorized commit. The AST is the mathematical authority; the renderer faithfully composes mathematical scope; the Window Manager eventually owns nonmathematical view slots. Preserve student agency and adjustable reasoning depth.

## Non-negotiable invariants

1. Mathematical Engine is independent of DOM, CSS, pointer events and window layout; rules check explicit conditions and preserve mathematically appropriate occurrence IDs.
2. Every AST occurrence remains semantically addressable; operator targets refer to their owning operation, including repeated visible glyphs. Natural AST roots remain natural: no artificial unary Add wrappers.
3. Layout containers and view slots are **not** mathematical AST nodes. Navigation follows AST ancestry, not arbitrary DOM ancestry. Existing nested Group targeting remains functional.
4. Visual feedback is semantic, centrally owned, reversible, and does not unexpectedly reflow the equation. Green numerical-factor eligibility, amber proposed structure, blue selection/grouping remain distinct roles.
5. Previews are detached and non-authoritative until the student confirms; cancellation and stale-state rejection do not mutate mathematical history. Publication is single-use and atomic.
6. Existing student interactions, history branching, persistence/import, and offline operation remain functional. No silent migration of saved documents.
7. Every change includes explanatory code comments, focused tests, updated living documentation, and handover notes. No refactor solely to shorten a file.

## Evidence from the preceding audit (recheck in code)

- `app.js` coordinates many unrelated responsibilities (~3,099 lines in audited release).
- `domRenderer.js` has a compact recursive core (~369 lines); replacing it wholesale is not justified.
- `structureNavigator.js` applies `is-structure-navigated` directly rather than using shared feedback ownership.
- Semantic container mapping and navigation repeat some DOM target-resolution decisions.
- Visual Feedback Controller owner/class cleanup may conflict when two owners use the same class on one element; **risk, not yet proven browser defect**.
- Distribution, factorisation, grouping, equality and negation have different preview presentation paths; some differences are educationally necessary.
- Documentation verification claims can become stale. The current project has Node and Playwright coverage; maintain both.

## Execution strategy: small vertical increments

### Phase 0 — Baseline and characterization (required before refactor)

**Deliverable:** Short source-grounded responsibility map: who creates DOM, resolves semantic targets, owns feedback, arbitrates input, mounts previews, and publishes history. Record current test commands and commit/tag baseline. Add characterization tests for existing behaviour before modifying it.

**Tests:** root and nested Group targeting, content-only Add/Multiply navigation, negation green/amber, distribution amber, equality and grouping, cancellation, stale preview, one history commit, import/reload.

**Exit gate:** baseline passes; unknowns recorded; no behavioural changes. If baseline fails, stop and diagnose.

### Phase 1 — Shared visual-feedback ownership (highest priority)

**Purpose:** One controller owns transient semantic styling. First reproduce and test overlapping owners applying identical roles to one DOM element; clear one owner and assert the other remains active. Define precedence for simultaneous selection, eligibility, preview and focus. Prefer owner-aware reference counting or recomputation of effective roles over class removal by one owner.

**Migration:** Move Structure Navigator's `is-structure-navigated` treatment behind shared controller APIs. Keep the navigator's AST navigation logic pure. Consolidate CSS design tokens and eliminate feature-local `!important` overrides where proven safe; preserve existing appearance and keyboard accessibility.

**Exit gate:** overlapping-owner Node tests; computed-style browser checks in both themes and hitbox visibility modes; no visual layout shift; all existing tests pass.

### Phase 2 — One semantic target resolver

**Purpose:** Centralize mapping from `(mathematicalObjectId, nodeId, targetRole, optional operator position)` to rendered target(s), including root, nested Group, content-only operation and operator glyph. Avoid using CSS selectors as the semantic source of truth.

**Design:** A small semantic target index/resolver built from renderer-provided metadata, scoped to a mathematical view. Expose explicit `found`, `content-only`, `operator-only`, `unavailable` outcomes. No assumption that all AST nodes have identical hitbox geometry. Multiple views must never accidentally cross-resolve.

**Migration:** Inspector, Navigator and feedback use the resolver; hit-testing still owns geometry. Start with a compatibility adapter; remove duplicated lookup only after comparison tests establish parity.

**Exit gate:** AST-to-target mapping tests for Number, Symbol, Add, Multiply, Group, Negate, Equal, multiple plus glyphs and natural roots; navigation and drag tests pass.

### Phase 3 — Explicit interaction recognition and arbitration

**Purpose:** Make the boundary `physical input -> semantic target -> proposed intent -> chosen intent` inspectable and single-owned. Distinguish input controller, hit-testing, feature recognizers, arbitration and rule application. A feedback controller must not silently veto a mathematically eligible action (the prior negation-compression failure is a regression fixture).

**Migration:** Extract one stable drag/hover orchestration seam from `app.js` at a time. Keep `app.js` the composition root; do not scatter shared mutable state into new modules. Recognizers propose intents, not commit mathematics. Use a documented arbitration table for numeric combination vs negation, grouping vs rearrangement, distribution vs other targets.

**Revised implementation sequence (decision of 7 November 2026):**

- **3A — Characterize current ownership (tests only):** Record listener ordering, propagation, pickup precedence, nested/Alt/factor selection, distribution/combine/negation overlap, requested versus settled insertion, final pointer-up retarget, cancellation on Escape/pointercancel/blur/visibility loss, touch tap-to-drag, and keyboard alternatives. Confirm current behaviour before changing it.
- **3B — Introduce pure arbitration:** Specify discriminated, side-effect-free intent proposals and a `chosen | none | blocked` result. Preserve source object/view identity and session token. Compare extracted arbitration against the existing decision path with tests before switching callers.
- **3C — Migrate ordinary drag seam:** Retain geometry snapshots, effective settled target, mathematical eligibility, and existing transformation commit lifecycle. Recheck on release. One gesture must produce at most one authorized commit.
- **3D — Migrate remaining owners separately:** Factor drag, identity toolbar drag, grouping and selection, negation operator activation, touch, and keyboard paths. Require a passing compatibility gate after each family; do not bundle these into a single controller rewrite.
- **3E — Verify and hand over:** Run Node, focused and full Playwright, manual visual/keyboard/touch checks, dependency checks, and update source-grounded docs. Record tests not run as pending.

**Proposed ownership contract:** One active view-local gesture owner; recognizers propose intentions without AST/history side effects; hit-testing supplies physical evidence; the semantic resolver supplies occurrence identity; the arbiter selects a single eligible proposal; the mathematical engine and existing single-use commit lifecycle remain authoritative. Feature-specific previews retain ownership of their visual explanations. Modal confirmation is a separate continuation; cancellation invalidates the session token. No global mutable interaction singleton.

**Precedence must be characterized, not guessed:** Negation operator activation blocks operand pickup; factor and identity sessions are exclusive; modal previews block incompatible new drags; eligible distribution plus precedes sibling combination; eligible combination precedes insertion gap; specifically eligible `-1` negation compression may supersede geometry; no unsettled insertion can commit; Escape cancels the active owner. These are observed behaviours or proposed preservation policies, **not** a universal priority list.

**Exit gate:** same mouse/keyboard/touch behaviour, stable drag geometry, no competing-preview race, cancel and commit once, all tests pass. See [Phase 3 ownership audit and arbitration contract](Presentation_Interaction_Phase3_Arbitration_Contract.md) for source ownership, open questions, contracts and acceptance gates.

### Phase 4 — Preview lifecycle convergence

**Purpose:** Shared preview ownership, candidate mounting, feedback target declaration, confirm/cancel, stale invalidation and history boundary. Preserve specialized visual storytelling: distribution provenance arrows and grouping envelopes are not forced into identical DOM.

**Migration:** Inventory each preview family and classify shared lifecycle vs feature-specific presentation. Move only genuinely repeated responsibilities behind narrow contracts. Migrate one family per release, compare actual browser interaction, then remove obsolete paths with evidence of no remaining callers.

**Exit gate:** each migrated feature has parity tests; provenance and educational visuals preserved; no duplicate commits or accidental history on cancel.

**Revised Phase 4 sequence (2026-11-07):** 4A source inventory and characterization (no production changes); 4B minimal shared lifecycle/exclusivity contract; 4C first modal family migration; 4D remaining modal families one at a time; 4E non-modal preview and asynchronous cleanup verification; 4F final audit and handover. See [Phase 4 detailed plan](Phase4_Preview_Lifecycle_Consolidation_Plan.md). This sequence is **now completed through Phase 4F**; see `Current_Status.md` for the verified status and remaining evidence gaps.

### Phase 5 — `app.js` composition-root cleanup and guardrails

**Purpose:** Reduce reasons `app.js` must change, not merely its line count. Extract stable document/workspace coordination and view-level orchestration only when boundaries are demonstrated. Introduce lightweight ESLint / dependency-boundary checks with a measured, non-disruptive rollout.

**Exit gate:** imports and ownership graph clearer; no new cycles; same persistence/history/preview behaviour; living docs and module comments accurate.

**Detailed Phase 5 plan (8 November 2026):** 5A responsibility/dependency characterization; 5B lightweight guardrails; 5C conditional workspace/document extraction; 5D conditional view orchestration extraction; 5E composition-root simplification; 5F final verification and handover. This is a **proposal**, not implemented code. See [Phase 5 execution plan](Phase5_Application_Composition_Execution_Plan.md). The project owner reports all 74 targeted retrospective browser tests passing; Phase 5A is next.

### Phase 6 — Window Manager readiness (design gate, not implementation)

**Purpose:** Define non-AST `ViewSlot`/`ExpressionSlot` identity, view ownership and update notifications. A Mathematical Object may expose independently viewable chunks without changing its AST. Multiple windows may render different portions of one MOb. View-local selection, feedback and geometry cannot leak across windows.

**Future Target Proxy Palette:** compact colour/name handles (not full expression copies), document-persistent *interface* state, no mathematical history events. Resolve occurrence/operator proxies through the semantic resolver and MOb identity. When an occurrence disappears, mark proxy unavailable; future rule-provided provenance/continuity can offer deliberate retargeting. **Do not infer continuity from mathematical equivalence or reuse a node ID for a new occurrence.**

**Exit gate:** architecture document with sample two-view scenario, slot vs occurrence reference semantics, invalidation rules, persistence versioning and tests to be added before implementation.

## Standard per-increment protocol

1. **Purpose and student interaction:** What concrete behaviour or maintainability problem are we fixing? What remains unchanged?
2. **Source ownership:** List current entry points, callers, data owners and dependencies. Confirm the authoritative data, derived data, transient state, persistence and node-ID policy.
3. **Alternatives:** Consider smallest adapter, incremental migration and rewrite; choose least disruptive option. Document why.
4. **Contract:** Specify inputs, outputs, errors, ownership, cleanup, compatibility and feature flags if needed.
5. **Tests first:** Characterize current behaviour and add a failing regression for the actual defect or invariant. Never weaken assertions to hide application faults.
6. **Implement:** Small cohesive diff, strong explanatory comments, no mathematical-engine changes unless separately authorized.
7. **Verify:** Node suite, focused Playwright, full Playwright, syntax/static checks, manual visual checks when necessary. Mark unrun checks as pending, not passed.
8. **Handover:** Update existing authoritative docs and this plan's status; include exact changed files, why, tests, known risks and next increment. Deliver a verified complete Windows-compatible project archive when requested.

**Historical checkpoint note:** The milestone entries below are chronological snapshots; older phrases such as "pending" or "not started" are superseded by `Current_Status.md` and must not be interpreted as present status.

## Progress ledger

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Baseline/characterization | Node-characterized; browser pending | Source map and 3 characterization tests added; 289/289 baseline and 292/292 expanded Node tests passed. See [Phase 0 baseline](Presentation_Interaction_Phase0_Baseline.md). |
| 1 Feedback ownership | Implemented; browser verified by project owner | 297/297 Node tests and owner-reported browser pass. |
| 2 Semantic target resolver | Hardened; owner reports all browser tests passed | Shared view-local resolver, navigator/inspector/feedback adapter; 303/303 Node tests; operator index and mixed-address contracts corrected. Owner reported full browser pass after hardening. See [Phase 2 contract](Presentation_Interaction_Phase2_Semantic_Targets.md). |
| 3 Interaction arbitration | Design and ownership audit documented; implementation not started | Five increments 3A–3E; characterize first, pure arbitration second, migrate each gesture family with parity gates. See [Phase 3 contract](Presentation_Interaction_Phase3_Arbitration_Contract.md). |
| 4 Preview convergence | Planned | Feature-by-feature. |
| 5 Composition root and guardrails | Planned | Avoid line-count-driven extraction. |
| 6 Window Manager readiness | Planned | Design only; no Window Manager or proxies implemented. |

## Stop / rollback conditions

Stop and revert the increment if a regression affects mathematical meaning, stable IDs, selection target identity, preview cancellation, history, import/persistence, accessibility, or layout geometry. If a test passes locally but fails in CI, inspect the trace and actual source before modifying tests. Keep last green version available. Never combine a broad refactor with a new mathematical feature.

## Success definition

A future developer can add a new mathematical node presentation or interaction recognizer by following documented contracts rather than editing several unrelated controllers and CSS overrides. The user can explain and inspect the flow from AST occurrence to visual container to semantic target to student intent to rule application. The Window Manager can later add multiple view slots without adding artificial mathematical wrappers.

### Phase 3A incremental checkpoint (2026-11-07)

Four new black-box browser characterization tests have been added for gesture
cancellation and exclusive negation-operator activation. Production is
unchanged; 303/303 Node tests pass. Browser suite pending. The Phase 3A
contract and remaining overlap/animation cases are documented in
`Developer Documentation/Phase3_Interaction_Ownership_Audit_and_Arbitration_Contract.md`.

### Phase 3B implementation checkpoint — 7 November 2026

A pure advisory intent arbiter and Node tests have been added without connecting it to live gesture dispatch. Phase 3A browser suite was reported passing (56 tests). Next: Phase 3C migration, beginning with one ordinary-drag seam and a characterization comparison. No Phase 4/5 work is included.


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

### Phase 3C hardening gate (2026-11-07)

The ordinary-drop adapter validates session and settled-target shape before
mathematical eligibility evaluation; it fails closed on thrown or nonboolean
eligibility and preserves informative invalid-drop feedback. Node: 329/329
passing. Browser: pending on hardened archive. Phase 3D should not begin
until the hardened browser suite has been verified.

### Phase 3D progress note (2026-11-07)

3D is being delivered in independently browser-verifiable increments. **3D-1
factor drag is implemented and Node-tested (335/335), browser pending.** The
remaining gesture owners are not migrated. See
`../02_Architecture/Phase3D_Remaining_Gesture_Owners_Implementation.md` for
ownership contracts, testing gates and the sequence for 3D-2 onward.

### 2026-11-07 Phase 3D-5 checkpoint (supersedes older pending statuses)

Touch and keyboard routing has been extracted into a pure, non-transforming classification boundary. Mathematical commands continue through their existing validation and commit infrastructure; no new transformation intent is created by selection. 360/360 Node tests passed; browser rerun of the 60-test baseline pending. Phase 3E remains the final end-to-end interaction ownership and publication audit before Phase 4.

### Phase 3E acceptance checkpoint — 2026-11-07 (latest authoritative status)

Phase 3D-5: **60/60 browser tests passed**, as reported by the project owner. Phase 3E adds five cross-family Node tests and a final source-level interaction architecture audit; **365/365 Node tests passed**. No production JavaScript changed in Phase 3E. The new archive's browser rerun is pending. Phase 3 is accepted at the *advisory arbitration* boundary, **not** as a completed universal gesture coordinator: event dispatch and some modal gating still reside in `app.js`. See `../02_Architecture/Phase3E_Final_Interaction_Architecture_Audit.md` for verified claims, limitations, and Phase 4 entry conditions. Earlier historical pending notes are superseded by this checkpoint.


### Phase 3E owner verification and Phase 4 planning (2026-11-07)

Project owner reports **60/60 Phase 3E browser tests passed**; Phase 3E Node suite **365/365 passed**. This supersedes older pending statements in historical checkpoints. Phase 4 plan documented; **no Phase 4 production changes**. Start with 4A characterization, not a universal modal manager.


### Phase 4A characterization checkpoint (2026-11-07)
Phase 3E baseline: owner reports 60 browser tests passed. Phase 4A adds six Node lifecycle tests and two Playwright preview cancellation/reopening tests, with **371/371 Node tests passing**. Browser tests for Phase 4A remain pending. No production JavaScript changed. The authoritative current preview inventory, cautious compatibility review matrix, and unresolved Phase 4B questions are in `02_Architecture/Phase4A_Preview_Inventory_and_Characterization.md`. Do not implement cross-family modal ownership until source/browser behaviour is characterized. Preserve feature-specific educational presentation and the existing atomic commit authority.

### Phase 4F verification checkpoint (8 November 2026)

Phase 4E passed 72/72 browser tests (owner-reported). Phase 4F adds six cross-family Node tests and a source-grounded acceptance document, with 387/387 Node tests passing and no production JavaScript modifications. Browser rerun is pending. After a focused Phase 4F audit, conduct the documented retrospective audit of Phases 1–4 **before** Phase 5 composition work. Current status is maintained in `Current_Status.md`, not in older milestone paragraphs.
