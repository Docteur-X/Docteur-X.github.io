# Equality Function Application v1.3 — Grouping and Renderer-Owned Preview

## Purpose and scope

This increment corrects the *mathematical notation* and *preview presentation* of applying a remembered expression to both sides of an equality. It does **not** implement Transformation Feature Contract v1 or extract the equality controller from `app.js`; those are explicitly deferred to a separate architectural consolidation. The existing scalar-only mathematical eligibility, arming, clipboard source, forward-implication provenance, stale-state protection, and history commit remain unchanged.

## Founding principle

**Students choose their mathematical transformations. The software enforces mathematical rules and records their chosen reasoning paths.** An amber proposal is not a mathematical commit; students must confirm it. The Engine does not depend on CSS, gestures, or windows. This principle also guides future low-resource/offline support and future vectors, matrices, logical statements, and multiple views of one Mathematical Object.

## Exact grouping contract

- Adding a *compound sum* `c+d` to `a+b=e` produces `a+b+(c+d)=e+(c+d)` **as a tree with an explicit Group only around each newly copied sum**. The original `a+b` is not wrapped in a new Group. The normal renderer may show no parentheses around it because it is an Add child of Add.
- Adding a single atomic operand (or a parser-created one-child Add wrapper) does not manufacture parentheses.
- If the copied operand is already an explicit Group, the application does not double-wrap it. The parser can represent `(c+d)` as a one-child Add containing Group; this wrapper is unwrapped when inserted, while the existing Group is preserved.
- Multiplication keeps the operand order. `(a+b)c` receives **automatic precedence parentheses** from `needsAutomaticBrackets`, not a new user-removable Group. A compound multiplicative operand is parenthesized by precedence where required.
- Existing equality and original-side node IDs are preserved. Both inserted copies receive independent fresh IDs. The original clipboard snapshot and source expression are not mutated.

## Code ownership and information flow

1. `js/relations/equalityFunctionApplication.js` creates the candidate AST. It returns `root`, mathematical `provenance`, and a small *semantic* `visualRoles.insertedOperandIds` list. The two IDs identify the outermost newly inserted occurrences, including an explicit Group when one is introduced.
2. `js/rendering/domRenderer.js` accepts `visualRoles` in its ordinary render options and applies `equality-inserted-operand` to the **matching outer hitboxes only**. It still owns all explicit brackets, automatic precedence brackets, notation, and hitbox geometry. It does not decide mathematical eligibility.
3. `js/app.js` remains the v1.3 integration controller. It passes semantic roles to the renderer and delegates confirmation clicks from the preview root. It no longer searches the DOM to assign amber classes. The original DOM is retained for cancellation, and authoritative history is updated only on confirmed commit.
4. `styles.css` reuses the established distribution palette and avoids a second CSS outline or solid enclosing box. During the inline preview, neutral structural wrappers do not masquerade as mathematical parentheses. A too-wide preview stays on one line and is horizontally scrollable pending the future resizable-window system.

This is a **small renderer-role interface**, not the general Transformation Feature Contract. Future consolidation should make the visual-role descriptor generic across transformation families, move preview lifecycle out of `app.js`, and integrate equality application with the feature registry. Avoid extending the current `app.js` implementation with further mathematical operations before that work.

## Verification and important limitations

Run `node --test tests/*.test.js` and `npx playwright test --workers=1` (after installing dependencies). New Node tests cover compound Group boundaries, atomic operands, already-grouped operands, multiplication order and identity preservation. A new Playwright test checks explicit bracket glyphs in the two copied occurrences, preview/history isolation, and confirmation. The pre-existing visual test was updated because v1.3 intentionally removes the *extra* CSS outline in favour of one dashed border.

Browser execution must still be performed on a machine with Playwright and Chromium. Verify light/dark appearance, complex expressions, horizontal overflow, keyboard/touch confirmation and cancellation on a real device. The current CSS deliberately prioritizes legible unbroken mathematical notation over automatic line-breaking; a future window manager and mathematical layout engine should own more sophisticated responsive behavior.

## Handover cautions

- Do not equate visual parentheses with `Group`: explicit groups are persistent AST structure, whereas precedence parentheses are renderer output.
- Do not color every newly allocated AST node amber. New Add/Multiply wrappers contain *old* mathematical content; only the copied occurrence is visually new.
- Do not make previews mutate the Mathematical Object or write to history. Keep stale candidate checks at confirmation.
- Do not infer mathematical identities from visible text or from DOM order. Use stable node IDs and semantic roles.
- Future noncommutative multiplication must keep left/right application separate; domains, shapes, injectivity and other assumptions require explicit Engine eligibility, never a UI guess.
- The student-agency vision is documented in `FOUNDING_VISION_STUDENT_AGENCY.md` and should be preserved during every subsequent refactor.
