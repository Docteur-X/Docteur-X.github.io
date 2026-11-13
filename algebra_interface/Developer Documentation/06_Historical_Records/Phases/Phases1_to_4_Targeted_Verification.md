# Phases 1–4 — Targeted integration verification checkpoint

**8 November 2026.** Baseline: owner-verified Phase 4F (72/72 Playwright); independently rerun Node suite 387/387. This increment changes **tests and living documentation only**; no production code.

## Purpose and evidence boundaries

The original retrospective found that registry-level ownership tests do not establish real browser entry-point exclusivity, and that exception-safe cleanup paths were source-reviewed but not deliberately fault-injected. This checkpoint adds two real-browser tests in `e2e/retrospective-cross-phase-verification.spec.js`:

1. **Real equality-to-negation conflict, followed by reacquisition:** open an equality preview using the actual UI, attempt a negation activation through the delegated listener, verify that the equality preview remains the sole active preview and that the AST/history are unchanged, cancel equality, then open and cancel negation. This tests the application integration, not a fabricated pair of registry owner labels. It intentionally does not claim all 30 UI conflict pairs are exercised.
2. **Negation confirmation-listener cleanup fault injection:** open a real negation preview, inject a one-shot exception into its `removeEventListener('click', ...)` cleanup, cancel, and verify that the original equation DOM returns, AST/history remain unchanged and a new negation preview can open and cancel. The test expects a deliberate browser exception during cleanup and must not treat the absence of console errors as its oracle. The injected fault is narrowly scoped to the preview root and automatically restores the original DOM method.

Both are **new browser tests awaiting execution**. They must not be reported as passing until the owner or an independent browser runner confirms the results. Expected browser count: **74**, assuming no other tests are added. The 387 Node tests pass independently in this increment.

## Cross-phase ownership map

| Layer | Owns | Must not own | Important transition |
| --- | --- | --- | --- |
| Phase 1 visual feedback | View-local transient CSS roles and hints | Mathematical actions or history | Clear per owner; rerender invalidates detached targets |
| Phase 2 semantic resolver | Read-only AST occurrence-to-rendered-target lookup | Mathematical truth or physical drag geometry | Refresh after rerender/object switch |
| Phase 3 intent arbitration | Pure selection of eligible gesture proposals | Rule validation, preview DOM or commits | Reject stale/cancelled/wrong-owner proposals |
| Phase 4 modal ownership | Exclusive view-local preview lease | Candidate validation, UI cleanup or publication | Acquire after eligibility; release after cancel/confirm/error |
| Feature preview controllers | Feature-specific DOM, educational explanations and cleanup | Competing preview ownership or mathematical authority | Clean feature state independently of lease release |
| Commit lifecycle | Source stamp, single-use confirmation, publication authorization | Rendering or modal exclusivity | At most one commit, stale proposals rejected |

## Coverage and limitations

- **Contract-level:** Phase 4F verifies 30 directed modal owner combinations and single-use commit behaviour, but these are not 30 browser tests.
- **Browser-level already verified by owner:** 72 tests on Phase 4F, including per-feature lifecycle tests and one equality-to-negation exclusion test. The new conflict test adds explicit post-cancellation reacquisition.
- **New fault-injection test:** targets one real feature-owned cleanup exception path, not every preview controller or arbitrary DOM failure. It validates recovery from listener unbinding failure, not from a failed `replaceChildren` restoration.
- **Multiple live mathematical views:** still not implemented; independent registry instances are Node-tested, not full multi-view UI.
- **Source-level concern:** `modalPreviewOwnership.release()` compares view ID, lease ID, owner and session token, not document/object identity; the docs should describe this precisely. This is not a demonstrated cross-view release defect.
- **Remaining architectural concern:** after mathematically successful publication, a rendering failure can leave presentation partially updated. This is not an instruction to roll back committed mathematics. Phase 5 should consider a controlled view recovery policy without duplicating mathematical commit logic.

## Acceptance and next actions

1. Run `npx playwright test e2e/retrospective-cross-phase-verification.spec.js` in the configured browser environment, then the full suite. If the fault-injection test fails, inspect its trace and diagnose the actual exception path; do not weaken the test to make it green.
2. If all **74** browser tests pass, mark this targeted verification checkpoint accepted and update the authoritative handover/status.
3. If a real defect is demonstrated, make the smallest production patch with a focused regression test and repeat Node + browser verification.
4. Before Phase 5, use the ownership map and prior retrospective findings to identify cohesive extraction candidates; do not introduce a universal interaction or preview controller solely to reduce `app.js` length.
