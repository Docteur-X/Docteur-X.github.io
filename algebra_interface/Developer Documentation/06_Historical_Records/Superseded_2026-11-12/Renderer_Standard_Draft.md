# Renderer standard (draft)

**Status: draft for owner review, 10 November 2026. Not implemented or approved.** Items marked **Decide** need the owner. It refines the accepted [Mathematical Presentation Composition Contract](../../04_Reference/Mathematical_Presentation_Composition_Contract.md) into rules the code can be checked against, and answers the questions raised by the [preview standard](Preview_Standard_Draft.md).

**Read with:** the [display and interaction model](Display_and_Interaction_Model_Draft.md), which places the renderer as stages 2 and 3 of the whole journey from mathematics to interaction.

## In plain words

The renderer is the part of the software that turns the mathematics stored inside it into what the student sees: numbers, letters, brackets and the boxes you can click and drag.

A good renderer is like a printing press. You give it a page, and it prints that page exactly, the same way every time. It does not decide what the page says, and it does not care who will read it or what they will do with it.

Today the renderer mostly works like that, but a few jobs have crept into it that belong elsewhere:
- **It builds one rule's preview itself.** For distribution, it draws the amber copies and their buttons, as if the printing press also wrote one particular article.
- **It is told about a rule's hover state and selection,** and changes how things look because of them, instead of only printing the mathematics.
- **It writes some instructions into the page,** such as "Arrows reorder; click selects", which describe how to interact rather than what the mathematics is.

The standard puts it back to being a printing press:
- **In:** the mathematics, plus a few display choices such as how multiplication signs look.
- **Out:** the printed mathematics, where every part carries a label saying exactly which piece of the mathematics it is.
- **After printing,** other parts of the software add highlights, selection, previews and behaviour by finding those labels. The renderer never needs to know about them.

The benefit: every feature, from previews to future windows, can rely on the same labelled page, and adding new notation means teaching the renderer one new kind of thing, in one place.

## What works today

- **One recursive renderer** (`js/view/rendering/domRenderer.js`) draws any tree of the current node types, at any depth, and returns a detached page fragment without changing the tree.
- **Every part is labelled with its tree identity:** occurrences carry `data-node-id` and `data-hitbox-role="occurrence"`; operators carry `data-operator-owner-id` and an operator index; operation interiors carry `data-hitbox-role="content"`.
- **Notation rules live outside it:** automatic brackets and visible multiplication signs come from `operatorMetadata.js`, shared with the text printer.
- **Finding parts is separate:** `semanticTargetResolver.js` turns an identity into page elements, one resolver per view.
- **Style is separate:** CSS is split by responsibility, with tests guarding the boundaries.

## What does not belong in it

| Problem | Evidence | Where it belongs |
|---|---|---|
| Builds distribution's preview | `renderDistributionPreviewSequence` creates amber copy buttons that are not part of the tree, from the `distributionPreview` option | The preview host, from a preview description |
| Paints rule and interaction states | Options `distributionHover`, `combineTargetId`, `combineParentType` and `selectedNodeId` add classes such as `plus--distribution-drop`, `is-combine-target` and `is-selected` | The Visual Feedback Controller, by address, after rendering |
| Knows about one rule's insertions | `visualRoles.insertedOperandIds` adds `equality-inserted-operand` and a confirm title | A preview description's marks |
| Imports a rule | `unwrapGroupedSum` from `operations/distribution.js` | Removed with the distribution preview |
| Dead options | `drag` and `insertionIndex` are always null, so drop slots are never drawn | Deleted, with `makeDropSlot` |
| Interaction wording | Labels such as "Arrows reorder; click selects" and the title "Click to expose −1" | The interaction layer, which knows what a part can do |
| Node knowledge is spread out | Three separate code paths for the root, and about 23 node-type checks across `makeHitbox`, `makeNodeContents` and `describe` | One specification per node type |
| Some parts have no box of their own | An `Add` or `Multiply` inside another operation has a content container but no occurrence box (noted in the Composition Contract) | Decide below |

## The standard

### 1. Input
`render(tree, settings)`:
- **tree:** any node, or a subtree together with its context (see 5).
- **settings:** display choices only: the multiplication sign style, whether to show assigned values beside symbols, and `inert` for previews.

Nothing about interaction state, gestures, rules or previews.

### 2. Output
A detached page fragment, with no event listeners, carrying these labels:

| Label | Meaning |
|---|---|
| `data-node-id` with `data-hitbox-role="occurrence"` | This box is that occurrence |
| `data-hitbox-role="content"` with `data-parent-id` | The inside of that operation |
| `data-operator-owner-id` with `data-operator-index` | That operator, by its owner and position |
| `data-hitbox-role="operator"` | This is an operator target |

**Promise:** every occurrence and every operator in the input can be found by these labels. A test checks this for every node type.

### 3. Node specifications
Each node type has one specification describing how it is written: its parts, its operators, its brackets and its spoken description. Adding fractions, powers or the logical connectors means adding one specification and one section in `math-layout.css`, not edits across the renderer. This is the "presentation-specification registry" the Composition Contract anticipated.

### 4. Decoration happens afterwards
Selection, hover, eligibility, preview marks and navigation markers are added after rendering, by finding elements through the resolver. The renderer never paints a state. This is what lets the preview host and the feedback layer work the same way for every feature.

### 5. Partial rendering
For future windows, the renderer can draw any subtree. It receives enough context about the parent to keep notation correct, for example whether brackets are needed because the subtree sits inside a product.

### 6. Inert rendering
With `inert`, the output has no focusable or draggable parts. Previews use this instead of each adding their own class and pointer rules.

### 7. Words on the page
The renderer describes what a part **is**, for screen readers, such as "factor a" or "sum". What a part **does**, such as "click selects", is added by the interaction layer.

### 8. Boundaries
The renderer may import notation rules (`operatorMetadata.js`), exact number formatting and node factories. It may not import rules, the interaction layer or application state. The dependency test enforces this.

## Moving to the standard

**Progress (11 November 2026):** steps 2 (label-promise test), 3 (dead options) and 4 (selection painting) are done. Step 5 is done for distribution: its preview is a tree decoration in its rule bundle. Equality's inserted-operand marks are still drawn by `applyVisualRoles`. R1 is done (11 November 2026); equation sides that are sums or products got their own box on 12 November 2026. Equality's marks (step 5) and interaction wording (step 7) moved out on 12 November 2026. Steps 6 and 8 were done on 12 November 2026.


| Step | Work | Finished when |
|---|---|---|
| 1 | Owner approves this standard | |
| 2 | Write the label promise as a test for every node type | Test passes on today's renderer, or lists the gaps |
| 3 | Delete dead options and drop slots | No visual change |
| 4 | Move selection and combine-target painting to the feedback layer | Screenshots and computed styles identical |
| 5 | Build the preview host (preview standard) and move distribution's preview there | Renderer no longer imports a rule; `distributionPreview` and `distributionHover` gone |
| 6 | Introduce node specifications, one node type at a time | **Done** (12 November 2026): `js/view/rendering/nodeSpecs.js`; 0 computed-style differences across 176 states |
| 7 | Move interaction wording out | Screen-reader text still covered by tests |
| 8 | Add `inert` and partial rendering | **Done** (12 November 2026): `js/view/rendering/inert.js` (replaces three copies), `renderExpression(..., { inert, context })`; tests in `tests/view/rendering/inert-and-partial.test.js`; 0 computed-style differences |

Steps 3 and 4 can happen before the preview host; step 5 is the grouping and preview work.

## Decide (owner)

1. **Decided (owner, 11 November 2026): every nested sum and product gets its own box, invisible until hovered.** At rest the page looks as before; hovering its operator or a gap lights that sum or product, not the enclosing bracket (this fixes D8). How many outlines show at rest becomes an *outline policy*, a future advanced setting (see [Future Features](../../05_Roadmap/Future_Features.md#outline-policies-owners-idea-11-november-2026)). Original question: should every `Add` and `Multiply` get its own box, so it can be selected and dragged like any other part? The Composition Contract says every occurrence should be addressable, but adding boxes changes the layout and how drags land. Proposed: make every occurrence addressable now (labels and keyboard navigation), and decide on visible boxes separately with screenshots.
2. **Decided (owner, 11 November 2026): option B, a wider hit area drawn by CSS. Built 12 November 2026, touch screens only (owner: 44 px on touch only).** Who owns hitbox size and shape?

   **The problem today:** the layout box *is* the hitbox. `.term` has `min-width: 58px; padding: 8px 13px`, but a nested occurrence has `min-width: 0; padding: 3px 5px`. So hit size and the spacing of the mathematics can't be changed separately, and nested parts have small touch targets.

   **The rule:** an invisible pseudo-element extends each part's hit area without moving the layout:
   ```css
   [data-hitbox-role="occurrence"]::before,
   [data-hitbox-role="operator"]::before {
     content: "";
     position: absolute;
     inset: calc(-1 * var(--hit-extra));
   }
   ```

   | Who | Decides |
   |---|---|
   | Renderer | Which boxes exist, and their labels |
   | `math-layout.css` | Spacing between parts |
   | `hitboxes.css` | Hit-area size (`::before`, `--hit-extra` from `tokens.css`), and which area wins where two overlap |
   | `feedback.css` | Outlines and highlights only |
   | Router | Which labelled part was hit; it never measures for this |

   **Where areas overlap:** an operator wins over an operand, and a deeper part wins over its parent. This is done with `z-index` by depth, so the browser's own hit testing gives the answer.

   **Checked by:** the visual safety net, which must show that the mathematics doesn't move when `--hit-extra` changes.

   **Still to settle when this is built:** the smallest target size (for example 44px on touch screens), and whether a parent part stays clickable in the gaps between its children.

   **Option C** (a separate measured hit layer) stays possible later, if a 2-D layout needs shapes CSS can't draw.
3. **Decided (owner, 11 November 2026): as proposed.** Assigned values beside symbols (the small `=0.1` badge): keep it as a renderer display choice, or treat it as a decoration added afterwards? Proposed: a display choice, since it shows mathematics rather than a state.

## Not in this draft

Two-dimensional notation itself (fractions, powers, matrices), italic constants such as `i`, line breaking for long expressions, and windows. The standard leaves room for each.
