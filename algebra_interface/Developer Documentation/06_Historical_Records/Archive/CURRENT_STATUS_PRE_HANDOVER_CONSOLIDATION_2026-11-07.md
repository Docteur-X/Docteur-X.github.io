# Archived prior Current_Status.md — historical only

Superseded by `05_Roadmap/Current_Status.md` on 7 November 2026.

---

> **Current consolidation checkpoint (7 November 2026):** Project owner reports all tests passed for Phase 2 Hardened (Node 303/303 in the build environment; full browser suite owner-verified). Phase 3 has a source-grounded ownership audit and a proposed five-increment arbitration contract, but **no Phase 3 implementation**. See [master plan](../Phases/Presentation_Interaction_Consolidation_Master_Plan.md) and [Phase 3 contract](../Phases/Presentation_Interaction_Phase3_Arbitration_Contract.md). The historical status entries below concern earlier releases.

> **Consolidation Phase 0 (2026-11-07):** Source-grounded responsibility map and 3 non-behavioural characterization tests added. Baseline Node 289/289; expanded Node 292/292 passed. Playwright on this increment pending; user verified the preceding Mathematical Structure Navigation v1. See [Phase 0 baseline](../Phases/Presentation_Interaction_Phase0_Baseline.md) and [living master plan](../Phases/Presentation_Interaction_Consolidation_Master_Plan.md). No production application behaviour changed.

> **Current source increment (2026-11-07):** Mathematical Structure Navigation v1 introduces a non-history AST navigator and semantic focus. 289 Node tests passed in the build environment; Playwright remains pending. Last owner-verified rollback baseline: AST Root Semantics v1.1. See [navigation design](../Superseded_2026-11-12/Mathematical_Structure_Navigation_v1.md).

> **Current source increment (7 November 2026): AST Root Semantics v1.** The production parser and normalizer no longer manufacture a one-child `Add` root. Root-level distribution, identity insertion, and explicit grouping have explicit root-replacement support. Node suite 286/286 passed in the implementation environment; Playwright verification is pending. Historical test fixtures retain an explicit legacy wrapper adapter; see [AST Root Semantics](../Superseded_2026-11-12/AST_Root_Semantics_v1.md). The owner-verified rollback baseline is Renderer Transparency and Semantic Container Mapping v1 (274 Node and 47 browser tests passed).

> **Current increment (7 November 2026):** Workspace Import and Autosave Lifecycle Correction v1 is source-tested (270/270 Node tests); GitHub Actions/Playwright verification is pending. The previously user-verified mathematical baseline remains Negation v1.2.3. See [Workspace lifecycle](../../03_Developer_Guides/Workspace_Import_Autosave_Lifecycle.md).

> **Verification update (owner report, 7 November 2026):** Negation v1.2.3 passed the Node and Playwright suites and manual interface checks. The subsequent terminology documentation update makes no application-code changes. Earlier “browser pending” statements below describe their historical verification point.

# Current status — Negation v1.2.3 (7 November 2026)

**Latest user-verified baseline:** Negation v1.2.2. The project owner reported that all Node and Playwright tests passed and confirmed the green “Release to negate” interaction visually. This is a user report, not a fresh browser run in the v1.2.3 build.

**Current source increment:** Negation v1.2.3 (contract and regression hardening). The semantic negation visual adapter now supplies distinct expansion/compression preview wording; structural parser round-trip and negative-literal tests have been added. No mathematical rules, gestures, history formats, or preview geometry were changed. The Node suite passed **268/268** in the build environment; Playwright must be rerun on this release before it becomes the next verified baseline.

## Implemented capabilities

- Mathematical Document with multiple Mathematical Objects, branching history, IndexedDB persistence and validated JSON import/export.
- Expression AST, explicit Group nodes, addition, multiplication, scalar numerical combination, rearrangement, distribution, factorisation, grouping, identity insertion, and limited equality function application.
- Registered transformation proposals and shared single-use, stale-safe commit lifecycle for the principal transformation families; common prepared-state publication boundary.
- Unary `Negate`, subtraction parsed as addition of a negated term, atomic negative numeric literals, inline expansion/compression preview, click/keyboard amber confirmation, and green compression eligibility feedback.
- Nested occurrence/operator hitboxes, mathematical clipboard, selection and drag feedback. See [Negation reference](../../04_Reference/Negation_and_Subtraction_v1.md).

## Boundaries and future work

The current engine primarily models ordinary scalar algebra. General type/assumption reasoning, division, powers, logical contexts, general substitution, matrices/vectors, multiple active views, and resizable windows are not implemented. Preview labels now derive from a shared semantic adapter; the preview is still a negation-specific UI controller. The compression hover path currently materializes detached candidates; optimize only after profiling.

**Verification:** Run `node --test tests/*.test.js` and `npm run test:e2e` (or `npx playwright test`) in a Node/npm-enabled environment. Distinguish reported browser results from local Node execution. Track unresolved issues in [Known Issues](../../05_Roadmap/Known_Issues.md) and update this single status snapshot rather than appending another dated milestone section.

## Presentation design decision (7 November 2026)

[Mathematical Presentation Composition Contract v1](../../04_Reference/Mathematical_Presentation_Composition_Contract.md) is adopted as an **architectural design contract only**. No runtime renderer, hit-testing, mathematical rule, document schema, history, or proxy behaviour changed in this documentation increment. Structural navigation, target proxies, geometry metadata and rule-following proxy continuity are future work; current operation-level hitbox coverage is incomplete. Owner reported the Workspace Import and Autosave Lifecycle Correction v1 GitHub Actions verification passing; that report is distinct from tests of this documentation increment.

### 7 November 2026 — Phase 3B contract hardening

Phase 3B pure intent arbitration hardened: explicit owner capability map,
identical-action deduplication, documented unsettled-preview and eligibility
contracts, primitive-only frozen proposal snapshots. No live gesture wiring or
mathematical engine changes. Node suite: **318/318 passed**. Browser suite for
this hardened build pending (prior Phase 3B baseline: 56/56 owner-reported pass).
Next gate: rerun browser suite, then Phase 3C ordinary-drag integration.


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

### 2026-11-07 — Phase 3C hardening candidate

Phase 3C hardening implemented; 329/329 Node tests pass. Browser verification
of the hardened build remains pending. The prior Phase 3C build passed the
user's browser suite. Phase 3D has not started.

## 2026-11-07 — Phase 3D increment 1 (factor-drag advisory migration)

Phase 3C Hardened browser suite: user reports all tests passed. Phase 3D has
**started but is NOT complete**. The selected-factor extraction-zone release now
passes through a pure `factorise` intent adapter with view/object/session/source
checks. The existing factorisation preview, confirmation and commit lifecycle
remain unchanged. Six new Node tests pass; full Node suite **335/335 passed**.
Browser tests for the 3D-1 build are **pending**. Identity toolbar, grouping,
negation operator, touch and keyboard migration are **not yet implemented**.
See `02_Architecture/Phase3D_Remaining_Gesture_Owners_Implementation.md`.

## 2026-11-07 — Phase 3D-5 touch/keyboard integration checkpoint

Phase 3D-4 modal-hardened build: user confirmed 60 browser tests passed. Phase 3D-5 adds a pure selection-versus-command router and five Node tests; 360/360 Node tests pass. The existing 60 browser tests require rerunning on this build. Phase 3E comprehensive integration verification is pending. See `02_Architecture/Phase3D5_Touch_Keyboard_Handover.md`.

## Latest Phase 3E checkpoint (2026-11-07)

Phase 3D-5 browser verification: project owner reported **60/60 passed**. Phase 3E final architecture audit added five cross-family Node tests and no production code changes; **365/365 Node tests passed**. Phase 3E archive browser rerun is pending. The advisory intent arbitration contract is in place, but `app.js` still owns physical event dispatch and distributed preview/modal gates. See `../02_Architecture/Phase3E_Final_Interaction_Architecture_Audit.md`. Next planned work: Phase 4 preview lifecycle characterization, not a wholesale rewrite.


## Phase 3E verified / Phase 4 planning (2026-11-07)

Project owner reports all **60/60 browser tests passed** on Phase 3E; **365/365 Node tests** passed in the prior run. Phase 4 has a detailed **planning-only** 4A–4F execution contract at `../02_Architecture/Phase4_Preview_Lifecycle_Consolidation_Plan.md`. No Phase 4 production code or tests have been implemented yet. Next: 4A preview owner inventory and characterization. Older pending entries are historical checkpoints.


### Phase 4A characterization checkpoint (2026-11-07)
Phase 3E baseline: owner reports 60 browser tests passed. Phase 4A adds six Node lifecycle tests and two Playwright preview cancellation/reopening tests, with **371/371 Node tests passing**. Browser tests for Phase 4A remain pending. No production JavaScript changed. The authoritative current preview inventory, cautious compatibility review matrix, and unresolved Phase 4B questions are in `02_Architecture/Phase4A_Preview_Inventory_and_Characterization.md`. Do not implement cross-family modal ownership until source/browser behaviour is characterized. Preserve feature-specific educational presentation and the existing atomic commit authority.
