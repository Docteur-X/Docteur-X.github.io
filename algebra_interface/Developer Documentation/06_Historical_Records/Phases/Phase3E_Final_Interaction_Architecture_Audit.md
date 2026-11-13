# Phase 3E — Final interaction architecture audit and acceptance gate

**Date:** 2026-11-07. **Baseline:** Phase 3D-5 delivery; project owner reports all 60 Playwright tests passed. **This increment:** documentation plus five cross-family Node characterization tests; **no production JavaScript modifications**.

## Executive decision

The Phase 3 intent architecture is **acceptable for continued incremental development**, subject to the explicitly deferred risks below. The implementation has successfully introduced pure advisory arbitration and feature-specific adapters without moving mathematical authority into gesture recognizers. However, it has **not** implemented the originally envisioned single view-local gesture coordinator. Do not claim that all physical-input ownership or modal exclusion is centralized. Phase 4 should consolidate preview lifecycles only where a real ownership conflict is demonstrated.

## Actual source ownership, not aspirational architecture

| Responsibility | Current production owner | Verified boundary / limitation |
|---|---|---|
| Pointer/keyboard/touch event dispatch and mode checks | `js/app.js` | Still multiple listeners and mode-specific gates; no universal coordinator. |
| Physical target geometry | `interaction/hitTesting.js`, drag feedback, app drag state | Geometry is not mathematical eligibility; ordinary release uses settled `activeTarget`. |
| Semantic target lookup | `rendering/semanticTargetResolver.js` | AST occurrence addresses are distinct from physical hitboxes. |
| Pure intent decision | `interaction/intentArbitration.js` | Explicit owner capabilities, view/object/session checks, ambiguity handling; no DOM or commits. |
| Ordinary, factor, identity, grouping, negation adapters | `interaction/*Arbitration.js` | Eligibility is derived from existing mathematical rules/coordinator, not proven by the arbiter. |
| Touch tap and keyboard classification | `interaction/selectionCommandRouting.js` | Selection is not a transformation; keyboard commands still execute existing feature paths. |
| Feature previews and confirmations | Existing feature-specific preview controllers and `app.js` | Modal exclusion is partly distributed; no global modal registry. |
| Mathematical candidate and commit | Transformation coordinator, commit lifecycle, history | Remain authoritative; arbiter results are advisory only. |

## Cross-family regression evidence

`tests/phase3e-interaction-contract.test.js` adds five tests: (1) owner-to-intent capability exclusion across all five transforming families, (2) view/object/session isolation, (3) cancelled/stale/modal blocking, (4) recognizer-order-independent ambiguity, and (5) selection separation from transformation. The complete Node suite passed **365/365** on this baseline. The owner reports **60/60** Playwright tests passed on the Phase 3D-5 baseline. **The new Phase 3E archive still requires its own browser rerun**; no browser result is claimed for this archive.

## Architectural acceptance criteria and results

1. **Mathematical authority:** PASS by source inspection. No adapter commits AST/history; final transformation rules and commit lifecycles remain authoritative.
2. **Stable occurrence identity:** No new production mutation path introduced in Phase 3E. Existing identity regression tests pass; not a formal proof for all transformations.
3. **Exclusive owner capability:** PASS at pure-arbiter boundary. This does not prove all DOM listeners are mutually exclusive in every browser event sequence.
4. **Source/session/view isolation:** PASS in adapter/arbiter tests. Live multi-view instances are not yet implemented; view identity currently includes a placeholder for the main view.
5. **Settled release and single publication:** Existing source checks and browser coverage retained. Cross-feature exactly-once publication and interrupted-animation timing remain important targeted integration tests.
6. **Accessibility and teaching feedback:** Existing keyboard/touch paths and feature previews preserved. Full accessibility audit and actual classroom usability studies are outside Phase 3E.
7. **Preview exclusivity:** PARTIAL. Negation/equality reciprocal gates were hardened; modal checks elsewhere remain distributed. Do not assert global mutual exclusion.
8. **Modularity:** IMPROVED. New intent families can reuse the pure arbiter and owner capability map, but currently still require feature-specific wiring in `app.js`.

## Source-grounded risks and deferrals

- **Distributed modal gating:** `app.js` contains several mode-specific checks. The negation/equality exclusion is explicit, but this does not establish universal preview exclusivity. Phase 4 should inventory preview ownership and characterize conflicting openings before extracting a shared lifecycle.
- **Release-to-publication integration coverage:** The pure adapters are well tested, but not every live release path has an isolated exactly-once history assertion. Add targeted Playwright coverage as a prerequisite to altering those paths.
- **Keyboard command gating:** `classifyOccurrenceKey()` is classification only; existing keyboard distribution/rearrangement paths remain independent of `arbitrateIntents()`. This is intentional, not a failed migration. Preserve accessibility while clarifying ownership in later work.
- **Temporary view ID:** The main equation view identifier is not an allocated multi-view slot. Replace only when actual view instances are introduced, with explicit isolation tests.
- **Eligibility is advisory:** Feature adapters supply `eligible` based on existing mathematical validation. The arbiter must never become the source of mathematical truth; final commit-time validation remains mandatory.
- **Old documentation statuses:** Historical phase-specific paragraphs remain as records. This document and the current status ledger supersede older 'pending' statements; do not silently rewrite historical records.

## Phase 4 handover / stop conditions

1. Begin with a preview owner/state inventory and an explicit matrix of incompatible simultaneous previews. Preserve educational presentation differences (blue grouping brackets, amber distribution provenance, factorisation extraction, negation inline explanations).
2. Characterize open, update, cancel, confirm, stale-source, rerender and exactly-once publication for each preview family before moving any lifecycle responsibility.
3. Consolidate **lifecycle ownership**, not preview geometry or mathematical rules. Avoid a universal UI controller or a second commit pathway.
4. Keep `app.js` changes incremental; Phase 5 is the composition cleanup phase. Avoid extracting a new global modal manager without demonstrated benefit.
5. Each increment requires a fresh Node run, full browser suite, targeted boundary tests, updated docs, and user confirmation of browser results. Revert unintended mathematical, educational or stable-ID changes rather than weakening tests.

## Educational policy reminder

The default distribution gesture deliberately targets the `+` operator within a sum, highlighting the distributive relationship. Optional bracket targeting is a **future teaching-policy experiment**, not a Phase 4 task. A future gesture recognizer must not redefine mathematical eligibility, and ambiguous overlapping valid gestures must not silently select an arbitrary transformation.
