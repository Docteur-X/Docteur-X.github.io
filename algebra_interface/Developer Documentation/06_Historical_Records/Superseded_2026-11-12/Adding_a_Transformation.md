# Adding a mathematical transformation

A rule is a **bundle**: a folder in `js/rules/`. Since stage 7 (12 November 2026) a new rule needs no edits to other code. Follow `js/rules/both-sides/` (drag a term across = to add its opposite to both sides). It was built this way to prove the design.

## What you write

1. **`engine.js` (pure).** The mathematics: the rule, its assumptions and allowed types, which node IDs are kept, and whether the result is an equivalence or only a forward implication. No DOM, no state, inputs never changed. Bundles may import `js/core`, `js/operations`, `js/relations`, `js/teaching`, `js/interaction`, `js/manipulator`, `js/input` and `js/view`, never another rule, the renderer or `app.js` (`tests/architecture/rule-bundle-boundaries.test.js`).
2. **`rule.js` (pure).** The registry entries (`features`: a stable rule ID, `propose(root, parameters)`, a DOM-free gesture request, a visual or wording adapter, and `confirmationMode` set to `preview` or `immediate`), plus the gesture `declarations` (standard 2). Rule IDs are stored in history and never change. **Declare what the rule needs** in `requires` (Engine stage E3): for example `[{ operation: 'Add', properties: ['commutative'] }]`, or `[{ relation: 'equal', bothSides: 'add' }]`. The coordinator offers the rule only where the type provides those properties (`js/engine/structures.js`); never write a property check into the rule itself. A rule whose operation is chosen per action may instead ask the type in its Engine function, and must then be added to the named exceptions in `tests/definitions/definitions.test.js`.
3. **`install.js`.** The interaction, through the rule context only (the list of services is in `js/rules/negation/install.js`): routes via `ctx.router.route`, a preview via `ctx.createPreviewHost`, drop targets via `ctx.registerDropTarget`, commits via `ctx.commitTransformation`. Nothing new starts unless `ctx.viewMode.isIdle()` (decision 1.2). Confirm targets carry `data-preview-confirm`. Note the two shapes: your feature's `propose(root, parameters)` returns the Engine's result, but `ctx.propose(request)` returns a candidate `{ action, result }`, so in `install.js` the result is `candidate.result` (the cancel-opposites bundle first committed `candidate.root`, which is undefined). Test the install path in the browser, not only the Engine in Node.
4. **`index.js`.** Re-exports, and `export const bundle = { id, install, features, declarations }`.
5. **Helpers** in the same folder if needed (decision 3.1), e.g. `inlinePreview.js`.

## The edits outside the folder (all expected)

- **One line** in `js/rules/bundles.js`. The order is install order, which is route order. Add new bundles at the end unless there is a reason not to.
- **Its CSS section**, e.g. in `css/previews.css`.
- **`e2e/view/route-order.json`**, if the bundle adds routes. Check that the difference is only your routes (`e2e/view/route-order.spec.js` fails until you update it). Updating it is deliberate.
- **The pinned rule-ID list** in `tests/app/composition.test.js` (rule IDs are history identifiers).
- **A row** in `scripts/coupling.mjs` (advisory report).
- **Its tests:** `tests/<rule>.test.js` (Engine: valid, invalid, IDs, inputs unchanged) and `e2e/<rule>.spec.js` (the real gesture, the preview, confirm, cancel, history). A browser probe asserts that it reached the state it tests (lesson 5).

The undefined-name check (`tests/architecture/free-names.test.js`) and the bundle list check (`tests/architecture/rule-bundle-list.test.js`) find new bundle files by themselves.

## Rules that still apply

Do not infer mathematical validity from UI appearance. Do not silently substitute an invalid targeted gesture with a different rule. Run the Node tests, the browser tests and the screenshots before each commit. For details see [Transformation framework](Transformation_Framework.md), [Contract reference](../../04_Reference/Transformation_Contracts.md) and the [interaction standards](Interaction_Standards_Draft.md).
