> **Reading note (8 November 2026):** This document preserves the original Phase 4 plan and historical execution records. For current implementation status and remaining verification gates, read `Phase4F_Cross_Family_Acceptance.md` and `../05_Roadmap/Current_Status.md` first.

# Phase 4 — Preview lifecycle convergence: implementation plan

**Planning date:** 2026-11-07  
**Baseline:** Phase 3E complete project; project owner reports the 60 browser tests pass. Phase 3E adds five Node tests, with 365/365 passing in the previous run; no production changes.  
**Status:** Phase 4A characterization implemented (6 Node + 2 Playwright tests); Node 371/371 passed, browser verification pending. Phase 4B–4F not started.  
**Authority:** The current source and executable tests supersede this plan if discrepancies are found.

## Purpose and boundaries

Consolidate **ownership and lifecycle semantics** of mathematical previews, not their mathematical rules, visual appearance, geometry, or teaching explanations. Each preview is a detached, non-authoritative proposal until an authorized confirmation. There must be no competing incompatible modal proposals, no publication on cancellation, and at most one publication per confirmed proposal. A preview may be non-modal (e.g. drag/rearrangement visualization); not every preview should be forced into a modal contract.

**Do not:** rewrite the renderer, replace feature-specific provenance arrows or blue grouping envelopes, change AST node IDs or rule eligibility, add a global DOM singleton, reimplement history publication, or conflate teaching policy with mathematical truth. The current `+`-targeted distribution gesture remains the default; optional bracket targeting is future work, not Phase 4.

## Initial source map (must be verified in Phase 4A)

| Preview family | Known source seams | What must remain feature-owned |
| --- | --- | --- |
| Distribution | `js/app.js`, `js/interaction/transformationPreview.js`, distribution-related interaction and coordinator code | Amber source-to-result provenance, term copies, mathematical distribution plan |
| Factorisation | `js/app.js`, `js/interaction/factorisationPreview.js` | Extraction geometry, factor choices, explanations |
| Grouping | `js/app.js`, `js/interaction/groupingPreview.js` | Blue range envelope, adjacent-sibling grouping semantics |
| Negation expansion | `js/app.js`, `js/interaction/negationInlinePreview.js` | Inline -1 explanation, operator activation semantics |
| Identity insertion | `js/app.js`, identity preview handlers | +0 / ×1 target semantics and amber inserted identity |
| Equality application | `js/app.js`, equality interaction/controller code | Relation-specific explanation and equality scope |
| Rearrangement | `js/app.js`, `js/interaction/rearrangementPreview.js` | Requested versus settled insertion geometry, drag animation |
| Immediate combination | `js/app.js`, commit lifecycle | Usually no modal preview: **do not** force a confirmation step |

Existing shared seams include `js/manipulator/previewCoordinator.js`, `js/manipulator/transformationCommitLifecycle.js`, preview confirmation targets, and atomic transformation publication. Inspect their actual APIs and callers before selecting a new abstraction. Names in this table are investigation entry points, not proof that every family uses those modules.

## Proposed state and ownership contract (design, not implemented API)

A **view-scoped preview owner** may hold at most one incompatible modal proposal. A candidate carries a source stamp (document, Mathematical Object, history revision, root ID/fingerprint as appropriate), an immutable proposal identity, and a feature owner. Lifecycle transitions are conceptual:

- `idle -> open`: acquire exclusive compatible preview ownership only after an existing mathematical coordinator has produced an eligible detached candidate.
- `open -> open`: feature-specific presentation updates may occur without changing the mathematical candidate or ownership token; explicit replacement is a cancel-and-open transaction, not silent overwriting.
- `open -> confirming`: verify owner/token, source freshness, mathematical validity, and single-use confirmation via the existing commit lifecycle.
- `confirming -> closed`: publish through existing atomic commit and history once; release ownership and clean transient DOM.
- `open -> closed`: cancel, Escape, rerender invalidation, object switch, or disposal releases ownership and removes preview DOM, **without** history publication.
- Repeated confirm/cancel, stale callbacks, late animation completion, and detached DOM must be harmless; failure to acquire ownership must not erase the current preview.

Do not introduce this as a new second commit controller. The first extraction should likely be an explicit **modal lease/exclusivity guard** or compatibility adapter, if characterization demonstrates shared benefit. The state owner must be per-view; mathematical candidates and committed history remain with their existing owners. A discrete command is not a long-lived pointer drag. Non-modal drag previews may coexist with hover/feedback but not with incompatible modal commits.

## Phase 4 execution plan and gates

### 4A — Inventory and characterize (no production changes)

Trace every open/update/confirm/cancel/destroy path, event listener, Escape/outside-click, object switch, rerender, and source-staleness check. Build an **observed** compatibility matrix (not a guessed universal block rule): distribution × grouping × factorisation × negation × identity × equality, plus rearrangement, hover and selection. Record current exclusivity checks, DOM roots, focus restoration, owner state, and history publication. Add focused Node and Playwright characterization tests, especially reciprocal modal attempts, cancellation, double confirmation, and late callbacks. Record gaps and actual behaviour, including any discovered defects; do not normalize defects into desired behaviour.

**Gate:** full prior suite green, observed matrix documented, no production changes, unresolved cases explicit.

### 4B — Define minimal shared lifecycle/exclusivity contract

From 4A evidence, specify whether the smallest safe extraction is a view-local lease, a shared lifecycle adapter, or reuse/extension of existing `previewCoordinator` and `transformationCommitLifecycle`. Document acquire/release rules, token identity, ownership, compatibility, stale-source semantics, focus/cancel cleanup, and failure behaviour. Add pure contract tests (two owners, repeated release, stale token, cross-view isolation, blocked replacement). No preview rendering or mathematical commit changes.

**Gate:** design review confirms no second source of mathematical truth, no new global mutable singleton, and no duplicate publication path.

### 4C — Migrate one modal family first

Select the simplest *source-confirmed* family with a demonstrable lifecycle overlap; do not preselect on aesthetics. Retain its current preview renderer and confirmation/commit lifecycle. Introduce a compatibility adapter, compare before/after events, status messages, focus, DOM cleanup and history. Keep a rollback checkpoint.

**Gate:** focused and full browser tests pass, exact-once commit, cancel/stale zero history, no visual or educational regression.

### 4D — Migrate remaining modal families one at a time

Suggested inventory order for consideration (not fixed implementation order): identity, negation, grouping, distribution, factorisation, equality. Re-evaluate ordering after 4A/4C. For each: test open while another family is active in **both directions**; verify keyboard, touch, outside click, Escape, rerender, object switching, repeated confirmation and history. Preserve feature-specific teaching visuals. Remove obsolete gates only after caller search and parity evidence.

**Gate per family:** full Node + Playwright pass and updated source ownership table; no bundled multi-family rewrite.

### 4E — Non-modal preview compatibility and lifecycle edge cases

Audit rearrangement/drag animation, requested versus settled target, hover feedback, preview clones, pointercancel/blur, and asynchronous completion after cancellation or rerender. Reuse common ownership only where the actual semantics fit. Do not force rearrangement or immediate numeric combination into modal confirmation. Add leak/cleanup characterization and no-layout-shift checks where possible.

**Gate:** stable geometry and node IDs, no stale callback resurrection, no ghost/DOM retention, no duplicate commit.

### 4F — Final verification, simplification and handover

Run full Node and browser suites, targeted cross-family conflict and exactly-once publication tests, keyboard/touch and themes where relevant. Inspect dependency graph for cycles and shared-state leaks. Remove proven-dead compatibility code only with call-site evidence. Update master plan, `Current_Status.md`, `Known_Issues.md`, AI handover and source comments. Report measured results and outstanding risks separately. Phase 5 owns composition-root cleanup; Phase 6 owns multi-view design.

## Acceptance matrix to populate in 4A

For each preview family record: entry gesture; owning controller/state; mathematical candidate origin; modal/non-modal; incompatibilities; confirmation trigger; cancellation paths; stale check; rerender/object-switch cleanup; focus; history publication; existing tests; missing tests. **Do not claim the matrix has been empirically completed until the actual source and browser traces are checked.**

## Hard stop / rollback conditions

Stop if any increment changes mathematical eligibility, creates a second history commit route, loses stable occurrence IDs, opens two incompatible modal proposals, permits late stale confirmation, alters educational previews, breaks keyboard/touch, changes persistence, or introduces layout shifts. Diagnose before modifying tests. Keep the last owner-browser-verified ZIP as rollback baseline.

## Immediate next action

Implement **4A only**: source-grounded inventory, observed compatibility matrix and characterization tests. No production refactor until 4A passes. Keep this document as the maintained Phase 4 contract and update status after each increment.


## Phase 4A execution record (2026-11-07)

See `02_Architecture/Phase4A_Preview_Inventory_and_Characterization.md` for the observed source map, conservative compatibility review matrix, test contracts and unresolved browser verification. Production code was not modified. Do not mistake the matrix for a proven universal modal policy.

## Phase 4B execution record (2026-11-07)

The isolated, DOM-free view-local exclusive lease contract is now implemented in `js/interaction/modalPreviewOwnership.js`, with six new Node contract tests (377/377 full Node suite passed). See `Phase4B_Modal_Preview_Ownership_Contract.md` for API, lifecycle, exclusions and Phase 4C migration protocol. **No live preview family has been migrated.** The Phase 4A source inventory's unverified compatibility combinations remain unresolved. Phase 4C must migrate one family with full browser parity tests; do not replace the existing mathematical commit lifecycle.

## Phase 4F verification increment — 8 November 2026

All six modal families have now been migrated in Phases 4C–4D. Phase 4E was browser-verified (72/72, owner-reported). Phase 4F adds six Node contract tests exercising the real lease registry together with the real single-use commit lifecycle (387/387 Node tests passed), with no production JavaScript changes. See `Phase4F_Cross_Family_Acceptance.md` for the observed ownership inventory, evidence limits and remaining fault-injection/browser integration gaps. The earlier “Immediate next action: 4A” above is historical planning context, not the current milestone. Phase 4F browser verification and retrospective Phases 1–4 audit are the next gates before Phase 5.
