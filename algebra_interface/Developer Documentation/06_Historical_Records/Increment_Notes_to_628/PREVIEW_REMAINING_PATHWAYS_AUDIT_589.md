# Preview consolidation — remaining pathways audit (589 tests)

## Verified baseline

- User reported all Playwright tests passing for the 585-test equality migration.
- This increment: 589/589 Node tests passed; 406/406 documentation links valid.
- Playwright has **not** been run for this increment in this environment.

## Source-grounded findings

`js/app.js` currently constructs six `createPreviewSessionHost` instances: negation, equality, identity, grouping, factorisation and distribution. Each deliberately confirmed preview uses view-local modal ownership and the source-stamped single-use gate.

Two remaining immediate transformations are different:

- `commitRearrangementCandidate` uses `rearrangementCommitLifecycle` (around app.js line 1000). A drag already displays the proposed operand order; drop immediately commits the detached candidate. Keyboard rearrangement shares the gate.
- `commitNumericCombination` uses `numericCombinationCommitLifecycle` (around app.js line 1594). Green eligibility feedback precedes immediate drop; the mathematical rule is rechecked and detached history prepared before publication.

Neither operation presents a deliberate confirm/cancel modal. Therefore they should **not** be migrated to `PreviewSessionHost` merely to make all transformations use one class. Their single-use commit gates are appropriate to their interaction semantics.

## Important boundary and test evidence

`createTransformationCommitLifecycle` knows nothing about `modalPreviewOwnership`. It can open and commit while a different host holds a modal lease. `tests/previewCrossFamilyOwnership.test.js` characterises this explicitly. Application input guards must block immediate gestures while a modal preview is active; this is a cross-module integration invariant, not a guarantee of the commit gate itself.

The new tests also cover cross-family exclusivity, invalidated old owners not releasing newer leases, and presentation failure cleanup. They do not prove browser input suppression, which requires Playwright.

## Follow-up priorities

1. Add browser tests explicitly attempting numeric combination and rearrangement while each modal family is open, including keyboard paths.
2. Audit application input guards for consistency and identify a single central guard if existing paths diverge. Do not introduce a second ownership registry.
3. Audit `PreviewSessionHost` cleanup error semantics: a successful mathematical commit followed by failed visual cleanup can throw. Distinguish these outcomes before making UI claims about whether mathematics changed.
4. Remove stale documentation claims and obsolete code only after verifying that they are no longer referenced.
5. Assess maintainability by state ownership, dependency direction and change locality, not line counts or module counts alone.

## Explicit non-changes

No production code was modified in this increment. No mathematical rules, AST identities, histories, or UI visuals were changed. This is a characterization and architectural decision increment.
