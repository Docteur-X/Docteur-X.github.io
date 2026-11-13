# Interaction standards (stage 1 draft)

**Status:** draft, 11 November 2026. Nothing here is implemented. **The owner has decided every item** (stage 1 is complete on paper) (marked **Decided**); the other items still carry proposed answers.

This is stage 1 of the [rebuild plan](Rebuild_Plan.md). It sets out five short standards that the later stages build to:

| # | Standard | The question it answers |
|---|---|---|
| 0 | Notation | What does the tree store, and what is only a way of writing it? |
| 1 | View mode | What is this view doing right now? |
| 2 | Gesture declaration | Which actions can a student take on which parts? |
| 3 | Rule bundle | What does one rule have to supply? |
| 4 | Renderer labels | How does any part of the screen say which part of the mathematics it is? |

At the end, one worked example follows a single action through all five.

The aim is lower complexity: each question gets one answer, in one place. The [coupling report](Rebuild_Plan.md#how-progress-is-measured) is one advisory measure of that.

---

## 0. Notation

### What the code does today
The parser already stores subtraction as addition of a negative:

```
parseExpression("a-b")  →  { type: "Add", operands: [ {Symbol a}, {Negate {Symbol b}} ] }
parseExpression("-a")   →  { type: "Negate", operand: {Symbol a} }
parseExpression("a/b")  →  error: I could not understand "/"
```

[Negation and Subtraction v1](../../04_Reference/Negation_and_Subtraction_v1.md) already says two things:
- `Negate(X)` and `Multiply(-1, X)` are different trees on purpose, because the difference matters to the student;
- showing `a−b` instead of `a+−b` is a display choice that "may be made configurable without changing the AST".

### The standard
1. **The tree stores mathematics only.** Two ways of writing the same tree are notation, not separate trees.
2. **Different trees stay different, even when they're equal in value.** `Negate(b)`, `Multiply(-1, b)` and `Number(-3)` remain distinct, because changing one into another is a step the student takes.
3. **Notation is stored as a display choice on the node.** For example, `display: "minus"` on an `Add` operand, or `display: "fraction"` on a `Multiply`. It's saved in history like the rest of the node, but rules ignore it.
4. **Changing notation never needs the Engine.** It's a display change. Whether it gets its own undo step is **Decide 0.2**.
5. **Gestures act on the mathematics, whatever the notation.** In `a−b`, the `−` belongs to the `Negate` node, and dragging it means dragging that sign.

### What this means for division (not built yet, but planned for)
`a÷b` and `a/b` (as a fraction) would both be stored as `Multiply(a, Invert(b))`. Inline versus stacked is `display` on the `Multiply`. A 2-D fraction is then a new **layout** for an existing tree, not a new kind of mathematics.

### Decide (owner)
- **0.1 Decided (owner, 11 November 2026): `a+−b` is the default, and the student changes the notation by dragging the minus sign, not through a setting.**

  Hitboxes are shown in brackets: `[a] + [−b]` means three hitboxes.

  | Display | Hitboxes | Gesture | Result |
  |---|---|---|---|
  | `a+−b` | `[a]` `+` `[−b]` | Drag the `−` of `−b` over the `+`. The `−` glows blue, the rearrangement colour. Drop it on the `+` | `a−b` |
  | `a−b` | `[a]` `−` `[b]` | Drag the `−` onto `[b]` | `a+−b` |
  | `a−b` | `[a]` `−` `[b]` | Drag the `[b]` hitbox anywhere | The `−` moves with it, because together they are the one occurrence `Negate(b)` |

  **What it means for the standards:**
  - **The tree never changes:** it's `Add(a, Negate(b))` in all three rows. Only the operand's display choice changes, from `display: "plus-negative"` to `display: "minus"`.
  - **In `a−b`, the `−` is drawn as the `Add`'s operator,** but it still belongs to the `Negate` node. Its label carries both: `data-operator-owner-id` points to the `Negate`, and a new `data-merged-with` points to the `Add`'s operator slot. Dragging it moves only the sign (a notation change). Dragging `[b]` moves the whole `Negate(b)` occurrence (a rearrangement).
  - **This is a rule bundle like any other:** `notation.merge-minus` and `notation.split-minus`, with `drag` declarations from the minus onto the `+`, and from the minus onto its own operand. It is `"immediate"`, and its `propose()` changes the display choice only.
  - **Still open:** a leading `−a+b` has no `+` to merge into. Proposed: there, dragging the minus does nothing, and nothing glows.
- **0.2 Decided (owner, 11 November 2026): notation changes are stored in history,** as steps of their own. The owner's concern is that a student looking back through history shouldn't be confused by steps that only changed the notation. So:
  - each history step records its kind, `"mathematics"` or `"notation"`. This comes from the rule bundle (`notation.*` rules are `"notation"`);
  - the history display gets modes, for example "all steps" and "mathematical steps only", which skip notation steps;
  - when a notation step is skipped, the step shown next to it uses the notation in force at that point, so what the student sees still matches what they did.
- **0.3 Decided (owner): division is planned as `Multiply(a, Invert(b))`.** It will be built later. The owner's required behaviour:

  | Display | Tree | Action | Result |
  |---|---|---|---|
  | `a÷b×c` | `Multiply(a, Invert(b), c)` | Drag `b` to the front | `1÷b×a×c`, which is `Multiply(Invert(b), a, c)` |
  | `b÷b` | `Multiply(b, Invert(b))` | Combine | `1`, with the assumption `b≠0` recorded |

  **What it means for the standards:**
  - **Decided (owner): the leading 1 is a real `Number(1)` node.** A 1 the student can see but not touch would be confusing. It must feel real, but it is **locked** while a `÷` follows it:
    - a product may never start with a bare `÷`. Dragging `b` to the front produces `Multiply(Number(1), Invert(b), a, c)`, a new 1 with its own ID;
    - if the student moves that 1 somewhere other than the front, a new 1 is generated in front, so the `÷` is never bare. For example, `1÷b×a` with the 1 dragged to the end becomes `1÷b×a×1`;
    - while it's locked, the 1 can be moved but can't be combined or removed. Once nothing makes it necessary (for example `1×a÷b`), it's an ordinary 1, and the existing identity rules can remove it.
    - **To check with the owner when division is designed:** whether "locked" should also stop it being moved at all, which would make the "new 1" case never arise.
  - **Reordering a product is only allowed where multiplication commutes.** The rule's `propose()` checks the object's number type, so a future matrix window refuses it. This keeps the founding requirement for noncommutative types.
  - **`b÷b = 1` needs the Engine to record assumptions.** `propose()` returns `{ plan, assumptions: ["b ≠ 0"] }`, and history keeps the assumptions with the step. That's the "conditions" design still to come with division. It also connects to TRUE/FALSE/UNKNOWN in the [Engine statements draft](../../02_Architecture/Engine_Statements_Draft.md).

---

## 1. View mode

### What the code did before stage 2
**Implemented in stage 2** (11 November 2026) as `js/view/viewMode.js`, with the kinds `idle`, `dragging` and `preview`. `pressing`, `armed` and `menu` are added when the code that needs them moves over. Before that, "is something already happening?" was answered by five separate things:

| Where | Values |
|---|---|
| `state.drag` | `null` or a drag in progress |
| `state.factorDrag` | `null` or a factor drag in progress |
| `state.distributionPreview` | `null` or an open preview |
| `state.groupingMode` | `"normal"` or `"preview"` |
| `state.factorisationMode` | `"normal"` or `"preview"` |
| `modalPreviewOwnership` | which feature holds the preview lease |

`app.js` compares `groupingMode` and `factorisationMode` against these strings 77 times. The drag `canStart` check and the release check in `finishDrag` each combine a different selection of them.

### The standard
Each view has exactly one mode at a time, held in one place, `js/view/viewMode.js`:

```js
mode = { kind: "idle" }
     | { kind: "pressing",  pointerId, part }              // pointer down, not moved yet
     | { kind: "dragging",  pointerId, source, session }   // an occurrence is being dragged
     | { kind: "armed",     ruleId, step }                 // a multi-step action is part-way through
     | { kind: "preview",   ruleId, proposal }             // a proposal is waiting for confirm or cancel
     | { kind: "menu",      ruleId, anchor, items }        // a small menu is open on a part (future)
```

The rules:
1. **One answer.** "Can something start?" is `mode.kind === "idle"`. No other flag answers it.
2. **Only the owner can leave a mode.**
   - The input router (standard 2) moves the view between `idle`, `pressing` and `dragging`.
   - The preview host moves it in and out of `preview`.
   - The rule that armed the view is the only one that can take it out of `armed`.
3. **Every mode has a defined exit for Escape, a context switch (another object, undo or a document change) and a re-render.** These exits are written once, in `viewMode.js`, not once per feature.
4. **Selection is not a mode.** The selected parts are view state that sits alongside `idle`. A preview may keep them or clear them.
5. **The mode is per view.** A future second window has its own mode.

**What goes away:** `state.drag`, `state.factorDrag`, `state.distributionPreview`, `state.groupingMode`, `state.factorisationMode`, and `modalPreviewOwnership` as a separate idea. The preview host keeps its single-use confirmation and source-stamp checks, but now records ownership in the view mode.

### Decide (owner)
- **1.1 Decided (owner): `armed` is its own mode.** Equality's `=` (`data-armed`) and the identity tool waiting for a target both use it.

  **Menus (owner, future):** the architecture must allow simple menus in a view. The mode list includes `menu` for this:
  - an `activate` gesture can open a menu on a part instead of acting at once;
  - the menu's items are other rules' requests, so choosing an item goes through `propose()` like any gesture;
  - Escape or a click outside closes it, through the same exits as every other mode;
  - only one menu can be open at a time, because only one mode is.

  The `=` sign is already labelled "Equality operation menu", so equality would be the first user. The menu is not built in this plan.
- **1.2 Decided (owner): a strict requirement.** While a preview is open, only confirm, cancel and the preview's own controls do anything. That covers every gesture, key, toolbar button, undo, and switching objects or documents.
  - **How it's enforced:** the router and the toolbar both check `mode.kind` in one place.
  - **How it's verified:** stage 3 adds a browser test that opens each preview family and tries every gesture kind and toolbar action.
  - **What's allowed:** a context switch still cancels the preview through its defined exit; it never commits.

---

## 2. Gesture declaration

### What the code did before stage 3
**Implemented in stage 3** (11 November 2026): `js/view/inputRouter.js`, `js/app/gestureDeclarations.js` and `js/view/partFromElement.js`. The behaviour still lives in routes in `app.js` until stage 4. Before that, the equation element had 10 listeners: 3 `pointerdown`, 3 `click`, 2 `keydown`, `pointermove`, `pointerover` and `pointerleave`. There are more on `document`. They compete for the same event: for example, the negation listener calls `event.stopImmediatePropagation()` so the next listener doesn't also act. The result depends on the order the listeners were added in `app.js`. Each rule's gesture file (for example `manipulator/negationGesture.js`) only builds a request once `app.js` has already decided that this gesture is happening.

### The standard
**One router per view** (`js/view/inputRouter.js`) listens to pointer and keyboard events on the view's root element. It is the only code that does.

For each event, the router:
1. finds the labelled part that was touched (standard 4);
2. checks the view mode (standard 1);
3. looks up which rules have **declared** a gesture that matches;
4. asks those rules' `propose()` (standard 3).

Rules declare gestures as data:

```js
gestures: [
  // Click or press Enter on the minus sign of a Negate.
  { kind: "activate", on: { role: "operator", operatorKind: "negate" } },

  // Drag a Number(-1) factor onto a sibling in the same product.
  { kind: "drag", from: { role: "occurrence", nodeType: "Number", value: "-1" },
                  onto: { role: "occurrence", sameParent: true, parentType: "Multiply" } },

  // A keyboard shortcut for the selected part.
  { kind: "key", key: "n", on: { role: "occurrence", selected: true } }
]
```

**The gesture kinds,** which cover every feature that exists today:

| Kind | Meaning | Used today by |
|---|---|---|
| `activate` | Click, tap, or Enter/Space on a part | Negation expand; equality's `=` |
| `drag` | Drag one part onto another part | Combination, negation compress, distribution |
| `drag-between` | Drag a part to a gap between siblings | Rearrangement |
| `drop-tool` | Drag a toolbar item onto a part | Identity insertion |
| `command` | A toolbar button or key, applied to the current selection | Grouping, factorisation |
| `key` | A key on the focused or selected part | Keyboard reordering and shortcuts |

The rules:
1. **Declarations are data.** They can be listed, tested and shown to a student (for example, "what can I do with this part?") without running a gesture.
2. **Geometry finds the part; it never grants permission.** Only the rule's `propose()` says whether the action is valid.
3. **If more than one rule matches,** all of them are asked, and those that return a valid plan are ranked by a single, written precedence list in the registry. Today's precedence, which `intentArbitration.js` puts as distribution first, is copied there unchanged.
4. **Pointer, touch and keyboard reach the same declarations.** A `drag` also has a keyboard path (select the part, then choose the target). This keeps the agreed principle that a student without a pointer can do everything.
5. **Escape belongs to the view mode,** not to any one rule.

### Decide (owner)
- **2.1 Decided (owner): these six kinds to start, and more can be added.**

  **Gesture kinds describe what the student means, not raw browser events.** One kind is reached by several events. For example, `activate` is a click, a tap, or Enter/Space on a focused part. The router turns events into kinds in one place, so a rule never handles `pointerdown` itself.

  **Hover is not a gesture:** it changes nothing. It's feedback, and it's handled by each rule's `presentation.hover`, such as the blue rearrangement glow while a minus is dragged over a `+`.

  **Adding a kind later** means teaching the router the new event pattern once. Every rule can then declare it. Likely future kinds:

  | Kind | Events | Possible use |
  |---|---|---|
  | `double-activate` | Double click, double tap | A quick shortcut, such as evaluating |
  | `long-press` | Holding a touch or the mouse | Opening a menu on touch screens |
  | `context` | Right click, the Menu key | Opening a menu |
  | `select-range` | Shift-click, or dragging across | Choosing several terms at once (today it's part of grouping) |

  A new kind must also have a keyboard route, so a student without a pointer can still use it.
- **2.2 Decided (owner): yes, build a framework for it,** because it supports guided teaching and accessibility. Since gestures are declared as data, the router can answer "which rules accept this part, and by which gesture?" without trying them. That answer will feed three things:
  - a screen reader's description of a part, such as "can be dragged onto a factor to combine";
  - guided teaching, which can highlight or limit the available actions;
  - a future on-screen list, opened by a key or a long-press.

  This plan builds the question and its answer, in stage 3. How it's shown to students is designed later.

---

## 3. Rule bundle

### What the code does today
The registry (`manipulator/transformationFeatures.js`, filled in by `composition/transformationFeatureAssembly.js`) already holds most of a bundle:

```js
{ id: 'negation.expand', propose: proposeExpandNegation, gesture: expandNegationAction,
  visual: describeNegationCandidate, confirmationMode: 'preview' }
```

What it doesn't hold, so it lives in `app.js` instead:
- **when** the gesture applies: the hit testing and the `executeOrdinaryDragExit` cases;
- **how the preview is shown,** through `negationPreviewUI` and its equivalents for the other features;
- **hover feedback** while dragging.

**Started in stage 4** (11 November 2026): `js/rules/negation/` is the first bundle. In practice a bundle exports a pure part (`rule.js`: registry entries and declarations) and `install(ctx)`, which registers its routes, preview and drop targets through the generic rule context.

### The standard
One folder per rule, `js/rules/<name>/`, whose `index.js` exports:

```js
export default {
  id: "negation.expand",                     // stable; also used as the history label
  gestures: [ /* standard 2 */ ],
  propose(root, request) {                   // the Engine: pure, no DOM
    return { plan, root: candidateRoot }     // or { rejection } (ruleRejections.js)
  },
  confirmation: "preview",                   // or "immediate"
  presentation: {                            // decoration only, after rendering (standard 4)
    hover(plan, marks)  { /* e.g. marks.add(nodeId, "eligible") */ },
    preview(plan, marks) { /* e.g. marks.add(newNodeId, "proposed-insertion") */ }
  }
}
```

The rules:
1. **A rule names only its own things.** It doesn't import another rule, `app.js`, the router or the DOM. `presentation` works through `marks`, which add `data-*` roles that the CSS paints, using the existing Visual Feedback Controller roles such as `proposed-insertion`, `proposed-target` and `eligible`.
2. **The generic path does the rest:**
   - the router matches the gesture;
   - `propose()` runs, and a rejection is explained to the student using `describeRejection`;
   - an `"immediate"` rule commits;
   - a `"preview"` rule goes through the preview host, which sets the mode, shows `presentation.preview`, and waits for confirm or cancel;
   - the commit is published to history.
3. **A rule that needs its own controls** (for example, factorisation's choice of factor) declares them in `presentation`. The preview host places them in the reserved controls area agreed in the [preview standard](Preview_Standard_Draft.md).
4. **Engine functions don't move.** `operations/`, `relations/` and `core/` stay where they are, and a bundle imports from them.
5. **A rule has its own CSS section,** in `feedback.css` or `previews.css` as today, named after its `id`.

### Decide (owner)
- **3.1 Decided (owner): yes.** May a rule's folder contain more than one file? For example, `js/rules/factorisation/index.js` plus `js/rules/factorisation/choice.js` for the code that lets the student choose a factor. Proposed: yes, as long as only that rule's own files import them. Other code uses the rule only through its `index.js`.
- **3.2 Decided (owner): keep them.** Should rules keep their current names? Every history step stores the name of the rule that made it, such as `negation.expand` or `grouping.range`. Saved documents contain these names. Proposed: keep today's names exactly, so documents saved before the rebuild still load and their history still makes sense.

---

## 4. Renderer labels

The full draft is the [renderer standard](Renderer_Standard_Draft.md). This section only fixes what the other standards rely on.

### The labels (already produced today)

```html
<span class="negate-operator-hitbox" data-hitbox-role="operator" data-operator-kind="negate"
      data-operator-owner-id="node-5" role="button" tabindex="0">−</span>
<div class="term add-operand" data-node-id="node-1" data-hitbox-role="occurrence"
     data-parent-id="node-3" tabindex="0">…a…</div>
```

| Label | Means | The router uses it to fill |
|---|---|---|
| `data-hitbox-role="occurrence"` + `data-node-id` | This box is that node | `on: { role: "occurrence" }`, plus the node's type and value from the tree |
| `data-hitbox-role="operator"` + `data-operator-owner-id` (+ `data-operator-kind`, `data-operator-index`) | That operator of that node | `on: { role: "operator", operatorKind }` |
| `data-hitbox-role="content"` + `data-parent-id` | The inside of that operation | `drag-between` gaps |

### The standard
1. **Every occurrence and every operator gets these labels.** One test checks this for every node type.
2. **Labels say what a part *is*, never what it can *do*.** The router reads `nodeType` and `value` from the tree using `data-node-id`. It never reads a CSS class to decide meaning.
3. **The renderer paints no states.** Selection, hover, eligibility and preview marks are added afterwards through `marks`.

### Decide (owner)
Owner's answers, 11 November 2026, recorded in the [renderer standard](Renderer_Standard_Draft.md#decide-owner):
- **R1, a box for every nested `Add` and `Multiply`: agreed as proposed.**
- **R2, who owns hitbox size and shape: option B,** a wider hit area drawn by CSS (`::before` with `--hit-extra`), so hit size and the spacing of the mathematics are set separately.
- **R3, the assigned-value badge as a display choice: agreed as proposed.**

---

## Worked example: clicking the minus in `a+−b`

| Step | Standard | What happens |
|---|---|---|
| 1 | 4 | The student clicks `<span data-hitbox-role="operator" data-operator-kind="negate" data-operator-owner-id="node-2">`. |
| 2 | 1 | The router checks the view mode: it is `{ kind: "idle" }`, so it continues. If a preview were open, the click would be ignored, with the message "Confirm or cancel the preview first". |
| 3 | 2 | The router finds that `negation.expand` declares `{ kind: "activate", on: { role: "operator", operatorKind: "negate" } }`, and builds the request `{ negateNodeId: "node-2" }`. |
| 4 | 3 | `propose(root, request)` returns a plan whose candidate tree is `a + (−1)·b`, with a new node `node-7` for `−1`. |
| 5 | 3, 1 | The rule is `"preview"`, so the preview host sets the mode to `{ kind: "preview", ruleId: "negation.expand", proposal }` and renders the candidate tree with `inert`. |
| 6 | 3, 4 | `presentation.preview` calls `marks.add("node-7", "proposed-insertion")`, and the CSS paints it amber. |
| 7 | 1 | Clicking `node-7` confirms; Escape or a click outside cancels. Either way, the mode returns to `{ kind: "idle" }`. On confirm, the commit is published to history with the label `negation.expand`. |

**Not involved at any step:** `app.js`, another rule, or a feature flag. Adding a new rule repeats steps 3–6 with that rule's own declaration, plan and marks, and leaves steps 1, 2 and 7 unchanged.

## The focus palette (owner's idea, 11 November 2026; future, not in this plan)

**The idea:** a collapsible palette, for accessibility.
1. The student navigates to a subtree with the arrow keys.
2. They bring it into the palette.
3. The palette shows that subtree as one large, resizable hitbox.
4. Clicking it, or dropping something onto it, acts exactly as if the student had done that to the original subtree in the equation.

**Added by the owner:** the hitbox in a palette can itself be dragged, and dropped into the equation or onto another palette. So there can be several palettes, and each one is both a place to drop onto and a place to drag from.

**Why it fits the standards without changes:**
- **Standard 4:** the palette is a partial rendering of the same node, so its box carries the same `data-node-id`. To the router, a hit on the palette box *is* a hit on that node.
- **Standard 2:** the same gesture declarations apply, so no rule needs to know the palette exists. A `drag` from the equation onto the palette box is a drag onto that node.
- **Standard 1:** the palette belongs to the same view as its equation and **shares its mode**. A preview opened from the palette blocks the equation too, as decision 1.2 requires.
- **Standard 3:** previews and highlights are applied by node ID, so they appear in both places at once.
- **R2:** the palette's large hitbox is just a larger `--hit-extra` and font size for that one rendering.

**What it needs when it's built:**
- a "focus" value in the view's state, holding the node ID shown in the palette. It's cleared when that node disappears, for example after a rule replaces it;
- the router allowing a drag to start in any area of the view (the equation or any palette) and drop in any other. A palette hitbox is a `drag` source like the equation's own, because it carries the same `data-node-id`. Dropping it into the equation, for example into a gap between terms, is then ordinary rearrangement of the original node;
- several palettes per view, each with its own focus node ID. All of them share the view's mode;
- keyboard routes for "bring the selection to the palette" and "move focus between equation and palette".

## What these standards don't cover yet
- Statements and logic: see the [Engine statements draft](../../02_Architecture/Engine_Statements_Draft.md).
- Engine conditions such as `b≠0`, which division will need. They belong in `propose()` as a rejection or an assumption. That design comes with division.
- 2-D layout (fractions, powers): it fits standard 4 as new layouts, and is designed when the first one is built.
- Windows: standard 1 is already per view.
