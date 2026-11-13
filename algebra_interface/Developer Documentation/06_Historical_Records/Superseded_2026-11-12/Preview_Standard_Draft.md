# Preview standard (draft)

**Status: approved in principle by the owner, 10 November 2026, including the four proposals under "Decided". Not implemented.** It depends on the renderer's standard, reviewed separately; the questions it raises for the renderer are listed at the end.

## In plain words

When a student asks for something like "put brackets around b and c", the software first shows what the result would look like, and the student confirms or cancels. That is a preview.

Today each kind of step builds its own preview in its own way, like six shops each making their own receipts. So the same mistakes keep turning up in different places: buttons that push the equation down, brackets drawn on top of other symbols, slightly different colours for the same idea.

The standard makes previews work like a single receipt printer that every shop shares:
- **Each step only says what is new.** For example: "the brackets around b and c are new". It says nothing about how to draw it.
- **One shared piece of the software does all the showing.** It draws the result as real mathematics, colours the new parts amber in the same way every time, puts Confirm and Cancel where they never move anything, and handles the keyboard, cancelling and tidying up.

The benefit: fixing a preview problem fixes it for every step, and adding a new kind of step needs no new preview code.

## Principle

A feature supplies only its mathematics. One shared **preview host** does everything else, the same way for every feature. A new preview should need no new display code, no new mode flag, no new event listeners and no new CSS.

## Scope

A **preview** shows a proposed transformation that the student must confirm or cancel before anything changes. It is distinct from:
- **gesture feedback**, such as glowing drop targets or the rearrangement preview during a drag, which belongs to the feedback layer;
- **immediate** rules, such as numeric combination, which commit without a preview.

Whether a rule uses a preview comes from the feature registry's `confirmationMode`. Later, teaching policy may change it (see the [blueprint](../../02_Architecture/Architecture_Blueprint.md)); the host only follows what it is told.

## How previews work today

| Preview | How it is shown | Its own description format | Its own state |
|---|---|---|---|
| Grouping | Measured overlay above the equation | `selectedNodeIds`, `bracketStyle` | `groupingMode`, `groupingPlan` |
| Negation | Candidate replaces the equation (`negationInlinePreview.js`) | `insertedNodeIds`, `insertedOperatorOwnerIds`, `label` | lease variable |
| Factorisation | Candidate or explanatory copy replaces the equation, with arrows (`transformationPreview.js`) | `sourceNodeIds`, `resultNodeId` | `factorisationMode`, plan, proposal |
| Distribution | Drawn by the renderer from a rule-specific option | `sourceNodeId`, `targetSumId`, `highlightedNodeIds` | `distributionPreview` |
| Identity | Candidate overlaid; original hidden but kept for hit testing | `introducedNodeIds`, `confirmationNodeId` | none shared |
| Equality | Renderer adds `equality-inserted-operand` from `visualRoles` | `insertedOperandIds` | own lifecycle |

**Already shared:** the coordinator's proposal, the single-use commit lifecycle (`transformationCommitLifecycle.js`), the modal lease (`viewMode.preview` in `js/view/viewMode.js` since stage 2; formerly `modalPreviewOwnership.js`), confirmation targets (`previewConfirmationTargets.js`) and the shared feedback roles.

**Duplicated:** `previewCoordinator.js` is a second, older proposal lifecycle used only by tests.

The consequences are bugs that repeat: grouping's envelope is measured before its controls appear, factorisation's row moves the equation the same way, and amber has four looks.

## Words used here

| Word | Meaning |
|---|---|
| Proposal | What the coordinator returns: a detached candidate tree, never committed |
| Preview description | A small, DOM-free description of what the student should notice, supplied by the feature |
| Preview host | One per view. Shows a description, takes the lease, handles confirm and cancel |
| Mark | One addressed part of the candidate with a feedback role, such as "this `-1` is new" |

## What a feature supplies: the preview description

One shape for every feature, replacing today's six:

```js
{
  ruleId: 'grouping.range',
  label: 'Group b and c',                 // short, student-facing
  marks: [                                // what to notice
    { address: { nodeId: 'node-41' }, role: 'proposed-insertion' },
    { address: { operatorOwnerId: 'node-12', operatorIndex: 1 }, role: 'proposed-insertion' }
  ],
  confirmTargets: 'marked',               // or a list of addresses
  explanation: null                       // optional, from a fixed list of kinds
}
```

- **Addresses** name parts of the candidate tree by occurrence ID or operator, never by pixels or DOM elements. The renderer turns them into elements.
- **Roles** come only from the shared feedback vocabulary. A feature cannot invent a look.
- **Confirm targets** default to the marked parts, so clicking what is new confirms it.
- **Explanations** are optional teaching aids from a short, shared list, for example provenance arrows from source occurrences to a result. A feature picks a kind and supplies addresses; the host draws it. New kinds are added to the standard, not to a feature.
- The description is a pure function of the proposal, so it can be unit-tested without a browser.

## What the host guarantees

| Area | Guarantee |
|---|---|
| Display | Renders the candidate tree with the normal renderer, in place of the equation, so layout makes room for new parts. Nothing is measured or overlaid |
| Inertness | The candidate cannot be dragged or edited; only confirm targets respond |
| Marks | Applied through the Visual Feedback Controller, so every proposal of the same role looks the same |
| Controls | Confirm and Cancel, with the label, in a region that cannot move the equation |
| Keyboard | Enter or Space on a confirm target confirms; Escape cancels; focus moves into the preview and returns sensibly afterwards |
| Ownership | Takes the view's lease on open and always releases it, in every exit path |
| Commit | Confirms only through the shared single-use lifecycle, which rejects stale proposals |
| Cancellation | Closes on Escape, Cancel, an object switch, a history jump, a rebuilt expression, or the source changing underneath it |
| Cleanup | Every exit (confirm, cancel, stale, failure, teardown) restores the committed view, even if one cleanup step throws |
| Motion | Respects reduced-motion settings |
| Announcements | Tells screen readers what is proposed, and when it is confirmed or cancelled |

**Lifecycle:** closed, then open, then exactly one of confirmed, cancelled, stale or failed, then closed again. Only one preview is open per view.

## What a feature must not do

- touch the DOM, CSS classes or event listeners for its preview;
- keep its own preview mode flag in application state;
- create its own buttons, overlays or confirmation handlers;
- pass rule-specific options to the renderer.

## How it fits the other layers

- **Engine and coordinator:** produce the proposal. Unchanged.
- **Feature visual adapter (`*Visual.js`):** becomes the function that returns the preview description.
- **Visual Feedback Controller:** paints the marks.
- **Renderer:** renders the candidate and resolves addresses.
- **`app.js`:** creates one host per view and passes it proposals; it loses each feature's preview code.
- **Future windows:** one host per window. It must work when a window shows only part of an expression.

## Moving to the standard

| Step | Work | Finished when |
|---|---|---|
| 1 | Owner approves this standard | |
| 2 | Settle the renderer questions below | Renderer standard agreed |
| 3 | Build the host, with contract tests using a fake renderer | Every guarantee above has a test |
| 4 | Move grouping onto it | The 44 px gap, bracket overlap and equation jump are gone; grouping's overlay preview code is deleted |
| 5 | Move negation, then factorisation | Their own preview modules are deleted |
| 6 | Distribution, identity and equality, one at a time | Renderer receives no rule-specific options |
| 7 | Retire `previewCoordinator.js` and per-feature modes | One lifecycle, no feature mode flags |

Each step is checked by the browser suite and the visual safety net, whose states include every preview.

## Decided (owner agreed with all four proposals, 10 November 2026)

1. **Clicking outside a preview** cancels it, consistently for every preview, because the student's attention has moved.
2. **Controls** go in a reserved area of the window's frame, kept even when empty, so they never move or cover mathematics.
3. **What disappears** can be shown by any preview, as an optional shared explanation (as factorisation does now with faded factors and arrows).
4. **Several new parts:** clicking any of them confirms.

## Questions for the renderer review

Answered by the [renderer standard draft](Renderer_Standard_Draft.md).

The host cannot keep its promises unless the renderer can:
1. address every occurrence and operator, so any mark has an element;
2. render a candidate tree in an inert mode, as a standard option rather than a per-feature class;
3. render only part of a tree, for future windows;
4. accept generic roles instead of rule-specific options such as `distributionPreview`, `distributionHover` and `combineTargetId`;
5. let explanations, such as arrows, find element positions after layout, without the renderer knowing about explanations.
