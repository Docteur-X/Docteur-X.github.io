# Renderer Transparency and Semantic Container Mapping v1

Status: implemented as an opt-in, read-only developer inspector. No change to mathematical semantics, history, or normal hit-testing.

## Purpose

Make the actual AST-to-DOM boundary understandable without rewriting the recursive renderer. Open the application with `?rendererInspector=1` to see a separate panel listing every mathematical occurrence, its parent, depth, and the DOM target counts associated with its stable node ID. Close the panel to remove it. The inspector never creates new mathematical occurrences or changes how a student interacts with the equation.

## Input and output contract

`renderExpression(root, options)` in `js/view/rendering/domRenderer.js` receives the unflattened expression root and presentation options. It produces a detached DOM tree. The application mounts it using `replaceChildren`. The browser then computes layout and geometry. The renderer does not apply mathematical rules.

`mapMathematicalOccurrences(root)` is a **read-only AST inventory**. Each entry contains `nodeId`, `type`, `parentId`, `depth`, and a structural relation to its parent. It is not a second authoritative tree. `mapRenderedOccurrences(entries, view)` compares this inventory with the DOM, reporting `occurrenceTargets`, `operatorTargets`, `contentContainers`, and `directlyTargetable`.

A mathematical occurrence can exist even when the current renderer has no independently clickable DOM target. `content-only` explicitly reports this gap; it does not silently invent a hitbox. A mathematical occurrence is different from a variable identity, and an operator glyph can refer to an owning occurrence without having its own AST ID.

## Current renderer anatomy

- `Number` and `Symbol` are rendered as text labels within an occurrence hitbox supplied by their parent or by the root wrapper.
- `Add` and `Multiply` render ordered operand sequences and operator glyphs. Root operations expose `data-parent-id` and a sequence container but not always their own `data-node-id` occurrence hitbox.
- `Group` creates explicit bracket glyphs and renders its child recursively. Leaf and nested Group children have independent nested occurrence hitboxes; nested Add/Multiply operations are currently content containers.
- `Negate` creates a minus operator target (`data-operator-owner-id`) and recursively renders its operand.
- `Equal` renders left and right expression roots with an equals operator target and relation identity.
- Automatic precedence brackets are presentation-only and have no separate Group occurrence.

## Known gaps and boundaries

1. DOM nesting and AST nesting are not yet one-to-one. Some operation-level occurrences are content-only. This is observable, not silently repaired by the inspector.
2. The renderer's `options` still combines layout preferences and legacy preview state. Distribution has a specialized preview path. These are later consolidation candidates, not part of this milestone.
3. Operator slots in n-ary Add are presentation positions, not durable mathematical identities. Proxies and provenance are **not implemented** here.
4. The inspector does not measure geometry or support AST navigation by keyboard yet. Future metadata may include baselines, extents and anchors.
5. A future target proxy may reference a mathematical occurrence or an operator owner, but must resolve through the authoritative current AST. Proxy continuity across rule applications remains deferred; stable node identity alone does not imply provenance or equivalence.

## Developer handover

This increment adds `js/view/rendering/semanticContainerMap.js`, `js/view/rendering/rendererInspector.js`, and `tests/view/rendering/semantic-container-map.test.js`. The only application wiring is the opt-in inspector creation and a refresh immediately after the normal equation DOM mount. Do not move mathematical validation into these modules. Do not change hitbox geometry as a side effect of inspection. Run `npm test` and `npm run test:e2e` in a Node-enabled environment; neither command could be executed in the packaging environment for this increment.
