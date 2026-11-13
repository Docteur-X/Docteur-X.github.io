# T3–T5 — Test Quality Plan and T4 Record

**Status:** T1/T2 complete; T3-1 through T3-10 owner-accepted and closure-reviewed (8 November 2026); **T4 and T5 pending**. Historical planning sections below describe the original plan, not current checkpoints.
**Authoritative current status:** [Current Status](../00_Current/Status.md). Original T2 starting baseline was 416 Node tests and owner-reported 77 Playwright tests; T3 now has 420 Node tests. Phase 6 and guided architecture tour remain deferred.

## Purpose and non-goals

Improve the **diagnostic value, navigability, stability and maintainability** of the test suite without reducing meaningful mathematical, lifecycle, or browser-level coverage. Favor small, reversible, evidence-based batches over mass moves or arbitrary test-count reductions.

Do **not** use this track to rewrite the mathematical engine, redesign gesture architecture, implement deferred creative features, complete Phase 6, or force all tests into a perfectly symmetrical folder tree. Do not merge/delete tests based solely on similar filenames, assertions or a desire for fewer tests. Do not mistake static test declarations for executed counts.

## Non-negotiable protections

- Mathematical correctness, AST occurrence identity, source-state validation, exactly-once publication, branching history, persistence, and preview cancellation/reacquisition retain coverage.
- Node contracts and real-browser interaction tests are distinct evidence, even when they concern the same mathematical rule.
- Tests introduced for actual regressions are retained unless a replacement proves the **same failure mode** would still be detected.
- No production behavior changes as part of ordinary test cleanup. If a test exposes a production defect, stop, diagnose and agree a separate narrow fix.
- Maintain the recursive Node runner (`npm test`), Playwright recursive discovery (`npm run test:e2e`), T1 inventory, documentation link checks and existing CI expectations.
- Preserve original phase provenance in comments or the decision log when renaming/moving a test.
- No sleeps, weakened assertions, broad retries or test skips as substitutes for diagnosing instability.

## Work rhythm for each batch

1. Select **one coherent behavior family**, normally 5–10 individual tests (not necessarily 5–10 files). Start with distribution; later batches are prioritized by regression history and maintenance cost.
2. Read complete test bodies, shared fixtures/helpers, relevant production contracts and historical bug notes. Identify the exact invariant, failure mode and distinct level of evidence.
3. Record a **proposed** disposition for each test: **retain / strengthen / merge / remove / defer**, with justification and any replacement coverage. Record uncertainty explicitly.
4. Change only the smallest justified set. Prefer better assertions, setup, naming or comments before combining tests. Preserve a baseline copy and a move/rename map.
5. Run targeted tests, then `npm test` and the full Playwright suite when the batch affects browser tests, discovery, helpers, fixtures, or shared behavior. Compare discovered file identities and test titles, not just totals.
6. Independently audit the batch and update the decision log, T1 inventory, living status and AI handover. Wait for browser verification where needed before marking accepted.

### Decision-log schema (one row per reviewed test)

| Field | Meaning |
|---|---|
| Identity | Current path + exact test title; previous path if moved |
| Family / level | Mathematical rule, Node contract, browser interaction, lifecycle, etc. |
| Protected invariant | The behavior whose regression should fail this test |
| Provenance | Historical defect/phase, if known; otherwise 'not established' |
| Distinct evidence | What this test catches that neighboring tests do not |
| Decision | Retain, strengthen, merge, remove or defer |
| Reason | Specific evidence, not aesthetic preference |
| Replacement | Exact replacement test(s) and why equivalent, if merged/removed |
| Verification | Targeted and full-suite results, date, environment, reviewer |
| Status | Proposed / implemented / browser-pending / accepted |

Keep one append-only decision log for accepted changes; preserve prior decisions with dated amendments rather than silently overwriting them. A small table is sufficient; do not build a test-management application.

## T3 — Assertion quality and overlap review

**Objective:** establish that each reviewed test protects a clear, useful contract; selectively strengthen or consolidate genuinely redundant coverage.

**Initial order:** (1) distribution engine + gesture + preview + lease/reacquisition; (2) grouping and factorisation; (3) equality/negation/identity; (4) history/persistence and semantic targeting. Reorder based on actual evidence, not phase chronology.

**Questions per test:** Does it assert the outcome rather than implementation trivia? Does it distinguish no-op, cancellation and commit? Would the known historical bug make it fail? Are AST, history and lease checks needed together to establish one lifecycle contract? Is it testing the real handler or a mock? Is the fixture minimal and understandable? Is a neighboring test genuinely equivalent?

**Deliverables:** T3 per-family coverage map, populated decision log, narrowly scoped test changes (possibly none), verified inventory and acceptance notes. No blanket target for number of removed tests.

**Acceptance gate:** no loss of distinct invariants or regression protections; all changed tests pass; 416/77 starting baseline remains discoverable unless a documented, proven-equivalent merge intentionally changes counts; all count changes explained by exact test identities. Do not claim acceptance before required browser results.

## T4 — Stability, input and diagnostics review

**Objective:** remove avoidable flakiness and improve failure localization while preserving genuine asynchronous and accessibility behavior.

**Priority investigations:** the `waitForTimeout(500)` in compact import/autosave coverage; pointer target geometry and second-drag eligibility assertions in distribution; asynchronous preview cancellation and lease reacquisition; touch selection versus touch/pen drag coverage; keyboard-only/assisted interaction gaps. These are audit candidates, not predeclared defects.

**Method:** reproduce failures with trace, screenshot and status evidence; prefer event/state assertions and controlled clocks where appropriate; test the failure boundary *before* changing helpers. Compare focused, repeated and full-suite runs when diagnosing nondeterminism. Review page objects and shared pointer helpers for stable semantic locators and useful diagnostics. Document real-device limitations: Playwright touch emulation does not prove classroom display/stylus usability.

**Deliverables:** stability findings and severity, targeted fixes only where justified, explicit input-method coverage/gap matrix, decision-log entries, verification evidence. Keep new touchscreen features out of scope; note them in the creative backlog.

**Acceptance gate:** no test made green by weakening a protected assertion; known timing issues either fixed with evidence or honestly documented as unresolved; browser regression suite passes after any changes.

## T5 — Suite-level verification and handover

**Objective:** verify the final suite remains complete, discoverable, trustworthy and easy for future developers to maintain.

**Checks:** compare current test-file inventory, exact test titles and invariant matrix with T1/T2; run `node scripts/run-node-tests.mjs --list-files`, `npm test`, `npm run test:e2e`, and `npm run check:docs`; inspect CI workflow/test discovery; confirm no `.only`/unjustified `.skip`, orphan fixtures, broken imports, accidental ignored specs, or contradictory 'current' documentation. Record exact counts rather than assuming 416/77 if intentional merges occurred. Sample historical regressions to verify their protection remains meaningful.

**Deliverables:** T5 final acceptance report, retained/merged/removed coverage ledger, known gaps and deferred improvements, current-status update, authoritative AI handover, next-chat instructions and reproducible commands. Archive historical planning without competing current-status claims.

**Acceptance gate:** full Node and Playwright verification; no unexplained discovery losses; all test removals have named equivalent coverage and rationale; documentation agrees with code and evidence. If any gate fails, T5 remains pending and the last accepted build remains the baseline.

## Stop and escalation rules

- **Stop** if a production bug, ambiguous mathematical invariant, unexpected count drop, flaky result, or unclear historical regression arises. Diagnose before cleanup.
- **Ask the project owner** about consequential teaching-policy expectations or changes to student-facing behavior. Do not infer them from tests alone.
- **Defer** cosmetic moves that require broad fixture rewrites or carry more risk than navigation benefit.
- **Do not** claim browser verification from Node success or a static inventory.
- Keep each increment reversible and document rollback steps; preserve the last accepted project ZIP.

## T3 closure and transition to T4 (8 November 2026; authoritative)

T3-1 through T3-10 were independently accepted by the project owner and reviewed for closure. The 420-test Node suite and 352 documentation links were reported passing at closure. Across T3: 13 existing tests strengthened, four new regression tests, zero removed/merged, zero production JS changes. See the individual T3 review records and [Current Status](../00_Current/Status.md). The owner reports all tests passed; assistant-independent latest Playwright execution remains outstanding.

**T4 next:** first perform a read-only browser stability, input-method and diagnostics inventory. Prioritize fixed 500 ms waits, pointer geometry/second-drag eligibility, modal cancellation and lease reacquisition, touch/pen, keyboard-only use and actionable failure artifacts. Approve coherent risk-justified batches, then verify in a real browser. Do not create artificial T3-11 work.

**Added 8 November 2026:** the T4 inventory should test the second-drag hypothesis in [Known Issues](../05_Roadmap/Known_Issues.md). Each of D3–D6 needs a regression test as part of its approved fix, not as test maintenance. The owner has deferred D3–D6 in favour of architecture work; T4's timing relative to that work is not yet decided.

## T4 read-only inventory (8 November 2026; authoritative)

Started at the owner's request. **No tests, helpers or production code were changed.** Environment: Windows 11, Node 24, Playwright 1.64.1, Chromium headless, 20 logical CPUs (10 default workers).

**Baseline.** `playwright test --list` finds 77 tests in 39 files. This settles the 74 versus 77 question: 74 is the static declaration count, and loops generate the rest.

| Run type | Runs | Result |
| --- | --- | --- |
| One worker | 3 | All 77 passed each time (2.9–3.2 min) |
| Default 10 workers | 6 | 4 runs passed all 77 (0.8–2.1 min); 2 runs had 1 failure each (1.5 and 2.3 min) |
| Numeric combination test alone | 20 repeats | All passed |

**Intermittent failures (cause not established).** Both happened in the slower parallel runs, while other work was running on the machine; the sample is too small to prove that load is the trigger.

1. `numeric-combination-shared-lifecycle.spec.js`, inside `createDocument`: `#workspaceEditor` stayed hidden for the 5 s limit after clicking New document. Any test could hit this, as they all use the helper.
2. `equality-function-application.spec.js:56` (menu dismissal): clicking `.expression-root` timed out at 30 s while `.equality-use-clipboard` appeared in the click retry log. It may be covering the click target; the log was only partly reviewed.

CI uses `retries: 1`, which could hide failures like these; CI's ubuntu runners also differ from this machine.

**Ranked risks**

| Rank | Risk | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Intermittent parallel failures | 2 of 6 parallel runs | Needs reproduction under deliberate CPU load, with traces kept |
| 2 | Touch and pen drags have no coverage | Only `accessibility/touch-selection.spec.js` uses touch (taps); nothing uses pen | Gap; emulation would not prove real devices |
| 3 | Keyboard-only flows are partial | Rearrangement, `D`, negation and preview confirmation are covered; D5 shows gaps on nested occurrences, and arrows are untested there | Gap |
| 4 | Second-drag eligibility | Not seen in 10 full runs; hypothesis in Known Issues untested | Needs a targeted fast-release probe |
| 5 | Fixed 500 ms wait in `compact-import-export.spec.js:76` | The only fixed wait in the browser suite. It gives an earlier save time to finish, so it can pass without proving anything if the save is slower | Replace with an observable signal if one exists |
| 6 | Navigation and diagnostics | 12 specs mention phase names, and failures in shared helpers name no intent; failure traces, screenshots and video are already kept | Low; defer file moves unless they earn their risk |

**Strengths to preserve:** real pointer events through `pointerGestures.js`, window-scoped page objects, feedback-based synchronisation before release, and `reuseExistingServer: false`.

### T4-1 — intermittent failure diagnosis (owner accepted after independent test run)

**Reproduction attempts:** four full ten-worker runs under 24 busy CPU processes all passed, as did 100 parallel repeats of each failing test. CPU load is therefore not established as the trigger.

**Failure 2 — cause found in the test; fixed.** A geometry probe showed the open equality menu covering the clicked point (the top-left of the left side's `.expression-root`) at 26 of 30 scroll positions, and the failure log names the menu's `.equality-use-clipboard` button as blocking the repeated click attempts. Why retries normally clear the block but did not in that one run is **not established**: an audit started the old click from 16 scroll positions and it succeeded within about 150 ms every time, so the timeout itself has never been reproduced. The test now clicks `.equation-panel` at (12,12) after asserting the menu is open. Same contract, one test changed, no production code changed. A mutation that stops outside presses closing the menu makes the test fail; the mutation was reverted and verified byte-identical.

**Failure 1 — not explained; no change.** The `createDocument` timeout was seen once and did not recur. Its trace was overwritten by a later run, so the next occurrence must have its `test-results` kept. Do not add retries or longer timeouts to hide it.

**Verification after the change:** changed test 200/200; six full ten-worker runs 77/77 each; Node 420/420. Those clean runs cannot prove failure 1 is gone, and the original failures occurred too rarely for them to prove failure 2 is gone either; the evidence for failure 2 is the measured overlap.

**Audit of T4-1 (clean extract of the delivered archive):** only the one spec and Markdown differ from the T3 closure archive; no `node_modules` or `test-results` packaged. Node 420/420, three full ten-worker runs 77/77, links valid. A second mutation (outside press clears the armed operation) also fails the test. The new click point was never over the menu at those 16 scroll positions (at the very top of the page it starts off-screen, and Playwright scrolls to it), and the click closed the menu each time. The archive must be extracted to a short path: extraction failed from a parent path well over the 100-character budget, as the packaging guide warns.

### T4-2 — autosave overlap test (owner accepted after independent test run)

**Finding:** the test `import during pending autosave...` did not exercise its stated overlap. With the status gate deliberately broken it passed using the old 500 ms wait, using a replacement signal, and with saves slowed by 1.5 s. The likely reason is that the export step outlasted the 350 ms autosave delay, so the save had finished before the import.

**Change (one test, no production code):** the 500 ms wait is gone, so the browser suite now has no `waitForTimeout`. `page.clock` pauses page timers before the build, and the unsaved marker `•` is asserted, so the autosave is pending during the import. The test then waits for the marker to clear, which happens in the same step that decides whether the save may announce its status. IndexedDB remains real. Paused timers are a controlled setup, not a claim about real-time scheduling.

**Evidence:** status gate broken: fails. Source not saved on document switch: fails. Mutations reverted and verified byte-identical. Correct code: 100/100 repeats; three full ten-worker runs 77/77; Node 420/420.

**Lesson:** a passing test may not reach its stated scenario. T3 mutation-tested selected families; browser specs have had far less of this.

### T4-3 — lifecycle mutation sweep (owner accepted)

**Method:** 34 hand-chosen breaks of preview, cancel, lease and single-use behaviour, one at a time, running the Node and browser suites against each. This samples important behaviour; it is not exhaustive mutation testing. The script was a temporary tool and is not in the repository.

**Result:** 21 caught, 13 survived.

| Survivor | Disposition |
| --- | --- |
| Escape ignored: factorisation, identity, equality | Gap; test added |
| Click-away ignored: distribution, identity, equality | Gap; test added |
| Identity drag ghost left in place when its preview opens | Gap; test added |
| `pointercancel` treated as a drop | Gap; the existing test cancelled over empty space, where a wrong drop commits nothing. New test cancels over an eligible target; the old one is retained |
| History restore leaves a distribution proposal | Gap on the keyboard path; a pointer press cancels through click-away first. Test added |
| Rerender leaves grouping or factorisation preview open | No test added: pointer presses and other paths also end these previews, so this guard is backup protection. Reachable paths, such as changing a dropdown by keyboard, were not probed |
| Object switch leaves identity or negation preview | No test added: click-away or the next render also ends them. Compare D6 in Known Issues, the equality case where the backup is missing |

**Change:** new `e2e/view/preview-dismissal.spec.js` with nine tests, named by responsibility rather than phase. No existing test or production code changed. The browser suite goes from 77 to 86 tests in 40 files; the T1 inventory was regenerated. `scripts/build-test-inventory.mjs` labelled every file as browser on Windows because it compared a backslash path with `tests/`; that one comparison was fixed, and the inventory now shows 75 Node and 40 browser files.

**Evidence:** each of the nine breaks now fails exactly its new test; breaks reverted and verified. New tests 270/270 over 30 repeats; three full ten-worker runs 86/86; Node 420/420.

**Audit of T4-1 to T4-3 (clean extract of the delivered archive):** no file in `js/` or `tests/`, and no app or package configuration, differs from the T3 closure archive. Node 420/420; three ten-worker runs and one single-worker run 86/86; inventory regeneration gives identical output when rerun. Findings: living docs still carried an old T4 to-do item, "256 Node and 34 browser" in the testing guide and a README command that missed test subfolders, all corrected. Regenerating the inventory also updated ten unchanged `tests/` rows, which indicates the inventory had not been regenerated during T3. Remaining limits: the sweep script is not kept in the repository, nothing has run on Linux CI, and historical documents were not reviewed.

### T4-4 — quick-release defect D7 (owner accepted; owner reported 91/91 browser tests)

**Diagnosis:** the earlier "second drag" reports were not about second drags. Releasing within about 150 ms of reaching a valid target succeeded 0 of 10 times, on first drags, second drags and numeric combination, and succeeded 10 of 10 from 250 ms; reduced motion removed the failure. Any movement started a preview at the unchanged position, and leaving it started a return animation of about 195 ms during which targets reported `none`. Existing tests waited for feedback before releasing, so none exercised this.

**Owner decision:** fix with options A and B.

**Production change (`dragFeedback.js`, one block in `app.js`):** (A) no preview starts for an insertion at the source's own position. (B) On release, `settleForRelease` ends a running preview and honours a combination or distribution target; the existing drop path revalidates it. Insertions are excluded, so a rearrangement must still be seen before it commits.

**Rejected:** extending B to insertions (it would commit unseen rearrangements, and a test now fails if this is done); a shorter animation (it only narrows the window).

**Tests:** new `e2e/view/quick-release.spec.js` with five tests. Removing A, removing B, and extending B to insertions each fail. Three of the first four tests failed on the old code; the fifth, for A, was added afterwards. Node has no coverage of this path.

**Evidence:** timing experiment after the fix: 10 of 10 at the rechecked 0 and 100 ms, in all cases, with and without reduced motion. Full suite 91/91 in three ten-worker runs; quick-release tests 150/150 over 30 repeats; the hardest test 300/300; Node 420/420. Windows Chromium with scripted pointers only; not tried by hand.

**Test-writing lesson:** two early versions of the post-preview test were flaky (2 of 300, then 77 of 300), because a pointer path across a live preview changes what it is aiming at. The final test leaves the preview, then makes one direct move. See the limitation in Known Issues. Earlier mutation checks also ran before confirming a test passed on correct code; always check correct code first.

### T4-5 — keyboard-only inventory (read-only; decision pending)

Each action was operated by scripted key presses in Chromium at 1440×1200 after setup. No code or tests changed. Screen readers and real assistive devices were not tried, and visible focus styling was not assessed.

| Action | Can be done by keyboard? | Tabs needed | Focus afterwards |
| --- | --- | --- | --- |
| Reorder (arrows) | Yes | 11 to first term | Kept on the moved term |
| Select a term (Enter) | Yes | | **Lost** |
| Wrap brackets | Yes | 40 from page top, because selection loses focus | Kept on button |
| Range grouping | Yes | 40 | Preview focuses Confirm; **lost** after commit |
| Distribution (`D`) | Yes | 3 to amber copy | **Lost** on preview, cancel and commit |
| Factorisation | Yes | 40 to Preview | Preview focuses target; **lost** after commit |
| Negation expansion | Yes | 7 to Confirm | **Lost** on preview and commit |
| Equality apply | Yes | 12 to choose, 15 to Use, 36 to Confirm | **Lost** after choosing and after commit; stays on a hidden-menu button during preview |
| History restore | Yes | | **Lost** |
| Whole-sum selection | Yes, through the structure navigator | | Kept on navigator button |
| Numeric combination | **No path found** (Enter, `c`, `+`, Shift/Ctrl+arrow tried; source shows none) | | |
| Identity insertion | **No path**: tools are focusable, but Enter and Space do nothing | 9 to tool | |
| −1 compression | **No path found** (source is drag-only) | | |

Pressing an arrow on a nested occurrence still throws (D5); the probe did not press arrows there. `+` operators are not focusable, so when two neighbouring sums exist `D` asks the student to drag.

**Ranked:** (1) three core actions unavailable without a pointer, contrary to the founding accessibility goal; (2) focus lost at nearly every rerender, sending keyboard users back to the top of the page. The likely cause is that `renderEquation` replaces the DOM with no focus handoff; this is a shared seam, so one owner could fix most cases. Comparatively little browser coverage exists because the app has little to test here yet.

**Decision for the owner:** these are product changes, not test maintenance. (1) needs an interaction design, such as the pick-up, choose target, preview, confirm path in the creative backlog, sharing the same rule requests as dragging. (2) can be designed and tested first, restoring focus by occurrence ID.

**Owner decision (8 November 2026):** do not implement focus restoration or new keyboard paths yet. First design how the interface should work: functionality, invariants and contracts, then concrete interactions, so they are built on agreed rules. The focus-module sketch discussed in chat is not approved.

**Interface principle (owner, 8 November 2026):** a student without a pointer must still be able to use the project, and keyboard shortcuts should be offered to pointer users too. Exact scope, keys and contracts are not yet designed.

**T4 and T5 status:** paused by the owner. Accepted T4-1 to T4-4 work stands.

**After that:** touch and pen drags need a design discussion first, as emulation cannot prove real-device behaviour.

**T5 later:** reconcile test discovery/execution identities, independently run final Node and Playwright suites, evaluate stability and cross-browser limitations, verify documentation and archive, and record owner acceptance.
