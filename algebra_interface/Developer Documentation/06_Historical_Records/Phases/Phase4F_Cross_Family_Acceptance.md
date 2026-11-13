# Phase 4F — Cross-family preview acceptance and source audit

**Status (8 November 2026): accepted, browser-verified.** **387/387 Node tests passed** in implementation and independent audit; the project owner reports **72/72 Playwright tests passed** on Phase 4F. The independent Phase 4F audit is complete. Production JavaScript was unchanged during Phase 4F. The next milestone is the retrospective Phases 1–4 audit, not Phase 5 implementation.

## What Phase 4F verifies

Six preview families—negation expansion, equality application, identity insertion, grouping, distribution and factorisation—use the view-local `createModalPreviewOwnership` lease. Their mathematical candidates and single-use commit lifecycles remain feature-owned. Rearrangement animations, hover/selection and ordinary dragging are *not* modal preview leases.

New `tests/phase4f-cross-family-lifecycle.test.js` exercises the real registry and real `createTransformationCommitLifecycle` together, across all six owner labels. It verifies all 30 directed owner conflicts at the **contract boundary**; incumbent preservation; sequential cancellation/reacquisition; stale-source rejection; reentrant confirmation; thrown publication; stale lease release; invalidation; and independent view registries. This is **not** equivalent to testing all 30 pairs through browser event handlers. Do not describe it as such.

## Source-grounded ownership inventory

| Family | Live integration in `js/app.js` | Special non-modal states | Source of commit authority |
| --- | --- | --- | --- |
| Negation | `negationPreviewLease`, acquire in negation preview opening, release in cancellation | operator activation and ordinary-drag compression are separate paths | existing negation transformation lifecycle |
| Equality | `equalityPreviewLease`, acquire when applying an armed equality operation | arming and operation menu visibility | equality commit lifecycle |
| Identity | `identityPreviewLease`, acquire when identity confirmation preview opens | toolbar pickup and drag | identity commit lifecycle |
| Grouping | `groupingPreviewLease`, acquire on deliberate grouping preview | operand selection, grouping overlay | grouping commit lifecycle |
| Distribution | `distributionPreviewLease`, acquire on prepared distribution confirmation | ordinary drag targeting and provenance visualization | distribution commit lifecycle |
| Factorisation | `factorisationPreviewLease`, acquire on extraction confirmation | factor selection and extraction-zone drag | factorisation commit lifecycle |

The table identifies source responsibilities, not a claim that every cleanup branch has been fault-injection-tested.

## Cross-family acceptance matrix

| Invariant | Evidence | Limit |
| --- | --- | --- |
| One modal owner per view | Phase 4B registry tests; Phase 4F 30 directed contract conflicts | Browser pairwise matrix not exhaustive |
| Cancel then reopen without publishing | Phase 4F contract tests and family-specific Playwright tests | Not every combination of family-to-family reopening tested |
| Exactly-once publication | Single-use lifecycle and Phase 4F reentrant tests; feature Playwright confirmations | Fault injection through real DOM callbacks remains pending |
| Stale proposal cannot commit | Transformation lifecycle source stamps and Phase 4F stale test | Does not prove every feature captures a correct source stamp |
| Late animation completion cannot resurrect cancelled state | Phase 4E rearrangement characterization | Browser stress tests with synthetic delayed completions not exhaustive |
| View isolation | Independent registry instances tested | Full multiple-live-view UI not implemented |
| Exception cleanup | Feature-local `finally`/best-effort cleanup paths | Complete visual restoration under arbitrary DOM failure not guaranteed |

## Production simplification decision

**No legacy guards removed.** A source search shows that `app.js` still has feature-specific checks alongside `modalPreviewOwnership.active()`. These may protect non-modal arming, mode transitions, and incomplete entry paths. Removing them without caller-by-caller behavioural parity would be a risky change and is not justified by the current evidence. The lease registry is not a replacement mathematical validator or UI recovery manager.

**No universal preview renderer, universal cleanup controller, or new history publisher introduced.** This increment adds tests and documentation only. The Phase 5 composition audit can revisit duplicated app-level checks after the cross-phase review establishes which ones are genuinely redundant.

## Remaining risks and future verification

1. Real-browser **reciprocal** cross-family attempts, prioritised by feasible gestures and known conflicts; do not assume the pure contract proves event-handler wiring.
2. Fault-injection tests for cancellation and rendering failures, preserving the original error and ensuring a release attempt even when cleanup throws. Define a view-level recovery policy before adding a general-purpose helper.
3. Exactly-once publication under repeated/late real browser input.
4. Canonical view identity and object-switch/rerender invalidation across all families, including future multiple live views.
5. Test-quality review after Phase 5: mutation sensitivity and realistic integration coverage matter more than test count.

## Acceptance gate

**Gate satisfied:** 387/387 Node tests passed; owner reports 72/72 Playwright tests passed; independent Phase 4F audit completed. Phase 4 is accepted at the documented contract and regression scope, with browser cross-family and fault-injection limitations retained. **Next: Phases 1–4 retrospective before Phase 5.**
