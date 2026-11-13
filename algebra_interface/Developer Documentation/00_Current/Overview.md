# Overview: the layers and where things live

The Manipulator is an offline browser application in plain JavaScript modules (no build step). `index.html` loads `js/app.js`, which wires everything together at start-up. The JavaScript source and the tests are the authority on what the code does; this page is a map of it.

## The layers

The folders in `js/` are the layers, from the mathematics outwards (clean-up C5, 12 November 2026). An inner layer never imports an outer one; `tests/architecture/dependency-boundaries.test.js` checks this.

| Folder | Layer | Holds |
|---|---|---|
| `js/engine/` | mathematics | The tree: the node registry (`nodeRegistry.js`), node creation (`nodeFactory.js`), walking and normalising (`treeUtils.js`, `normalization.js`), equality of trees (`structuralEquality.js`), exact numbers (`rational.js`). Reading and printing (`parser.js`, from the notation table `notation.js`), the canonical text form (`canonicalText.js`), MathJSON (`mathJson.js`), automatic brackets (`operatorMetadata.js`), the leading-1 rule for division (`divisionInvariant.js`), patterns for identity rules (`patterns.js`), property questions (`structures.js`). `operations/`: the arithmetic the rules use. `relations/`: equality's own functions and applying an operation to both sides. `teaching/`: teaching policies. |
| `js/definitions/` | mathematics | Definition objects, one folder each, with a registry file: `types/` (scalar), `operators/` (Add, Multiply, Negate, Invert, Group, the axioms, the functions sin to exp), `relations/` (=, <, >), `interactions/` (the six gestures). `define.js` checks and freezes them. `operators/presentation.js` answers how an operator is drawn. |
| `js/documents/` | saving | Documents with several objects, each with a branching history of events and fingerprinted snapshots (`documentHistory.js`), the checks a saved document must pass (`documentInvariants.js`), serialization (`documentSerialization.js`), storage in the browser (`documentRepository.js`), the clipboard library. |
| `js/steps/` | a step's lifecycle | Requests, the rule registry (`transformationFeatures.js`) and the coordinator that asks it (`transformationCoordinator.js`), the preview host (`previewSessionHost.js`), the source stamp, the atomic commit (`atomicTransformationCommit.js`) and publication (`transformationPublication.js`). |
| `js/rules/` | rules | One folder per rule bundle (`engine.js`, `rule.js`, `install.js`, `index.js`), listed once in `bundles.js`. `identities/` serves every identity written as data. |
| `js/view/` | what the student sees and does | The input router and the view mode (`inputRouter.js`, `viewMode.js`), the equation view, selection, structure navigation, feedback, the history view. `rendering/`: the tree drawn as boxes (`domRenderer.js`, with each node type's drawing in `nodeSpecs.js`). `drag/`: picking up, hit testing, arbitration, drag feedback and the reorder preview. `preview/`: the shared candidate preview and the transformation preview. |
| `js/app/` | the page around the view | Application state, the rule context every bundle receives (`ruleContext.js`), the lists rules register into (`ruleExtensions.js`); `workspace/` (documents, saving, import and export); `ui/` (panels, preferences, bindings). |

`js/app.js` is the start-up: it creates the modules in dependency order and installs the rule bundles.

Outside `js/`: `css/` (one file per responsibility; `styles.css` lists them), `tests/` (Node tests, grouped like the code), `e2e/` (browser tests), `visual/` (screenshots), `scripts/` (reports and checks).

## How it fits together

A student's gesture reaches a rule; the rule asks the Engine for a result; the result is previewed and then committed as one history step; the document is saved. The four paths are described, file by file, in [Pipelines](Pipelines.md).

What is defined where:

- **What a node is** (its children, its meaning fields, its notation fields): the node registry, `js/engine/nodeRegistry.js`.
- **What a type, operator or relation is** (properties, notation, both-sides effects): its definition folder in `js/definitions/`.
- **What a rule does and needs**: its bundle in `js/rules/`, with `requires` checked against the type.
- **How a gesture is recognised**: its interaction definition in `js/definitions/interactions/`, which names the modules that do it.
- **How something is drawn**: `js/view/rendering/nodeSpecs.js` and the operator's `presentation`.

To add any of these, see [Adding things](../03_Developer_Guides/Adding_Things.md). The decisions behind the design are in [Decisions](Decisions.md); what is done and what is next is in [Status](Status.md).
