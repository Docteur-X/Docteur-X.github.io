# Negation and Subtraction — v1 implementation reference

**Status:** Negation v1.2.2 is the latest owner-reported browser-verified baseline. v1.2.3 adds semantic preview wording and parser regression hardening (268/268 Node tests passed); browser verification of v1.2.3 is pending. This is a maintained reference, not a milestone diary.

## Purpose and student agency

Students can express subtraction as addition of a negative term, expose the mathematical factor `-1` by deliberately clicking the compact minus operator, preview the resulting mathematical structure, and confirm or cancel. No mathematical transformation is committed by hover or parsing alone.

## Data model and precedence

- `Negate` is unary with exactly one valid expression operand (`nodeFactory.js`).
- `Number(-3)` is the default parse of `-3`; `-(3)` is `Negate(Group(Number(3)))`.
- `a-b` parses as `Add(a, Negate(b))`. The default editable notation serializes this as `a+-b`, intentionally making the additive structure explicit. `a+-b` is also accepted as input.
- `-a*b` attaches negation to `a`; `-(a*b)` attaches negation to the grouped product. Explicit `Group` nodes are retained.
- `a--b` keeps nested negation rather than simplifying automatically.
- Powers and division are not yet supported. Future precedence must place exponentiation above prefix negation, while retaining conventional explicit bracket semantics.
- Do not silently canonicalize `Negate(X)` to `Multiply(-1,X)` or vice versa: the chosen structure is educationally meaningful.

## Ownership and flow

1. **Parser and AST factory:** recognize and validate the mathematical structure.
2. **Renderer:** creates the compact minus operator hitbox (`data-hitbox-role=operator`, `data-operator-kind=negate`, `data-operator-owner-id`); it does not modify the AST. The negated child remains an independent occurrence where the nested hitbox renderer supports it.
3. **Gesture adapter:** `manipulator/negationGesture.js` produces DOM-free action requests.
4. **Mathematical Engine:** `operations/negation.js` constructs detached expansion and compression candidates, retaining the existing operand occurrence IDs.
5. **Transformation Coordinator:** `composition/transformationFeatureAssembly.js` registers `negation.expand` and `negation.compress`.
6. **Preview and commit:** `interaction/negationInlinePreview.js` owns the read-only in-place candidate DOM for **expansion and compression** and uses the shared single-use, stale-safe gate, detached history preparation, and shared publication boundary. The controller receives a renderer callback and confirmation/cancellation callbacks; it never owns the mathematical rule or history.
7. **Visual feedback:** operator styling uses stable outlines. The shared Visual Feedback Controller applies the amber `proposed-insertion` decoration to the inserted numerical occurrence; the preview controller does not set feature-specific highlight classes or edit the AST.

## Scope limitations (important)

- **Implemented in the interface:** click or keyboard-activate the compact minus operator to preview expansion; Confirm/Cancel; Escape cancellation; editable subtraction syntax.
- **v1.2 pointer gesture implemented:** drag a direct `Number(-1)` factor onto a direct sibling `Symbol` or explicit `Group` in the same `Multiply` node. A numerical leaf remains eligible for ordinary numerical combination, not compression. Bracket hit-testing distinguishes `Group(Number(-3))` from its inner `Number(-3)`.
- Negation v1.1 temporarily replaces the visible expression with the renderer-produced candidate, restores the original DOM on cancellation, and highlights only the newly inserted -1 using `createVisualFeedbackController` and the shared `proposed-insertion` role. The controls remain outside the mathematical expression, but inside its view. Further preview families still require migration to the shared feedback system.
- No division, powers, function calls, full type/assumption reasoning, or configurable teaching-policy confirmation switch yet.
- No automatic global display preference UI yet; `a+-b` is the initial default and may be made configurable without changing the AST.

## Tests and safety invariants

- `tests/negation-subtraction-v1.test.js`: parsing, identity preservation, detached candidates, and grouped versus numerical target discrimination.
- `e2e/negation-subtraction-v1.spec.js`: real click, in-place candidate, amber-only insertion, preview nonmutation, cancellation and one history commit. The v1.2.2 browser suite was reported passing; v1.2.3 browser verification is pending.
- Run `node --test tests/*.test.js` and `npm run test:e2e` before approving a release.
- A preview must not mutate authoritative mathematical objects or history; confirmation must be stale-safe and single-use.
- Do not add renderer-specific geometry, DOM elements, or CSS concerns to the mathematical rule.

## Future design requirements

- Use the existing nested Group/Number hitbox distinction for reverse negation; numerical combination wins when the target is an ungrouped numeric literal.
- Extend the shared Visual Feedback Controller with semantic negation preview roles rather than adding more feature-specific CSS.
- Preserve accessible keyboard and touch activation; verify deeply nested expressions and low-end-device performance.
- When adding powers, fractions, assumptions, or non-scalar mathematical types, revise the validity and precedence contracts before extending the rule.

### Negation v1.1.1 — semantic amber feedback and preview confirmation

- The **Mathematical Engine** still owns the detached negation expansion candidate and
  inserted `-1` occurrence identity. No new mathematical rule is introduced.
- The **renderer** still owns notation and occurrence hitboxes; it does not commit
  mathematical changes or attach confirmation behaviour.
- The **Visual Feedback Controller** owns the `proposed-insertion` semantic role.
  Shared CSS now uses distribution's theme tokens and excludes semantic insertion
  feedback from the neutral hover-only hitbox hiding rules. This is a global
  visual priority correction, not a negation-specific amber override.
- `interaction/previewConfirmationTargets.js` owns reusable activation of
  specifically designated candidate occurrences (pointer click, Enter, Space).
  It does not know mathematical rules or history. The inline preview controller
  binds/unbinds this behaviour for the inserted `-1` and leaves the rest of the
  uncommitted candidate inert. The explicit Confirm and Cancel buttons remain.
- The **shared commit lifecycle** remains the only authority to accept the
  confirmed proposal, validate the source revision, and publish one history event.
- Tests in `e2e/negation-subtraction-v1.spec.js` inspect computed amber outline,
  shadow, and pointer eligibility under both visibility preferences and themes;
  they also verify mouse and keyboard confirmation and one history commit.

This is a small shared-feedback migration. Distribution's specialized preview
rendering and provenance arrows are intentionally unchanged. Future preview
features may reuse the generic confirmation binding without putting click
handlers in the mathematical renderer or feedback controller.

### Negation v1.2 — reverse compression (reconstructed)

- **Recovery:** No v1.2 artifact was found in the available conversation files. This version was rebuilt from the previously delivered, browser-verified `Manipulator_Negation_v1_1_1_Dashed_Amber_Hover_Fix.zip`. Do not confuse a reported earlier implementation with a recoverable release.
- **Engine:** `operations/negation.js` already contained a pure detached compression rule. Its result now also identifies the newly introduced `Negate` operator owner, while retaining the existing target subtree ID. It never consumes an unrelated `-1`.
- **Interaction:** `interaction/negationCompressionTarget.js` resolves the exact nested DOM occurrence from pointer coordinates. It has no mathematical-rule or CSS knowledge. `app.js` asks the registered coordinator for eligibility, and only then opens the existing inline preview.
- **Feedback:** The Visual Feedback Controller owns transient green eligibility and shared amber proposed-insertion. The renderer supplies the operator hitbox. The preview interaction binding makes the new amber minus clickable, while the single-use commit gate remains authoritative.
- **Drag safety:** The drag ghost is pointer-inert so it cannot cover bracket hitboxes during `elementFromPoint` targeting. No AST is modified during hover or preview.
- **Tests:** `tests/negation-compression-v12.test.js` covers detached candidates, group/numeric distinction and DOM target selection. `e2e/negation-compression-v12.spec.js` exercises real pointer drops, amber preview, cancellation and one history commit. The v1.2.2 browser tests were reported passing; v1.2.3 browser verification is pending.
- **Known limitations:** Only direct Multiply siblings are eligible. Targeting nested Group ancestors beyond the direct factor is not automatically promoted. Keyboard/touch drag alternatives and broader type/assumption reasoning remain future work.

### Current preview wording and regression contract (v1.2.3)

`manipulator/negationVisual.js` owns the semantic copy for both `negation.expand` (− becomes −1) and `negation.compress` (−1 becomes −). `interaction/negationInlinePreview.js` renders the description; `app.js` uses the same description for the status message. Neither the DOM controller nor the mathematical rule contains a duplicated direction-specific string. Unknown rule IDs fail explicitly.

`tests/negation-contract-roundtrip.test.js` compares parsed/serialized AST **structure**, ignoring generated occurrence IDs and purely presentational multiplication separator style. It exercises repeated signs, atomic negative literals, Group boundaries, product/negation precedence and equality contexts. This is regression coverage, not a claim that future exponentiation is implemented.

Compression hover still builds a detached candidate in the current implementation. Do not add a second eligibility API without a demonstrated performance problem; if profiling warrants one, retain final mathematical revalidation on release.
