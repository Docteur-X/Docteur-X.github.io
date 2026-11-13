# AI Handover — Manipulator (authoritative current guide)

> **Superseded as the starting point (11 November 2026):** start at [00_Current/HANDOVER_CURRENT.md](HANDOVER_CURRENT.md) and the [rebuild plan](Rebuild_Plan.md). The philosophy and boundaries below still apply; their checkpoint and next steps don't.

**Checkpoint: 8 November 2026.** T3-1–T3-10 are owner-accepted, T3 closure review is complete, **T4-1 to T4-4 accepted, T4-5 keyboard inventory recorded, and the owner wants interface invariants and contracts designed before any interaction changes, with further T4 work postponed. Agreed principle: usable without a pointer, with keyboard shortcuts for everyone**, and **the owner's priority is sound architecture, with open defects D3–D6 deliberately deferred** ([Known Issues](../../05_Roadmap/Known_Issues.md)). Start at [Current Status](Current_Status.md) and the [T3–T5 plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md). The latest application/test baseline is the accepted T3-10 code; documentation updates since then introduce no source or test changes.

## What this project is

The Manipulator is an **offline-first, student-directed algebra teaching workspace**. The student chooses the strategy and mathematical action; the engine checks whether that requested transformation is mathematically permitted. The application should make mathematical thought visible and manipulable, not silently solve problems for students. Educational usefulness, accessibility, classroom adoption, correct mathematics, deliberate intermediate states and clear provenance are first-class goals.

**Preserve:** AST as mathematical authority (not DOM), stable occurrence IDs for unchanged nodes, distinct identities for copies, explicit Group structure, ordered products for future noncommutative mathematics, previews that do not mutate committed state, source-stamped single-use confirmations, atomic detached preparation where migrated, branching per-object history, offline IndexedDB durability, view-local modal leases and separation of gesture recognition, teaching policy and mathematical validity.

**Target architecture:** read the [owner's blueprint](../../02_Architecture/Architecture_Blueprint.md) first. It is a target, not current code, and no migration is approved.

## Implementation map and cautionary boundaries

- `js/core/` owns AST construction, traversal, comparison, parser/serialization and structural invariants. MathJSON omits editor occurrence identity; it is not a lossless document format.
- `js/engine/operations/` owns rule-specific mathematical applicability and transformations. Some operations mutate the supplied tree, others return detached candidates; inspect each contract before invoking it. Do not blindly rebuild ASTs and lose IDs.
- `js/manipulator/`, `js/app/` and transformation feature registry/coordinator separate mathematical requests, previews, confirmation and publication, but **not all browser paths are migrated**. The substantial `js/app.js` remains a real integration controller, not merely a thin bootstrap.
- `js/interaction/`, `js/view/rendering/`, `js/ui/` handle semantic targeting, selection, drag arbitration, visual feedback and preview ownership. Rendered DOM is advisory, never the mathematical source of truth. Rerender must invalidate stale targets and previews.
- `js/core/` also holds multi-object documents, branching snapshots, replayable patches, fingerprints, import/export validation and the IndexedDB repository. `js/app/workspace/` holds only save scheduling and the status gate. In-memory commit is distinct from durable save; some older history edits retain different atomicity guarantees.
- Tests are layered: Node rule/contract tests and real-browser Playwright interaction tests protect different failure boundaries. Never call a Node-only result browser-verified.

## Current T3 consolidation results

T1/T2 inventory and discovery organization preceded T3. **T3-1–T3-10 accepted:** 13 existing tests strengthened, four new regression tests, zero tests removed/merged, zero production JS changes, 420 Node tests at last full run. Reviewed distribution, factorisation, grouping, equality, identity, negation, history, serialization, autosave and semantic targeting. Several new assertions were justified by deliberately surviving mutations. Apparent duplicate tests were retained where they protect distinct failures or removal would save negligible maintenance effort. Read the specific T3 review records in [Test_Reviews](../Test_Reviews) for rationale (including T3-9B and T3-10). The original T3–T5 plan's objectives remain quality, diagnostic clarity, stability and maintainability—not a smaller test count.

**Evidence caveat:** Owner reported all tests passed for each T3 archive. 420/420 Node was independently rerun after closure. T3 reviewed test quality within selected families, so green suites coexist with defects D3–D6. The first independent Playwright runs found intermittent parallel failures (see the T4 inventory). Before those runs, the latest complete Playwright run was **not independently executed by the assistant** and the current executed Playwright count needs reconciliation in T5.

**Current direction:** follow the priorities in [Current Status](Current_Status.md). Where older steps below mention T4 or T5 as next, those tracks are paused.

## Next-chat execution protocol

1. Read `START_HERE_FOR_NEXT_CHAT.md`, Current Status, this guide, T3–T5 plan, Known Issues, founding vision, design-first workflow and relevant feature documentation.
2. Inspect the **actual source and tests** for the selected task; reconcile stale documentation with source before proposing changes. Do not claim comprehensive verification from summary alone.
3. **Architecture is the owner's priority; do not fix D5–D6 unasked (D3 and D4 were fixed by exact numbers on 10 November 2026).** The owner directed T4 to continue in disciplined increments. The inventory is done and recorded in the T3–T5 plan; agree the next batch with the owner, then make only that change. The inventory covered **read-only browser stability/input/diagnostics inventory and risk ranking.** Examine Playwright config, fixtures, browser specifications, timing and failure artifacts. Select one meaningful high-value batch; discuss the intended outcome and alternatives with the owner before implementation.
4. For each approved batch: document protected failure modes and existing coverage, run controlled probes/mutations where informative, implement only approved changes, run targeted and full appropriate suites, inspect browser behaviour when applicable, update current docs **once**, package a complete reproducible project and stop for owner independent acceptance.
5. Distinguish source-observed facts, independently executed tests, owner-reported acceptance, hypotheses and deferred ideas. If a test exposes a production defect, pause and agree a separate design/fix; never quietly refactor production as test consolidation.
6. Prefer a **coherent, risk-justified batch** over one release per assertion. Splitting is justified by independent risk, design or verification boundaries—not arbitrary granularity.

## Pending roadmap and unresolved issues

- **T4:** real-browser stability, pointer geometry/second-drag eligibility, async preview/lease cancellation, fixed waits, touch/pen, keyboard-only flows, diagnostic artifacts. Start read-only.
- **T5:** exact test inventory and final Node/Playwright runs, browser acceptance provenance, final docs and package checks.
- **Product:** Phase 6 movable/resizable independent views and guided architecture tour are deferred. Structural differentials, equation-wide clipboard affordances, adjustable reasoning-depth and richer derivation export remain exploratory unless explicitly approved. Do not implement them on the basis of chat brainstorming.
- **Known issues:** see [maintained risk register](../../05_Roadmap/Known_Issues.md). T3 test-only work established no production defect, but the later source review confirmed D3–D6, including the high-severity signed-factor notation defect D1. Probing rendered and serialized meaning directly found what the suites did not, so do the same for new rules.

## Permanent documentation policy

Update the existing authoritative status, AI handover, plan and risk register proportionately with every meaningful change, with verified state, goals, implemented/pending distinctions, architectural decisions, rejected alternatives, tests, rollback and next-chat instructions. Preserve historical rationale in review records and archive old handovers instead of accumulating contradictory top-of-file 'CURRENT CHECKPOINT' statements. Ask the owner before consequential design or educational-policy decisions.
