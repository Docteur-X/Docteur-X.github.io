# Display and interaction model (draft)

**Status: draft for owner review, 10 November 2026. Not implemented or approved.** The owner found the line between the Renderer and the Interaction layer muddier than wanted, and stressed that interactivity is essential. This draft describes the whole journey from the stored mathematics to what the student sees and touches. The [renderer standard draft](Renderer_Standard_Draft.md) and [preview standard draft](Preview_Standard_Draft.md) describe single stages of it.

## In plain words

Think of a puppet show.
- **The script** is the mathematics (the expression tree in the Engine). It is the truth, and nobody on stage may change it.
- **The stage plan** says where each puppet stands and which ones can be picked up. It is made from the script, but it is not yet the show.
- **Building the stage** turns the plan into real puppets the audience can see.
- **The measuring tape** records where every puppet ended up, once, so nobody has to keep measuring during the show.
- **The puppeteer's hands** are the interaction: noticing what the student touches, working out what they mean, and asking whether the script allows it.
- **Lighting and props** are the feedback: glows, selections, drag ghosts and previews. They are added on top and taken away again, and they never move the puppets.

Interactivity is not added as an afterthought: the stage plan already says, for every part, what it is and whether it can be touched. The puppeteer decides what touching it does.

## The stages

| Stage | Plain name | Owns | Must not |
|---|---|---|---|
| 1. Mathematics | The script | The expression tree and the rules (Engine) | Know about the screen |
| 2. Layout model | The stage plan | A screen-free description of the notation: boxes, symbols, operators, brackets and nesting, each tagged with its identity in the tree and with its **affordances**, meaning what it is and what can be done with it (an occurrence that can be selected or dragged, an operator that can be a drop target, something focusable) | Decide what an action does, or whether a rule applies |
| 3. Mounting | Building the stage | Turning the layout model into page elements and CSS classes; updating only what changed | Paint states, or attach behaviour to individual elements |
| 4. Geometry map | The measuring tape | Where each identity ended up on screen, measured once after layout, and kept until something moves | Decide meaning |
| 5. Interaction | The puppeteer's hands | Input (pointer, touch, keyboard) → finding the target by identity → gesture recognisers → the coordinator asks the Engine → the arbiter picks → commit or preview | Change the tree directly, or measure the page during a drag |
| 6. Decoration | Lighting and props | Selection, hover, eligibility glows, drag ghosts, preview marks and navigation markers, applied by identity on a separate layer | Move or resize the mathematics, or change the tree |

**The key boundary:** stage 2 says *what can be touched*; stage 5 decides *what touching does*. Behaviour is attached once per view, by listening at the top and looking up the identity and affordance of whatever was touched, not by wiring each element separately. This is how interactivity is generated together with the display without the renderer knowing any rule.

## Where today's code sits

| Stage | Today |
|---|---|
| 1 | `js/core`, `js/operations`, `js/relations`; the live tree still sits in `state` in `app.js` |
| 2 | Does not exist separately: `domRenderer.js` goes straight from tree to page, deciding notation and some interaction wording at once |
| 3 | `domRenderer.js` rebuilds the whole equation on every change |
| 4 | Drag geometry is snapshotted at the start of a drag (`hitTesting.js`); overlays measure separately (the grouping bug) |
| 5 | Recognisers, arbiters and the coordinator exist, but much of the flow is in `app.js`, with listeners on many elements |
| 6 | The Visual Feedback Controller handles some roles; the renderer still paints selection and combine targets; previews each do their own thing |

## The owner's six ideas, placed

| Idea | Stage | Note |
|---|---|---|
| 1. Update only affected subtrees | 3 | Compare the old and new layout models by identity; replace only changed parts. Engine rules already keep the IDs of unchanged parts, which makes this possible |
| 2. Separate meaning, presentation and geometry | 1, 2, 4 | This model *is* that separation |
| 3. Cache layout and geometry | 4 | One measurement after each mount, kept until a change, resize or scroll. Drag already does this; everything else should use the same map |
| 4. A structured layout model | 2 | Fractions, matrices and integrals become layout node types with their own notation specifications; hitboxes and feedback work on them unchanged |
| 5. Keep ghosts, selection and previews separate | 6 | One decoration layer keyed by identity; the preview host is part of it |
| 6. Benchmarks and diagnostics | All | Measure before redesigning. The renderer inspector (`?rendererInspector=1`) is a start |

## Order

1. **Measure first (idea 6).** Add a small benchmark: render, re-render after one rule, and pointer movement during a drag, at 20, 100 and 400 terms. The audit's rough figures (88 ms click, 253 ms drag move at 400 terms, including test overhead) suggest no urgency, so the changes below are for clarity first, speed second.
2. **Decoration as one layer (idea 5)** together with the preview standard: selection and combine-target painting leave the renderer.
3. **Geometry map (idea 3)** shared by hit testing, overlays and the preview host.
4. **Layout model (ideas 2 and 4)** introduced behind the current renderer, one node type at a time, with the visual safety net checking each step. The first two-dimensional notation is the natural moment to finish it.
5. **Partial updates (idea 1)** once the layout model exists, if the benchmark shows it is worth it.

## Decide (owner)

1. **Is the layout model worth its own stage now,** or only when the first two-dimensional notation arrives? Proposed: define its shape now, in the renderer standard, and build it gradually.
2. **Behaviour attached once per view** (listening at the top) instead of on each element: agree as the rule for the Interaction layer? Proposed: yes; today's per-element listeners move over gradually.
3. **Should the measuring tape (geometry map) be the only place allowed to measure the page?** Proposed: yes, with a test that forbids measuring elsewhere during gestures.
