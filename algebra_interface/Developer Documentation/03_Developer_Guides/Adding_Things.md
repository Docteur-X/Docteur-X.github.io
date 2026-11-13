# Adding things

Everything the Manipulator knows is added the same way: **one folder, plus one line in a registry.** This guide covers each kind, smallest first. The layers and folders are in [Overview](../00_Current/Overview.md); the paths a step takes are in [Pipelines](../00_Current/Pipelines.md).

| To add | Folder | Registry line |
|---|---|---|
| A type (for example a group) | `js/definitions/types/<id>/index.js` | `js/definitions/types/types.js` |
| An operator or a function | `js/definitions/operators/<id>/index.js` | `js/definitions/operators/operators.js` |
| A relation (for example ≤) | `js/definitions/relations/<id>/index.js` | `js/definitions/relations/relations.js` |
| An identity (a rule written as data) | `js/rules/identities/<id>/index.js` | `js/rules/identities/identities.js` |
| A gesture | `js/definitions/interactions/<id>/index.js` | `js/definitions/interactions/interactions.js` |
| A rule with its own code | `js/rules/<bundle>/` | `js/rules/bundles.js` |

Each definition is a plain object built by a checking helper in `js/definitions/define.js` (`defineType`, `defineOperator`, `defineRelation`, `defineIdentity`, `defineInteraction`), which refuses a mistake with a clear message when the page loads.

## A type

Say which properties each operation has on it (`associative`, `commutative`, `identity`, `inverses`, `distributive`), naming the identity element, the inverse operator, and what an operation distributes over. Rules then apply wherever their requirements hold, with no change to any rule. See `js/definitions/types/scalar/index.js`.

## An operator or a function

Give the node it is stored as, its arity, its precedence, and its notation rows: an infix level (signs, the node each builds, error messages), prefix signs, brackets, and a print row. The notation table and the parser pick them up (pipeline 1); the renderer picks up its `presentation` if it is drawn as a row of terms. A **function** is `kind: 'function'`, stored as `Apply`, with a `notation.function.name`; it is typed `\name(x)`. See `js/definitions/operators/multiply/index.js` and `js/definitions/operators/sin/index.js`.

## A relation

Give its node type (it registers itself in the node registry), its properties, its converse, its spoken name, its notation row and messages, and **what doing the same to both sides does**: `'same'`, `'converse'`, `{ assumes }`, `{ refuse }`, or `{ bySign }` when it depends on a sign. Rules that act on a relation ask for it with `{ relation: 'acted-on', bothSides: 'add' }`, so one rule serves every relation. Nothing outside the folder may name the new node type (`tests/definitions/relations.test.js`). See `js/definitions/relations/less/index.js`.

## An identity

Write the two sides in the typed notation, list the variables (each stands for any expression), and say which directions are allowed and which gesture uses it. No code: the engine (`js/rules/identities/engine.js`, with `js/engine/patterns.js`) matches one side and rebuilds the other, keeping the first use of each matched expression and giving copies fresh IDs. See `js/rules/identities/sin-addition/index.js`.

## A gesture

Say what a declaration of it must give (`onto`, `key`), which modules recognise it, and which preview it uses. The input router reads the gesture list from the registry and checks every rule's declaration against it. Its recognising code goes in its own folder. See `js/definitions/interactions/drag/index.js`.

## A rule with its own code

A rule that is more than an identity (an algorithm, such as combining numbers, or a gesture of its own) is a **bundle**. Follow `js/rules/both-sides/`.

1. **`engine.js` (pure):** the mathematics. No DOM and no state; inputs are never changed. It keeps the IDs of nodes that stay, gives copies fresh ones (`copyWithFreshIds`), and records any assumption (`assumptions: [{ kind, text, expression }]`).
2. **`rule.js` (pure):** the registry entries: a stable rule ID (stored in history, never changed), `requires` (what the type or relation must provide; the coordinator checks it, so a rule never checks a property itself), `propose(root, parameters)` returning the result as `{ root, …its own fields }` (one shape), a DOM-free `gesture` adapter, a wording `visual`, and `confirmationMode` (`preview` or `immediate`). Plus its gesture `declarations`, each naming a registered gesture.
3. **`install.js`:** the interaction, through the rule context only: routes (`ctx.router.route`, with names unique across all bundles), a preview (`ctx.createPreviewHost` with `createCandidatePreview` from `js/view/preview/candidatePreview.js`), drop targets (`ctx.registerDropTarget`), commits (`ctx.commitTransformation`). Nothing new starts unless `ctx.viewMode.isIdle()`. Note the shapes: your `propose` returns the result, while `ctx.propose(request)` returns a candidate `{ action, result }`.
4. **`index.js`:** `export const bundle = { id, install, features, declarations }`.

Expected edits outside the folder: its line in `js/rules/bundles.js` (order is install order, which is route order); its CSS, if any; `e2e/view/route-order.json` if it adds routes (check that only your routes are new); the pinned rule-ID list in `tests/app/composition.test.js`. Its tests go in `tests/rules/<bundle>/` (Engine: valid, invalid, IDs kept, inputs unchanged) and `e2e/rules/<bundle>/` (the real gesture, the preview, confirm, cancel, history); a browser test asserts it reached the state it tests (lesson 5).

A bundle may import `js/engine/`, `js/definitions/`, `js/documents/`, `js/steps/` and `js/view/`, never another rule or `js/app/` (`tests/architecture/rule-bundle-boundaries.test.js`).

## Always

Never infer mathematical validity from what the page shows. Never quietly replace a targeted gesture with a different rule. Run every suite on the finished change ([Testing and verification](Testing_and_Verification.md)), and record new decisions in [Decisions](../00_Current/Decisions.md).
