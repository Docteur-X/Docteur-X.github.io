# Division as `Invert`: design draft

**Status:** decided by the owner, 12 November 2026 (answers below); D1 and D2 being built. It builds on decision 0.3 in the [interaction standards](Interaction_Standards_Draft.md).

## What is already decided (owner)

- `a÷b` is stored as `Multiply(a, Invert(b))`. Division is multiplication by an inverse, just as subtraction is addition of a `Negate`.
- A product never starts with a bare `÷`. When one would, a real `Number(1)` node goes in front (`1÷b×a×c`), with its own ID.
- That 1 is **locked** while a `÷` follows it: it can't be combined or removed. Once nothing needs it (`1×a÷b`), it's an ordinary 1, and the identity rules can remove it.
- `b÷b = 1` records the assumption `b ≠ 0` with the step.

**Correction to the 0.3 table:** its first row shows the result as `Multiply(Invert(b), a, c)`. The later decision (a real leading 1) makes it `Multiply(Number(1), Invert(b), a, c)`.

## The node

```
Invert { id, type: 'Invert', operand }
```

- **Where it may appear:** as a factor of a `Multiply`, never first (the leading-1 rule). On its own it means `1÷x`, so a side such as `1÷b` is `Multiply(Number(1), Invert(b))`.
- **The `÷` belongs to the `Invert`**, as the `−` belongs to the `Negate` (decision 0.1, rule 5). It's drawn inside the `Invert`'s own box, so `a ÷b` has two boxes, `[a]` and `[÷b]`, and dragging `[÷b]` carries its sign. The product draws no `×` before an `Invert` factor.
- **Precedence:** `÷` binds like `×` and reads left to right, so `a÷b×c` is `Multiply(a, Invert(b), c)` and `a÷b÷c` is `Multiply(a, Invert(b), Invert(c))`. A compound divisor keeps its brackets: `a÷(b+c)` is `Multiply(a, Invert(Group(Add(b, c))))`.
- **Typing it:** `÷` and `/` both mean division (proposed; see question 2).
- **Exact numbers:** `6÷4` is the exact rational `3/2` (exact rationals exist since 10 November 2026). `x÷0` can be written, but no rule may evaluate it.

## What each existing part must do

| Part | With `Invert` | Stage |
|---|---|---|
| Parser, printer, MathJSON (`["Divide", …]` or `["Power", x, -1]` on export) | read and write `÷` and `/` | D1 |
| `nodeCategories`, `nodeFactory` (`createInvert`), structural equality, document invariants | know the type; invariant: never first in a product | D1 |
| Evaluation (`treeUtils`) | `1/x` exactly; refuse when `x` evaluates to 0 | D1 |
| Renderer node specification | one new entry in `js/view/rendering/nodeSpecs.js` (the `÷` inside the box), plus a CSS section | D1 |
| Normalisation | never flatten an `Invert` into its parent; keep the leading-1 invariant | D1 |
| Rearrangement | `[÷b]` moves as one factor; moving it to the front inserts the locked 1; the locked 1 follows the owner's answer to question 1 | D2 |
| Numeric combination | `6÷2 → 3`, `2÷4 → 1/2`; refuses division by zero, with a reason | D2 |
| Distribution, factorisation, negation, identity, both-sides, cancel-opposites, grouping | must **refuse** anything involving `Invert` until they are taught it (each gets a test that it refuses) | D1 |
| Cancellation `b÷b → 1` | a new bundle, with the Engine returning `assumptions: ['b ≠ 0']`, stored with the history step | D3 |
| Fraction layout (`a/b` stacked) | a display choice on the `Multiply`, a new layout of the same tree | D4 |

The safety rule for D1: **a rule that does not understand `Invert` must refuse, never guess.** Each rule's Engine gets a test showing it refuses inputs containing `Invert`.

## Assumptions (needed for D3)

`propose()` may return `assumptions: ['b ≠ 0']`. The commit stores them in the history step's `transformation` record. History shows them beside the step, and the status line says "assuming b ≠ 0". This is the first use of the "conditions" design. Later it connects to TRUE/FALSE/UNKNOWN in the [Engine statements draft](../../02_Architecture/Engine_Statements_Draft.md).

## Stages

| Stage | What | Done when |
|---|---|---|
| D1 | **Done 12 November 2026.** The node: parse, print, evaluate, render, invariants; every other rule keeps the value (checked by `tests/engine/division-value-preservation.test.js`) | `a÷b×c` can be typed, shown, saved and reopened; every existing test passes; each rule has a refusal test |
| D2 | **Done 12 November 2026.** Moving `[÷b]` with the leading-1 rule; numeric division | The 0.3 table rows work in the browser |
| D3 | **Done 12 November 2026.** `b÷b → 1` with recorded assumptions (new bundle `js/rules/cancel-inverses/`); `0·a÷b → 0` now also allowed, assuming `b ≠ 0` | The assumption is shown in history and kept in saved documents |
| D4 | Stacked fractions as a display choice | Same tree, two layouts, screenshots for both |

## Owner's answers (12 November 2026)

1. **The locked 1 can be moved.** Moving it away generates a new 1 in front (`1÷b×a` with the 1 dragged to the end gives `1÷b×a×1`).
2. **Both `÷` and `/` are typed.** Both display as `÷` until stacked fractions (D4).
3. **`b÷b = 1`:** "assuming b ≠ 0" is shown on the status line and kept beside the step in history (and in saved documents). No extra confirmation.
4. **Order:** D1 and D2 now; D3 is designed after the owner has tried them.

## How the leading 1 is kept (design consequence of answer 1)

One shared rule, `restoreLeadingOne(root)` in `js/core/`, runs on **every** proposal, in the transformation coordinator: wherever a product would start with an `Invert`, a new `Number(1)` is put in front. So:
- rearranging `÷b` to the front gives `1÷b×a×c` (decision 0.3), and moving the 1 away gives `1÷b×a×1` (answer 1), with no code in the rearrangement rule;
- a future rule cannot produce a bare `÷` either.

A proposal that changes nothing once the 1 is restored (structurally equal to the input, IDs ignored) is refused as a no-op. That is what makes the 1 "locked": dropping it onto `a` would only bring a new 1 straight back, so the rule refuses. As a backstop, the commit refuses a tree with a bare `÷`, so a rule that bypasses the coordinator fails visibly instead of storing one.

## Questions for the owner

1. **The locked 1: may the student move it?** (The question left open in 0.3.) If not, the "a new 1 appears in front" case never happens. If yes, moving it away generates a new 1 in front.
2. **Typing:** accept both `÷` and `/`? And while there's no stacked layout yet (D4), should `a/b` simply display as `a÷b`?
3. **`b÷b`:** is "assuming b ≠ 0" shown in history and on the status line enough, or should the student confirm the assumption in the preview?
4. **Order:** build D1 and D2 now and design D3 (assumptions) after seeing them, or D1 to D3 together?

## Built (12 November 2026): what differs from the plan, and what is open

- **Rules were checked, not blocked.** The plan said rules that don't understand `Invert` should refuse it. A value-preservation test over every action of seven rules showed they are mathematically correct with `Invert` (with the leading-1 rule applied), so they were left working: for example `a÷c + b÷c → (a+b)÷c` by factorisation. One exception is refused: `0·a÷b → 0`, which needs `b ≠ 0` (stage D3).
- **The three bugs that test found** (all fixed): the leading-1 rule wrapped a leading `÷` as its own product instead of putting the 1 in the product; a product nested in a product hid a division from the "visible sign" rule; and a fraction-valued divisor printed as `a/2/3`, which reads back as a different value.
- **Numeric combination:** "drop a ×1" no longer applies against a `÷` factor, so `1 × ÷2` gives the number `0.5`, and `1 × ÷b` (which would leave a bare `÷`) is refused.
- **Decided (owner, 12 November 2026): `6÷2x` stays refused** as a bad notation that hides ambiguity. **A space starts a new factor:** `6÷2 x` is `6÷2×x` (and `a÷b (c+d)` is `a÷b×(c+d)`). Accepting `6÷2x` may be reconsidered only if teachers' feedback asks for it. A structured (MathQuill-like) input mode, planned for later, would remove the ambiguity at the source; see [Future Features](../../05_Roadmap/Future_Features.md).
- **Resolved (owner, 12 November 2026: "use the existing Multiply feedback"):** dragging a `÷` factor first showed only a bare insertion bar, because the reorder preview expected an operator between every pair of factors and fell back when it found none. The preview (`js/view/drag/rearrangementPreview.js`) now lays out a product's signs by the renderer's notation: no sign before a `÷` factor, a visible `·` after a factor ending in a division, and, when `÷d` would come first, a preview `1` in front, painted like the moving term, so the result is seen before it commits. Checked by `e2e/engine/division.spec.js`.
- **Known effect:** a computed fraction such as one third prints as `1/3`, so pressing Build on it gives the division `1÷3` (same value).
- **Not yet in the screenshot suite:** division states (add when D3 settles the look of assumptions).

## Built (12 November 2026): D3

- **Assumptions are a general mechanism, not a division special case.** A rule's result may carry `assumptions: [{ kind: 'nonzero', text: 'b ≠ 0' }]`; `ctx.commitTransformation({ …, assumptions })` stores them on the history step's event (`event.assumptions`, written only when present, checked by `assertHistoryInvariants`, kept by the compact save format). The history panel shows "assuming b ≠ 0" under the step; the rule's status line says it too.
- **`b÷b = 1`:** the cancel-inverses bundle. Drag a factor onto its inverse in the same product (`b` onto `÷b`, or `÷b` by its sign onto `b`); the pair becomes one 1 in the place of the first, immediately (like numeric combination), with the assumption. Divisors match through brackets and product notation; the condition names the divisor as written (`(a + b) ≠ 0`). Numeric pairs (and symbols with assigned values) stay with numeric combination.
- **`0·a÷b = 0`:** numeric combination's zero rule, refused in D1, now goes ahead with `b ≠ 0` for every symbolic divisor; a divisor known to be 0 is still refused.
- **Tests:** `tests/engine/division-assumptions.test.js` (engine, history storage, the history check, save and reopen), the value-preservation test extended to inverses and zero products, and two browser tests in `e2e/engine/division.spec.js` (status line and history note).
- **Not yet:** assumptions are text plus a kind; they are not yet used for reasoning (for example TRUE/FALSE/UNKNOWN, or a later step contradicting `b ≠ 0`). See the [Engine statements draft](../../02_Architecture/Engine_Statements_Draft.md).

