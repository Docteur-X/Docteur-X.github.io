> **Historical feature-specific implementation note.** Not the current AI handover or current status. Use [the single current handover](../Superseded_2026-11-12/AI_Handover.md) and [current status](../Superseded_2026-11-12/Current_Status.md). Older pending-verification statements below are superseded.

# Phase 3D-4 handover — negation operator activation

Status: Phase 3D-4 original implementation browser-verified (user report); modal hardening patch: 355/355 Node tests passed, new browser tests pending.
Baseline: Phase 3D-3 grouping hardening, browser suite passed as reported by user.

## Changed source
- `js/interaction/negationOperatorArbitration.js`: pure advisory discrete-command gate.
- `js/app.js`: imports the adapter and gates only `negation.expand` before the existing preview lifecycle.
- `tests/phase3d-negation-operator-arbitration.test.js`: four Node regressions.
- This document and the Phase 3D implementation ledger.

## Architectural invariants
- Operator click and Enter/Space share the same action; operator glyph is not draggable.
- Engine/coordinator candidate precedes advisory arbitration; the arbiter does not assert mathematics from DOM metadata.
- Source identity and incompatible active modes are checked; the single-use commit lifecycle still revalidates on confirmation.
- `negation.compress` remains in the ordinary drag pathway; no change to preview styling, AST rules, history or persistence.
- A discrete command does not require a long-lived drag session. Its request token identifies this activation only.

## Browser gate
Run the complete Playwright suite, especially negation operator click and keyboard activation,
preview cancellation and confirmation, and existing ordinary `-1` compression.
Check that no pointer drag starts on an operator glyph and no duplicate history entry is created.
Do not proceed to 3D-5 until the browser suite is confirmed.

## Future teaching policy experiment
The user prefers distribution via the `+` inside brackets for its educational meaning.
Bracket targeting is not part of this phase; it could later serve as an optional
architectural stress test. Mathematical AST validation must distinguish a sum
inside multiplication from a product inside multiplication, regardless of visual brackets.

## Modal hardening patch — 2026-11-07
- `js/app.js`: reciprocal equality/negation preview-open guards using the already-existing commit lifecycle state. No new state owner or mathematical rule.
- `e2e/phase3d4-negation-hardening.spec.js`: four new real-browser tests (Enter, Space, cancellation/retry, equality conflict). These are new tests, not yet confirmed passing.
- Existing 355 Node tests pass; the full Playwright suite must be rerun before Phase 3D-5.
- For discrete commands, the stamp captured at invocation is a current-state observation. Confirmation checks the full saved stamp through the existing single-use commit lifecycle. Continuous drags instead compare against a stamp captured at gesture start.
- Modal exclusivity is **partial**: equality and negation now exclude each other at proposal opening. Do not claim a universal modal arbiter until all preview owners have been audited and migrated.
