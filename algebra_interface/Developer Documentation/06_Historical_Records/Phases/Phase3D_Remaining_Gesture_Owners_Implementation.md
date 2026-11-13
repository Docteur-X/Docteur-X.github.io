# Phase 3D — Remaining gesture owners (incremental implementation)

Updated 2026-11-07. This document distinguishes **implemented** from **planned** work.

## Why 3D is deliberately incremental

The existing gesture owners have different semantic entry points and educational
presentations. They should share the *advisory intent decision contract* without
forcing toolbar drag, modifier selection, negation click, and keyboard commands
through an artificial universal pointer controller. Every migration requires a
browser compatibility gate before proceeding to the next family.

## 3D-1: selected-factor extraction drag — IMPLEMENTED, browser verified (user report: 56/56)

- `js/interaction/factorDropArbitration.js` is a pure adapter to the existing
  `arbitrateIntents` contract. It accepts only an eligible `factorise` proposal.
- `app.js` allocates a fresh factor gesture session token and captures the
  document, Mathematical Object, revision, root and AST fingerprint at pickup.
- On release, `finishFactorDrag()` compares the captured source to the current
  source, verifies the selected factor is still part of the eligible factor plan,
  and submits the extraction-zone result to the arbiter.
- The extraction zone is geometry, not proof of mathematical eligibility. The
  existing `factorPlan()` and its teaching policy supply the rule evidence.
- The existing factorisation preview, confirmation, source-state check, atomic
  publication, history and provenance visuals remain authoritative and intact.
- An outside-zone release, cancellation, stale source or modal conflict cannot
  authorize a factorisation preview. No ordinary-drag fallback is introduced.
- Six new Node tests exercise advisory selection, cancellation, malformed
  sessions, stale/modal state, eligibility and session identities.

### Compatibility gate

Run `npm test` and `npm run test:e2e`, especially the existing factorisation
browser tests, touch and nested hitbox tests. Verify factor pickup and release,
preview cancellation, keyboard and touch selection, and exactly one history
publication on confirmation. The Node suite passed 335/335; the user subsequently reported that all browser tests passed.

## 3D-2: identity toolbar drag — IMPLEMENTED, browser verified (user report: all tests passed)

- `identityDropArbitration.js` is a pure, feature-specific adapter to the existing
  `identity-drag` intent capability; it neither inspects DOM nor authorizes commits.
- Toolbar pickup captures a fresh session token, view/object identity, and source
  stamp. Pointer release rechecks the document, object, revision, root and AST
  fingerprint before using the existing identity target interpreter.
- The original identity action interpreter and coordinator still determine
  mathematical eligibility. Only a chosen advisory `identity` intent opens the
  existing amber modal preview and single-use confirmation gate.
- Releases outside eligible targets, stale sources, modal conflicts and malformed
  sessions fail closed. Pointer cancellation and Escape retain their existing
  cleanup paths. There is no ordinary-drag fallback.
- Seven new Node tests cover additive/multiplicative identity, invalid release,
  stale/modal contexts, malformed sessions, view/object/session isolation and
  immutable results. Full Node suite: 342/342 passed.
- Browser verification is pending. Recheck identity target placement, nested
  targets, cancellation, preview confirmation, history and touch/pointer behaviour.

## 3D-3: grouping and range selection — IMPLEMENTED, browser verified (user report)

- `js/interaction/groupingIntentArbitration.js` adds a pure advisory `group`
  intent adapter. Only a deliberate grouping preview request submits an intent;
  Ctrl/Cmd-click and touch multi-selection remain non-transforming and never
  create history entries.
- `enterRangeGroupingPreview()` obtains the existing associativity plan,
  `groupingActionRequest`, and transformation-coordinator candidate, then
  arbitrates before opening the existing grouping preview lifecycle.
- The adapter verifies the view/object/session identity and agreement between
  the plan, action, and candidate. It does not decide associativity, generate
  grouping brackets, mutate the AST, or authorize a history publication.
- Existing bracket-envelope geometry, modal cancellation, focus, confirmation,
  stable operand identities, and single-use commit validation remain intact.
- Seven new Node tests cover Add/Multiply grouping, absence of a preview
  request/candidate, stale/modal states, mismatched plans, malformed sessions,
  and isolation. The complete Node suite passed 349/349.
- Browser verification is pending. Run the full browser suite and pay particular
  attention to Ctrl/Cmd selection, touch multi-select, grouping envelope,
  cancellation, and exactly-once history publication.

## 3D-4: negation operator activation — IMPLEMENTED; hardening browser verification pending

## 3D-5 onward — NOT IMPLEMENTED

1. **Negation operator activation:** Click/keyboard activation owns the event,
   not ordinary operand dragging. Keep compression distinct from expansion.
2. **Touch and keyboard:** Treat selection and command dispatch as separate
   owners; do not invent transformation intents for mere selection. Retain
   accessibility, focus, keyboard rearrangement and pointer cancellation.
3. **Integration and audit:** Add end-to-end precedence tests, rerender/object
   switching and exactly-once publication checks. Only then mark 3D complete.

## Invariants for every remaining increment

The AST alone is mathematical authority; stable node IDs survive unchanged
occurrences; no preview commits mathematics; an arbiter's `chosen` outcome is
advisory and does not bypass mathematical revalidation; gesture state is scoped
to a view and Mathematical Object; cancellation is terminal; feature-specific
educational graphics are not replaced by generic presentation.

Avoid adding global singleton state or copying the ordinary-drag adapter into
unrelated gesture families. Update this status after each browser verification.


### Phase 3D-3 grouping hardening (2026-11-07)

- Candidate agreement now includes `parentType` as well as `parentId` and ordered `operandIds`. This prevents the preview arbiter from accepting a candidate for a different associative operator with coincidentally matching occurrence IDs.
- Added an adversarial candidate-mismatch test and a coordinator-backed test using a real parsed AST and real range grouping plan. The latter checks the arbitration boundary without changing the source AST.
- **Lifecycle distinction:** grouping is a *discrete command* (selection, then deliberate preview request), not a continuous pointer-drag session. Its short-lived request token is intentional. Dragging, by contrast, requires session ownership across input events. Do not force both into a single drag-state model.
- The adapter is advisory; the transformation coordinator validates the rule, and the existing confirmation lifecycle revalidates source state before publishing. Do not treat arbitration as commit authorization.
- The user confirmed the original Phase 3D-3 browser suite passed. The hardened build requires a new browser run.
- Follow-up: a browser test for exactly one grouping history entry remains advisable; this patch does not claim to add that end-to-end coverage.

### Phase 3D-4: negation operator activation (2026-11-07)

Implemented a narrow, pure `negationOperatorArbitration.js` adapter for the
**discrete** `negation.expand` command. The click and Enter/Space operator
handlers continue to call the same preview entry point; it now verifies a
coordinator-produced candidate through the view-local `negation-operator`
intent owner before opening the existing single-use negation preview.

The adapter checks request/candidate agreement, occurrence identity, view and
Mathematical Object context, source validity and incompatible modal state.
It cannot inspect DOM, create mathematical candidates, show a preview or
publish history. Compression of `-1` via ordinary dragging is intentionally
unchanged. The existing negation preview, cancellation and confirmation
remain the only publication route.

Four new Node tests cover accepted activation, malformed/mismatched candidates,
blocked sessions, and a real mathematical rule candidate without source
mutation. **355/355 Node tests passed locally.** Browser tests are pending.

Teaching-policy note: bracket-target distribution is intentionally **not**
implemented. A future optional teaching-policy stress test may recognize a
bracket as an alternate physical target for the existing distribution intent;
`a(b+c)` and `a(bc)` must remain distinct AST cases and the Engine must
validate eligibility. Do not let gesture recognition infer distributivity from
visual parentheses alone. Future conflict-detection work should explicitly
characterize overlapping recognizers before changing arbitration.

### Phase 3D-4 modal hardening (2026-11-07)
- Added reciprocal **preview-open** exclusion between equality application and negation expansion: a live equality proposal blocks opening negation, and a live negation proposal blocks opening equality. This is deliberately a small local contract, **not** a claim that all modal ownership is globally centralized.
- The check uses the existing single-use lifecycle `isOpen()` flags; it does not infer modal state from DOM styling. Equality arming alone is not a modal preview and remains independent.
- Added Playwright checks for real Enter/Space activation, exactly-once confirmation, cancellation/retry, and equality-preview exclusion. Browser execution is pending.
- Discrete negation activation captures a **current** source stamp just before arbitration; this is not a long-lived drag stamp. The existing commit lifecycle retains authority to reject a stale proposal at confirmation. Do not add meaningless self-comparisons to emulate drag validation.
- Scope is intentionally restricted to preview conflict exclusion and tests. A full shared modal coordinator, if later justified by observed conflicts, belongs in the broader interaction lifecycle consolidation.

## Phase 3D-5 — Touch and keyboard input routing (2026-11-07)

Implemented a deliberately small, pure `selectionCommandRouting.js` boundary. Touch taps and keyboard selection remain non-transforming; keyboard distribution and rearrangement remain commands whose mathematical eligibility and commit paths are unchanged. See `Phase3D5_Touch_Keyboard_Handover.md` for precise responsibilities and verification limitations. 360/360 Node tests pass. Browser verification of this build is pending (60 expected). The older heading "3D-5 onward — NOT IMPLEMENTED" above is historical and superseded by this entry; Phase 3E is still pending.
