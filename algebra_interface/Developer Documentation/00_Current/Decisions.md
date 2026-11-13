# Decisions: what the owner decided

Every owner decision that shapes the current code, in one list, newest first within each topic. Where a decision has a longer story, the design document it came from is linked; those documents are historical records now, and this page is the current statement. Decisions before 12 November 2026 that are still in force are kept in the [interaction standards](../06_Historical_Records/Superseded_2026-11-12/Interaction_Standards_Draft.md) (decisions 0.1 to 3.x, for example 1.2: nothing new starts unless the view is idle) and the [renderer standard](../06_Historical_Records/Superseded_2026-11-12/Renderer_Standard_Draft.md) (R1 to R3).

## How the work is done

| Date | Decision |
|---|---|
| 12 Nov 2026 | Clean the code in place rather than rewrite it ([clean-up plan](../06_Historical_Records/Superseded_2026-11-12/Cleanup_Plan.md), steps C1 to C8): no change a student can see, saved data unchanged, a check against each problem coming back. |
| 12 Nov 2026 | Folders by layer: engine, definitions, documents, steps, rules, view, app. |
| 12 Nov 2026 | Historical records stay as a read-only archive. The old-parser oracle (`tests/helpers/legacyParser.js`) stays until Engine stage E5. |
| ongoing | Architecture first: defects are recorded and deferred unless the owner asks ([Known issues](../05_Roadmap/Known_Issues.md)). Design before building. |

## The Engine standard ([design](../06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md))

| Date | Decision |
|---|---|
| 12 Nov 2026 | Types, operators, relations, rules and gestures are **definition objects**: one folder each, plus one line in a registry. |
| 12 Nov 2026 | Rules ask for properties; types provide them. A rule needing several properties is offered only where all hold: commutative alone swaps two terms; with associativity, any term moves anywhere. |
| 12 Nov 2026 | **Names:** `BinaryAdd` is the axiom (two operands; nesting written with brackets); `Add` is addition as people think of it (many terms, only where + is associative); `SequentiallyApply` is any binary operator written in a row, applied in a fixed direction. Likewise `BinaryMultiply` and `Multiply`. |
| 12 Nov 2026 | `Add` is **defined as** `BinaryAdd` applied left to right but **stored as** one list, so everyday steps cost nothing extra; the nested form is built only to show why. |
| 12 Nov 2026 | Direction: left to right by default; right to left where the operator says so (powers: `a^b^c` is `a^(b^c)`). An operator with no agreed reading opts out: `a×b×c` for vectors is refused with "write the brackets". |
| 12 Nov 2026 | `Equal` keeps its own stored type. A natural chain `a = b = c` and a `BinaryEqual` will follow, because equality is an equivalence relation. Each relation keeps its own stored name (`Less`, `Greater`); code asks "is this a relation?". |
| 12 Nov 2026 | Stage I1: gestures are definitions too, shared by rules and types. |
| 12 Nov 2026 | **Functions** are typed with a backslash, brackets always: `\sin(x)`; `\sin x` is refused. Without the backslash, `sin(x)` keeps its old meaning. |
| 12 Nov 2026 | **Identities are written as data**: two sides in the typed notation and their variables; the engine matches and rebuilds. |
| 12 Nov 2026 | Multiplying both sides of an inequality by something of **unknown sign: ask the student** (positive keeps it, zero gives an equality, negative flips it), and record the answer as the step's assumption. Built in E4d: the relation menu on `<` and `>` asks "Is c positive, zero or negative?", each answer saying what it does ("c < 0: flips to >"). |
| 12 Nov 2026 | Later, **statements split into cases** instead of asking (`If (c > 0) {…}`, `If (c = 0) {…}`, `If (c < 0) {…}`), and **undefined values stay** in the expression but stop interacting ([Future features](../05_Roadmap/Future_Features.md)). |

## Presentation of the mathematics (13 November 2026)

| Date | Decision |
|---|---|
| 13 Nov 2026 | **Typesetting and hit areas are separate.** Typesetting (spacing in `em`, after printed mathematics) decides where everything sits; hit areas never take up space (outline or shadow for borders, an invisible `::before` layer for the larger pointer target), so hovering or highlighting never moves anything. |
| 13 Nov 2026 | **Responsibilities:** the workspace window owns its size and the font-size setting (one variable, `--math-size`); the renderer owns structure only; node specs own each node's interior; tokens own fonts, sizes and spacing values; one typesetting file per node type; hit areas and feedback in their own files. |
| 13 Nov 2026 | ~~**Font:** Latin Modern Math only.~~ Replaced the same day by the switchable fonts below: the first mock-up fell back to a system font and the owner judged it unprofessional ("typed directly from Word"). |
| 13 Nov 2026 | **Fonts are switchable, not one choice.** The user picks the maths font; the candidates are KaTeX, Latin Modern and MLModern (all bundled in `assets/fonts/`, offline, licences beside them), and **Monospace stays as an alternative display mode** (the owner finds it clean and good at showing the hierarchy of terms). The default is decided in the next row. |
| 13 Nov 2026 | **Default font by screen size:** MLModern on mobiles (heavier strokes read better small), Latin Modern on larger screens. The cut-off is a viewport narrower than 768 px (the project's tablet width), checked when the page loads; a choice the user made always wins. **All four (KaTeX, Latin Modern, MLModern, Monospace) are offered in advanced settings.** |
| 13 Nov 2026 | **The font and the boxes are two independent settings.** A font set names one family per role (letters, upright text, operators); the box style is tiles, light tiles, printed (invisible until hover) or printed with faint outlines. Tiles may take space, but no box style changes on hover or selection, so nothing moves. |
| 13 Nov 2026 | **Defaults (owner approved all three):** (1) **`a − b` is shown by default**, with `a + −b` as the alternative display; the tree is unchanged and the minus stays inside its term, so it travels with the term when dragged. (2) **Long lines break by default**, only before a top-level `+`, `−` or relation, never inside a term, with an indented continuation; sideways scrolling remains as the alternative. (3) **Hovering a term lightly tints the term that holds it**, as well as outlining the hovered term. None of these may move the mathematics on hover or selection. |
| 13 Nov 2026 | **Letters in the OpenType maths fonts are drawn from the Unicode mathematical italic block** (as TeX does), not by slanting ordinary letters; the accessible name stays the plain letter. *(The mock-up does this.)* |
| 13 Nov 2026 | **In the app, letters use the font's own italic face** (LM Roman 10 Italic, MLM Roman 10 Italic, KaTeX_Math), so a letter's text in the page stays the plain letter for copying, tests and screen readers. The renderer marks a letter (`term__label--symbol`); the font set decides how it looks. Switching to the Unicode maths italic later is a renderer change only. |
| 13 Nov 2026 | **Single terms: Roomy or Compact** (owner). Compact shrinks only a term with no boxes inside it (a letter, a number, `x` in `sin(x)`); sums, products and brackets keep their boxes. Default Roomy. The touch area stays at least 44 px. |
| 13 Nov 2026 | **Box styles in the app:** Tiles (default, as before), Light tiles, Printed (nothing at rest; boxes on hover, which turns the hover outline mode on). At rest only: hover, selection and feedback keep their look; no style changes a size. |
| 13 Nov 2026 | **`a − b` in the app:** the `+` before a negative term (a Negate, a negative number, or a product starting with one, `−3y`) is drawn transparent and narrow, **not removed**: it stays the sum's target (hover lights the sum; distribution can drop on it). Negative numbers print a true minus `−`. |
| 13 Nov 2026 | **Hover tint in the app:** with boxes on hover, the term holding the hovered one gets a light tint (feedback role `hover-parent`). |
| 14 Nov 2026 | **`a − b` drawn as [a] [−] [b]** (owner, revises 13 November): the `+` before a negative term shows a `−` in the operator position, with the minus's own outline (it obeys "Hitbox outlines"); the term's leading sign is hidden (`data-leading-sign`). The `−` is the sum's operator for hover and drops, and, when the term is a Negate, a click or Enter on it does what the minus does (owner chose "both"): the negation rule activates the hidden minus beside it, and the resolver reads that minus, never an id on the `+`. The tree is unchanged: `a + (−b)`. A negative number's sign is its own element (`term__sign`). |
| 14 Nov 2026 | **Maths written as text follows the notation contract (T7):** a view that writes part of the tree as text uses `writeNotation` (`js/view/rendering/notationText.js`), which marks letters from the tree (`term__label--symbol`) as the renderer does; never `textContent = displayString`. Which names are letters comes from `nodeSpecs.js` (`namesForText`), the one drawing-side place that names node types. |
| 14 Nov 2026 | **Row chunks (D14):** the renderer puts each operator in a chunk with the term after it (`js/view/rendering/rowChunks.js`), so a long row breaks only before an operator. A chunk is for line breaking only: no node id, no hitbox, no feedback. **Code that reads a row's terms and operators uses `rowItems()`, never `container.children`** (drag geometry, the rearrangement preview, the identity preview's neighbour). |
| 14 Nov 2026 | **Printed spacing** (owner chose it next; rest of D13). With Printed boxes, sums, products and brackets lose their tile padding and minimum height (side padding 0, so nested boxes do not stack it before their first symbol); rows lose their gaps; the implicit product is a thin space (`.1em`); `+`, `·`, `×` get print's medium space (`.14em` each side). This **amends** "no style changes a size": a box style may set sizes, but only at rest and on hover alike, so hovering never moves anything (checked: no hover moves a box in any style). Single terms keep their padding (the touch area); the Single terms setting governs them. |
| 13 Nov 2026 | **Fractions wait for an Engine design** (owner): splitting, combining, `÷÷b = b` and moving a denominator are Engine questions; the drawing follows them. See the [ideas overview](../05_Roadmap/Ideas_Overview.md). |
| 13 Nov 2026 | **Boxes at rest: both modes,** as a setting: invisible until hover or selection, or faint outlines always. |
| 13 Nov 2026 | **Font size:** `A−` and `A+` buttons on the window, plus Ctrl+wheel and Ctrl+plus/minus while the window is focused. |
| 13 Nov 2026 | **Window size: both** a drag corner and preset sizes. A narrower window scrolls horizontally for now. |
| 13 Nov 2026 | First a mock-up page (current and proposed side by side) for the owner to try, before the app changes. |

## Previews

| Date | Decision |
|---|---|
| 12 Nov 2026 | **One look for every preview: the equality preview's.** Every rule whose preview is "the result with the new parts in amber" uses the shared candidate preview, styled like the equality preview: only the outermost new part glows (solid gold border, halo, dashed inner accent), its interior and the compound boxes around it stay quiet, hover strengthens the glow, and the Confirm and Cancel buttons are the styled ones with gold wording. (The owner first chose the shared amber look, then chose this one.) |

## Notation

| Date | Decision |
|---|---|
| 13 Nov 2026 | Showing `a + −b` as `a − b` (and `a·÷b` as `a ÷ b`) will be a **display setting**, not a step: the tree and history stay as they are. A shown `− b` moves as one piece: the minus always travels with the term when dragged. Not built yet. |
| 12 Nov 2026 | No hidden ambiguity: an ambiguous form is refused with a clear message, never given a silent reading. `6÷2x` is refused; `6÷2 x` (with a space) means `6÷2×x`. Accepting `6÷2x` is only for teachers to request; a structured, MathQuill-like input is planned. |
| 12 Nov 2026 | `÷` and `/` are both accepted, and shown as `÷`. |

## Division ([design](../06_Historical_Records/Superseded_2026-11-12/Division_Invert_Design_Draft.md))

| Date | Decision |
|---|---|
| 12 Nov 2026 | `a÷b` is `Multiply(a, Invert(b))`, as subtraction is adding a `Negate`. |
| 12 Nov 2026 | A product never starts with a bare `÷`: a real `1` goes in front (`1÷b×a×c`). That 1 is locked while a `÷` follows it; moving it away brings a new 1. |
| 12 Nov 2026 | `b÷b = 1` and `0·a÷b = 0` record the assumption `b ≠ 0`, shown in history and on the status line, with no confirmation asked. |
| 12 Nov 2026 | Dragging a `÷` factor uses the normal product reorder preview. |

## Rules

| Date | Decision |
|---|---|
| 12 Nov 2026 | Same to both sides: drag a term across the relation to add its opposite to both sides; cancelling `b + −b` is a separate step, so every step shows in history. |
| 12 Nov 2026 | A derived rule should be able to show why (for example `b + −b = (1 + −1)b = 0`) and could be earned before being offered as a shortcut ([Future features](../05_Roadmap/Future_Features.md)). |
