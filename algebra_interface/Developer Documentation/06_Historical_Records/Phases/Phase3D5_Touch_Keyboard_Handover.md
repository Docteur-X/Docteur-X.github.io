> **Historical feature-specific implementation note.** Not the current AI handover or current status. Use [the single current handover](../Superseded_2026-11-12/AI_Handover.md) and [current status](../Superseded_2026-11-12/Current_Status.md). Older pending-verification statements below are superseded.

# Phase 3D-5 — Touch and keyboard routing / final integration checkpoint

Date: 2026-11-07. Baseline: Phase 3D-4 modal-hardened archive; user reported all 60 Playwright tests passed.

## Implemented

- New `js/interaction/selectionCommandRouting.js`: pure `shouldCompleteTouchTap` and `classifyOccurrenceKey` functions. Neither mutates AST, DOM, history, selection, or preview state.
- `app.js` calls the touch guard when completing a touch pointer-up. It retains the existing selection model, empty-space deselection, and gesture cancellation behaviour.
- `app.js` classifies focused-occurrence keyboard shortcuts into non-transforming selection and deliberate distribution/rearrangement requests. Existing mathematical eligibility, focus behaviour, preview and commit pathways are unchanged.
- Five new Node tests cover pointer identity, movement, active drag/preview exclusion, Ctrl/Cmd selection, Enter/Space selection, D distribution, arrows for rearrangement, and malformed input.
- Full Node suite: 360/360 passing (Node direct runner). Browser suite must be rerun on this build; expected 60 existing Playwright tests.

## Architectural rationale

A touch tap is a discrete *selection* event, not a transformation intent. Keyboard selection similarly does not enter `arbitrateIntents`. Keyboard distribution and rearrangement are *deliberate commands*; this increment only classifies them, leaving their existing mathematical rule and publication boundaries authoritative. A universal gesture coordinator would add unnecessary complexity at this stage.

This is a minimal integration increment, not proof that all modal owners have been centralized. In particular, `pointercancel` and lost-pointer-capture are different browser phenomena; the existing cancellation tests should remain and be expanded if device testing reveals gaps.

## Next verification / audit

1. Run all 60 browser tests, especially touch multi-selection, keyboard rearrangement, D distribution, negation Enter/Space, and modal cancellation.
2. Confirm no selection action publishes history, and one confirmed transformation produces one history publication.
3. Audit feature ownership and contradictory status paragraphs in older documents before declaring Phase 3D complete; Phase 3E remains the final comprehensive verification gate.
4. Preserve the pedagogical default of distribution onto the + operator. Optional bracket-target teaching policies are future experiments, not part of this increment.
