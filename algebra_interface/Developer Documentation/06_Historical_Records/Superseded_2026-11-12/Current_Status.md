# Current Status — Manipulator

## 12 November 2026: gap selection

**Gap selection (owner, 12 November 2026):**
- **A click or tap on a gap or operator of a nested sum or product selects that sum or product,** e.g. `b c` in `a+(b c)`. `gapOwner(target)` in `app.js` finds it: the target's closest occurrence box is the R1 `.nested-operation` box.
- **Such a press no longer picks up the enclosing bracket for dragging.** The bracket is still dragged from its brackets and edges. This is the same rule as for nested parts like the `y` in `−y`.
- **Its selection shows as a ring** (`feedback.css`), because the box has no border.
- **Test:** in `e2e/view/hover-ownership.spec.js`.

| Evidence | Result |
| --- | --- |
| Node tests | 673/673 |
| Browser tests | 142/142 |
| Screenshots | 176/176 |

## 12 November 2026: stage 5, R2 touch hit areas

**Stage 5, R2 (12 November 2026): touch hit areas.**
- On a touch screen (`@media (pointer: coarse)`), every part of the live equation has a tap area of at least `--hit-min` (44 px, in `tokens.css`). It is drawn by an invisible `::before` centred on the part, so the layout never moves.
- **Overlaps are settled by the browser's own hit testing:** a deeper part wins over its parent, and an operator wins over a neighbouring operand (`z-index: 1`).
- **Desktop pointers are unchanged.**
- **New test:** `e2e/view/touch-hit-areas.spec.js`, run on an emulated touch screen and on a desktop pointer.
- **Decided (owner):** clicking a gap selects the parent (see gap selection above).

| Evidence | Result |
| --- | --- |
| Node tests | 673/673 |
| Browser tests | 141/141 |
| Screenshots | 176/176 (desktop pointer; unchanged) |

## 12 November 2026: stage 5, part 2b

**Stage 5, part 2b (12 November 2026): the renderer draws mathematics and labels only.**
- **5f:** equality's amber inserted-operand marks are a decoration in the equality bundle; `applyVisualRoles` is gone from the renderer.
- **5g:** the renderer labels what a part *is* ("Addend: a", "minus sign"). What it *does* comes from the rules' gesture declarations, through two new optional fields: `spoken` (screen-reader words) and `hint` (tooltip). `js/view/actionWording.js` applies them to every rendering, via `renderMath` in `app.js`. The words are unchanged, and a test pins them.
- **Stage 5 is complete (12 November 2026).** The last item, the equation-side R1 gap, is closed: a sum or product that is a whole side of an equation has its own invisible `.equation-side` box (tested in `e2e/view/equation-side-box.spec.js`; screenshots unchanged). **Stage 6 started (12 November 2026):** (6a) the shared `state` is split by owner in `js/app/applicationState.js`: `documentState` (tree, history, assigned values), `viewState` (selection, last click, symbol-panel drafts, sign display) and `preferences` (theme); (6b) the 17 rule extension lists and the rule context's `register*` functions live in `js/app/ruleExtensions.js`. (6c) the page controls are wired in `js/app/ui/panelControls.js` (expression form, symbol values, display choices, selection toolbar, clipboard, history) and `js/app/workspace/workspaceControls.js` (object and document buttons); `app.js` passes only named actions, and a test forbids `dom.*.addEventListener` in it. (6d) documents, objects, saving, import and export live in `js/app/workspace/workspaceSession.js`, which owns document state only and reaches the view through hooks (`dismissPreviews`, `cancelInteraction`, `beforeObjectLoad`, `afterObjectLoad`, `setStatus`, `confirm`); a test keeps it free of view, rule and interaction imports. Unused imports were removed from `app.js`. (6e) the ordinary drag (pickup, following the pointer, the exits) lives in `js/view/drag/ordinaryDragView.js`, its collaborators passed in by name; `tests/architecture/free-names.test.js` checks that every name a moved module uses is declared or imported. (6f) `app.js` no longer decides anything by feature name. The bracket toolbar (Wrap, Remove, double-click toggle) moved to `js/rules/grouping/explicitBrackets.js` and now commits a copy through `commitTransformation` (it used to edit the live tree in place); the equation's true/false status moved to the equality bundle; preview checks became `viewMode.isPreview()` / `isIdle()`; the rules supply the selection label and hints (`registerSelectionLabel`, `registerSelectionHint`, with `fallback`), what double-click does (`registerSelectionActivate`), and the clipboard commands (`clipboard.arming`, `clipboard.apply`); confirm targets share `data-preview-confirm`, and rule controls near the selection carry `data-selection-control`. Intended behaviour changes (decision 1.2, one answer): during ANY preview the bracket and Copy buttons are disabled, a touch tap does not select, and the hover outline shows only on a confirm target. New browser test: `e2e/rules/grouping/explicit-brackets.spec.js`. Feature words left in `app.js` are the eight install lines, the `dragging:factor` mode name and comments. (6g) history (`js/view/historyView.js`), the symbol panel (`js/app/ui/symbolPanel.js`), the multi-selection and general selection toolbar (`js/view/selectionView.js`) and the equation's input routes (`js/view/equationSelectionRoutes.js`, before the rules' routes, and `js/view/equationRoutes.js`, after them) moved out, each a factory whose collaborators are passed in by name. Each module is created at its old position, so the router's order is unchanged: `e2e/view/route-order.spec.js` compares the live route table with `e2e/view/route-order.json` (192 lines, identical before and after). Shared `let` flags became small objects (`touch.tap`, `outsideClick.suppress`). (6h) rendering (`js/view/equationView.js`) and the rule context (`js/app/ruleContext.js`) moved out. **Stage 6 is complete:** `app.js` is 639 lines (2,249 at the start of stage 6, 3,448 at version 628); it creates the modules in dependency order, installs the eight bundles and binds the controls. New guards: `tests/architecture/free-names.test.js` (every moved module's names are defined; the whole module graph of `app.js` parses and links in Node) and `e2e/view/route-order.spec.js`. **Stage 7 is complete (12 November 2026); the rebuild plan is finished.** The owner chose "same to both sides": drag a term of an equation across = and a preview adds its opposite to both sides (`a+b=c` gives `a+b+−b = c+−b`, the new terms in amber); confirm commits one step, and cancelling `b+−b` is a separate step. It lives entirely in `js/rules/both-sides/` (engine, rule, inline preview, install), plus one line in `js/rules/bundles.js` and its section in `css/previews.css`. Building it first removed two hidden couplings: (7a) the feature registry, the gesture declarations and `app.js` each listed the rules (now one list, `js/rules/bundles.js`); (7b) the shared drop arbiters hard-coded the known drop-target kinds, so a new bundle's drop was silently refused (now any registered kind becomes a generic `rule-drop`; `tests/view/drag/rule-drop-arbitration.test.js`). The undefined-name check now scans every rule file by itself (and handles `//` inside strings, re-exports, getters and multi-name declarations). How to add a rule: [Adding a transformation](Adding_a_Transformation.md). Follow-up (12 November 2026): a single-term side (the `x` of `x = 2y+3`) can now be dragged across too, and parts carry `sideTerm`, so the rule's "what can I do here?" declaration matches exactly the terms it accepts. **Cancel-opposites rule (12 November 2026), the second rule built only as a bundle** (`js/rules/cancel-opposites/`, plus one line in `js/rules/bundles.js`; no routes, no CSS): drag a term onto its opposite in the same sum; it glows green with "b + −b = 0", and releasing commits one step immediately (like numeric combination), leaving one `0` in the place of the first term. Removing the `0` is numeric combination's existing step. Opposites are compared by structure, ignoring IDs, explicit brackets and product notation (`2x` and `−(2x)` cancel); numeric pairs are left to numeric combination, so the two rules never claim the same drop. The whole "move a term across" story is one browser test (`e2e/rules/cancel-opposites/cancel-opposites.spec.js`: `a+b=c` → `a+b+−b=c+−b` → `a+0=c+−b` → `a=c+−b`). It needed no framework change. Found while building it: a rule's `drop` that throws used to fail silently (the page error reached only the console); the shared drag view now catches it, clears the drag and tells the student nothing changed. This closes lesson 9's open item for rule drops. **Derived-rule check (12 November 2026):** `tests/engine/derived-rule-chains.test.js` proves through the real rules that cancel-opposites gives the same result as its six-step justification (negation expand, identity ×1, range grouping, factorisation, adding 1 + −1, and 0·x = 0, which numeric combination already had). The student-facing parts (show why, earn the shortcut, a general derived-rule contract) are recorded in [Future Features](../../05_Roadmap/Future_Features.md). Inert and partial rendering (step 8) are done: `js/view/rendering/inert.js` is the one rule for unfocusable copies (used by the drag ghost, the factorisation ghost and the rearrangement preview, which each had their own copy), and `renderExpression(subtree, { context: { parent, index } })` keeps the brackets a subtree needs. `{ inert: true }` is available to previews; the negation and identity previews still manage their own confirmation targets. R2 option B, gap selection and node specifications (step 6, `js/view/rendering/nodeSpecs.js`: one entry per node type; the page came out identical, 0 computed-style differences) are done.

| Evidence | Result |
| --- | --- |
| Node tests | 673/673 |
| Browser tests | 139/139 |
| Screenshots | 176/176 |
| Computed styles | Against the R1 step: differences only on the `+` inside the rearrangement preview copy (`position: relative`), which is the D9 fix taking effect; nothing else |

## 11 November 2026: stage 5, D9 and D10 fixed

**Stage 5, D9 and D10 (11 November 2026):**
- **D9 fixed:** the rearrangement preview and drag ghosts are copies attached to `<body>`, and they now carry `.math-scope`. The hitbox layout rules select `.math-scope` instead of `.equation`, so nested boxes keep their size in the copies. A stylesheet test forbids `.equation`-scoped hitbox rules.
- **D10 fixed by R1:** dragging `−1` onto a bracket's `+` now offers distribution. It has a browser test.
- **Lessons 6–8** are in Known Issues.

| Evidence | Result |
| --- | --- |
| Node tests | 672/672 |
| Browser tests | 139/139 (new `e2e/view/drag-copies-and-precedence.spec.js`) |
| Screenshots | 176/176 |

## 11 November 2026: stage 5, part 2a (R1 and the D8 fix)

**Stage 5, part 2a (11 November 2026): R1 and the D8 fix.**
- **R1:** a sum or product nested inside brackets or after a minus now has its own occurrence box (`span.term.nested-operation`, with `data-node-id`, `data-parent-id` and `data-hitbox-role="occurrence"`). It is invisible and layout-neutral at rest. It is not a tab stop; the structure navigator reaches it. A sum or product that is a whole side of an equation has the same kind of box (`.equation-side`, 12 November 2026).
- **D8 fixed:** hovering the `+` or a gap inside brackets now lights that sum or product, not the whole bracket. During a drag or a preview, no ordinary hover glow shows. The view mode now publishes its kind as `data-view-mode` on the equation, and both CSS and the JavaScript hover resolver show the nested box's hover only when the view is idle.
- **One CSS rule widened carefully:** `.term:has(.term:hover):hover`, which cancels a parent's hover glow, now leaves feedback states alone: selection, drop targets and preview marks. Without that, the new box made it wipe the amber distribution target.
- **Owner's idea recorded:** outline policies, an advanced setting, in Future Features.

| Evidence | Result |
| --- | --- |
| Node tests | 671/671 (label promise now requires nested boxes; view-mode `onChange`) |
| Browser tests | 137/137, including the new `e2e/view/hover-ownership.spec.js`. `structure-navigation.spec.js` was updated: a nested Add is no longer "content-only", as R1 intends |
| Screenshots | 176/176. Four reference screenshots were deliberately updated (term-hovered, in light/dark × visible/hover): the gap inside `(b c)` now lights the product, not the bracket. All other states, including every resting state, are unchanged |
| Computed styles | Not comparable element-by-element with version 628 any more: the new wrapper box shifts every path beneath it, so the tool reports added and removed elements. The screenshots above are the check for this step |

## 11 November 2026: stage 5, part 1 (a renderer that paints no state)

**Stage 5, part 1 (11 November 2026): the renderer paints no state and imports no rule.**
- **5a, the label promise:** `tests/view/rendering/renderer-labels.test.js` checks that every occurrence and every operator is findable by its labels, across 17 expressions covering every node type. The R1 gap (a nested sum or product with no box of its own) is listed explicitly, so it can only shrink. A shared stand-in DOM is in `tests/helpers/fakeDom.js`.
- **5b, dead options removed:** `drag`, `insertionIndex`, `combineTargetId`, `combineParentType` and `distributionHover` were always `null`. `makeDropSlot`, the `.drop-slot` CSS and the `--slot-bg` token are gone too.
- **5c, selection is a decoration:** the renderer no longer adds `is-selected`. `js/view/selectionDecoration.js` marks the selected occurrence by its `data-node-id` on the detached tree, before it is mounted.
- **5d, distribution's preview has left the renderer:** `js/rules/distribution/previewDecoration.js` draws the amber copies and the source and target marks on the rendered tree, found by label, through the new `registerTreeDecoration`. The renderer no longer imports `operations/distribution.js`.

**Still in the renderer, for stage 5 part 2:**
- equality's inserted-operand marks (`applyVisualRoles`);
- interaction wording such as "Arrows reorder; click selects";
- node specifications, inert and partial rendering;
- R1 (a box for every nested sum and product), R2 option B (CSS hit areas), and the D8 fix.

| Evidence | Result |
| --- | --- |
| Node tests | 670/670 (18 new label-promise and decoration tests) |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | Lines naming a rule in the renderer: distribution 2 (−25), combination 1 (−4); the rest are comments and labels. `app.js` 2,216 lines |

## 11 November 2026: stage 4 done (equality moved; every rule is a bundle)

**Stage 4 is done (11 November 2026): every rule owns its behaviour.** Equality was the last to move. `js/rules/equality/` owns:
- the = sign's arming menu and the clipboard application preview (`controller.js`, moved from `interaction/`; its three document listeners are now router routes, and the renderer is passed in);
- the commit, and the Swap (symmetry) button;
- `gesture.js` and `visual.js`.

`js/rules/` now holds 8 bundles: negation, rearrangement, numeric-combination, identity, grouping, distribution, factorisation and equality. `app.js` installs each with one line, and has no pointer or key listener of its own on the equation, `document` or `window`.

**What still names a rule outside its bundle** (for stages 5 and 6):
- the renderer: distribution's amber copies and the `distributionPreview` option;
- the shared drag snapshot: distribution's `+` signs, and `drag.distributionPlan` in `app.js`;
- the selection toolbar: `updateGroupToolbar`, single-node Wrap and Remove;
- the hover-outline and touch-tap checks, and the precedence list in `intentArbitration.js` (kept there deliberately).

**One small ordering change:** the equality menu now closes from a router route that runs after the selection route. So a Ctrl/Cmd+click that toggles a term's selection while the menu is open no longer also closes the menu.

| Evidence | Result |
| --- | --- |
| Node tests | 651/651 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | `app.js` 2,227 lines, down from 3,448 (−1,221, about 35%). Lines per rule in `app.js`: negation 4, rearrangement 9, identity 11, combination 15, equality 18, factorisation 24, distribution 26, grouping 34 (was 36–130 each). The interaction layer is +771 lines, mostly bundle documentation and the rule context |

**Next:** stage 5, a clean renderer (and the D8 fix with R1).

## 11 November 2026: stage 4, factorisation moved

**Stage 4, rule 7 (11 November 2026): factorisation is a bundle.** `js/rules/factorisation/` owns:
- the factorisation toolbar;
- the amber extraction zone and arrows (`overlay.js`);
- the factor drag (a selected factor into the zone; view-mode owner `factor`), with its own routes;
- the result preview, through the shared `interaction/transformationPreview.js`;
- commit, outside click and Escape.

`dropArbitration.js`, `gesture.js` and `visual.js` moved there too. `state.factorisationPlan` and `state.factorisationProposal` are gone.

**The rule context gained:**
- `registerSelectionToolbar`, `registerSelectionHint` and `registerSelectedPickup({ accepts, start })`;
- `on(name, fn)` for named events: `beforeObjectLoad`, `historyAppend` and `abandonDrags`.

A rule may now also import the `teaching/` layer.

| Evidence | Result |
| --- | --- |
| Node tests | 651/651 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences. The grouping and factorisation overlays are now both created at install time, in the original order |
| Coupling report (advisory) | `app.js` 2,364 lines (−1,084 since 628). Factorisation lines in `app.js`: 24 (−106) |

**Next in stage 4:** equality (done, see above).

## 11 November 2026: stage 4, distribution moved

**Stage 4, rule 6 (11 November 2026): distribution is a bundle.** `js/rules/distribution/` owns:
- the drop target `distribution` (a factor onto the `+` of a neighbouring bracket);
- keyboard D;
- the amber preview, its commit, the copy animation, the curved arrows (`arrows.js`, moved from `ui/`), its outside click and its Escape.

`gesture.js` and `visual.js` moved there too. `state.distributionPreviewPlan` is gone; the bundle keeps the plan itself.

**Every drop-target kind is now validated by its own rule**, through `ruleTarget(kind)`. The shared drag modules no longer name any rule's validator.

**The rule context gained** `renderEquation`, `registerRenderOptions`, `registerAfterMount`, `registerResize` and `registerObjectLoad`. A drop target's `enterStatus` may now be a function of the drag.

**Still outside the bundle, for stage 5:**
- the renderer draws the amber copies from the `distributionPreview` render option, which the bundle supplies;
- the shared drag snapshot (`ordinaryDragGeometry.js`) finds the eligible `+` signs and their plans at pick-up;
- `app.js` sets `drag.distributionPlan` from that snapshot.

| Evidence | Result |
| --- | --- |
| Node tests | 651/651 (the drag-adapter tests were rewritten: one fewer, because distribution's named adapter is gone) |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 0 differences from the grouping step, which differed from version 628 only in the overlay order |
| Coupling report (advisory) | `app.js` 2,662 lines (−786 since 628). Distribution lines in `app.js`: 27 (−71). The renderer still has 27 (stage 5) |

**Next in stage 4:** factorisation (done, see above).

## 11 November 2026: stage 4, grouping moved

**Stage 4, rule 5 (11 November 2026): range grouping is a bundle.** `js/rules/grouping/` owns:
- the grouping preview (enter, confirm, cancel, re-open on a bracket-style change);
- the blue envelope overlay (`overlay.js`);
- its Confirm and Cancel buttons, its outside click and its Escape.

Its files moved there: `intentArbitration.js`, `overlay.js`, `gesture.js` and `visual.js`.

**The multi-selection stays in `app.js`,** because factorisation uses it too: the selection model, the selection toolbar and `paintRangeSelection`. Grouping reaches it only through new rule-context services:
- `selectedIds()`, `clearMultiSelection()`, `updateSelectionToolbar()`, `paintSelection()`;
- `registerSelectionDecoration({ paint, refresh, clear, reset })`;
- `registerCommand(name, fn)`. The toolbar's "Preview grouping" runs `ruleCommands.get('grouping.range')`.

`state.groupingPlan` is gone; the bundle keeps the previewed plan itself.

| Evidence | Result |
| --- | --- |
| Node tests | 652/652 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19 million values compared with version 628. The only difference: the grouping and factorisation overlays (two `<div>`s at the end of `<body>`, `z-index` 40 and 48) now come in the opposite order, because the grouping overlay is created when its bundle is installed. No value changed; stacking follows `z-index`, so nothing on screen differs |
| Coupling report (advisory) | `app.js` 2,844 lines (−604 since 628). Grouping lines in `app.js`: 35 (−92). What remains is mainly the shared selection toolbar, plus hover and touch checks for stage 5 |

**Next in stage 4:** distribution (done, see above).

## 11 November 2026: stage 4, identity moved

**Stage 4, rule 4 (11 November 2026): identity (+0 and ×1) is a bundle.** `js/rules/identity/` owns:
- the toolbar pick-up;
- the drag (view-mode owner `identity-tool`);
- target highlighting;
- the preview (owner `identity`), with Confirm, Cancel, the amber click and the outside click;
- its Escape handling.

Its files moved there: `dropArbitration.js`, `toolPreview.js`, `dragFeedback.js`, `gesture.js` and `visual.js`.

The rule context gained `ui(name)` (a rule's own controls outside the equation), `createEquationElement`, `isContextChangeControl`, `consumeOutsidePreviewClick`, `registerEscape` and `registerActivity`. `commitTransformation` now also passes through `transformation` and `kind`.

`app.js`'s drag and Escape routes ask the generic `ruleOwnsView()` instead of naming identity.

| Evidence | Result |
| --- | --- |
| Node tests | 652/652 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | `app.js` 3,009 lines (−439 since 628). Lines in `app.js`: identity 11 (−91; the rest are unrelated words such as "node identity") |

D8's fix is deferred to stage 5 (owner); its cause and lessons are in Known Issues.

**Next in stage 4:** grouping (done, see above).

## 11 November 2026: stage 4, rearrangement and numeric combination moved

**Stage 4, rules 2 and 3 (11 November 2026): rearrangement and numeric combination are bundles.**
- **`js/rules/rearrangement/`** owns reordering by drag (drop-target kind `insert`) and by the arrow keys. It holds `gesture.js`, `propose.js`, `visual.js`, `commitCandidate.js` and `pointerExit.js`, moved from `manipulator/` and `interaction/`.
- **`js/rules/numeric-combination/`** owns number-onto-number combination (drop-target kind `combine`). It holds `gesture.js` and `commitCandidate.js`.
- **The shared drag geometry still *suggests* gaps and siblings.** The rule that owns that kind of target now decides (`accepts`, `canTarget`), validates (`validate`) and commits (`drop`). `executeOrdinaryDragExit` has one generic path for every rule target, and only distribution's own case is left.
- **The rule context gained** `substitutions()`, `setSelectedNode()`, `renderHistory`, `syncInput`, `render(animate)` and `registerOccurrenceKey(action, handler)`. The occurrence keyboard route now hands rule keys to that registry.
- **The shared drag modules name no moved rule:** combine and insert pass through `ruleTarget(kind)` like negation's target. Only distribution keeps a named adapter, `canDistribute`, until it moves.
- **`tests/architecture/live-adapter-imports.test.js`** now checks that every file calling a live adapter imports it, in `app.js` and every rule's `install.js`.

| Evidence | Result |
| --- | --- |
| Node tests | 652/652 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | `app.js` 3,195 lines (−253 since 628, −208 since negation's move). Lines in `app.js`: rearrangement 10 (−28), combination 16 (−20), negation 5 (−51) |

**Next in stage 4:** identity (done, see above).

## 11 November 2026: stage 4 started (negation moved into its bundle)

**Stage 4 has started (11 November 2026): negation is the first rule bundle.** `js/rules/negation/` holds everything about negation's interaction:
- **`rule.js`** (pure): its registry entries and gesture declarations. `transformationFeatureAssembly.js` and `gestureDeclarations.js` now include these instead of listing negation themselves.
- **`install.js`:** `installNegation(ctx)` registers its routes (the minus-sign shield, click and Enter to expand, Escape), its preview host, and its drop target (−1 onto a neighbour). It uses only the **rule context**, a set of generic services that `app.js` gives every rule: the view, view mode, router, `propose`, source stamps, `createPreviewHost`, `commitTransformation`, `registerDropTarget` and so on. These are listed at the top of `install.js`.
- **Its own helpers,** moved there: `gesture.js`, `visual.js`, `activation.js`, `operatorArbitration.js`, `compressionTarget.js` and `inlinePreview.js`.
- **`app.js`** now mentions negation 5 times, down from 56, and its only call is `installNegation(ruleContext)`.
- **The shared drag modules no longer name negation.** A rule's drop-target kind passes through `ruleTargetKinds`, `rules.ruleTarget(kind)` and `target.ruleOwned`. The precedence list in `intentArbitration.js` still lists `'negation-compress'`, because that is the one agreed place for precedence.
- **`tests/architecture/rule-bundle-boundaries.test.js`:** a rule may import only its own folder, the Engine and shared interaction helpers. Other code may use a rule only through its `index.js` or `rule.js`. One known exception remains: `input/semanticInput.js` imports `rules/negation/gesture.js`.

| Evidence | Result |
| --- | --- |
| Node tests | 652/652 |
| Browser tests | 135/135 |
| Screenshots | 176/176 match version 628. A first run under heavy machine load (41 minutes instead of about 1) reported 30 differences; on a re-run with the load gone, all matched, and computed styles were identical |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | Negation lines in `app.js`: 5 (−51 since 628). `app.js` is 3,403 lines (−45 since 628, −99 since stage 3). The interaction layer is larger, because the bundle carries its own documentation and the rule context is new |

**Next in stage 4:** rearrangement and numeric combination (done, see above).

## 11 November 2026: stage 3 done (one router per view)

**Stage 3 is done (11 November 2026): one router per view.** `js/view/inputRouter.js` is the only place the equation view listens to pointer and key input:
- **Routes:** `app.js`'s 23 pointer, click and key listeners on the equation, its parent, `document` and `window` are now 23 named routes in one table. They run in the order declared, and the router adds one native listener per place and event. `window.manipulatorDiagnostics.routes()` lists them.
- **One mode check:** each route says which modes it runs in (`modes: 'idle'`, `'preview:grouping'`, `'dragging:identity-tool'` and so on), and the router checks this in one place.
- **One outside-click rule:** a click outside any preview cancels it and is consumed (`consumeOutsidePreviewClick`). Context changes are exempt, because they dismiss previews themselves: workspace navigation, Build, history, Duplicate and Import.
- **"What can I do here?":** `js/app/gestureDeclarations.js` declares every registered rule's gestures as data. `js/view/partFromElement.js` reads a part from the renderer's labels and the tree, and `inputRouter.gesturesFor(part)` answers the question, offering nothing while the view isn't idle. A test keeps the declarations complete.
- **Still elsewhere** (moving with their rules in stage 4): listeners inside `equalityInteractionController.js`, `structureNavigator.js` and the preview modules' own buttons. The hover-outline routes and the drag move/release routes still contain their own mode checks.

**Defect found and fixed by the new strict test:** during a distribution or identity-tool preview, a click outside the preview cancelled it *and* performed the clicked action. For example, clicking Multi-select both closed the preview and turned multi-select on. This broke decision 1.2. Grouping and factorisation already consumed that click; now every preview does.

| Evidence | Result |
| --- | --- |
| Node tests | 650/650 (new router and gesture-declaration tests) |
| Browser tests | 135/135, including the new `e2e/view/strict-preview-mode.spec.js` (13 tests: keys, a drag and toolbar buttons during negation, grouping, factorisation and distribution previews, plus "what can I do here?") |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | `app.js` 3,502 lines (+54 since 628, +70 since stage 2), interaction layer +336 since stage 2. The routes carry headers, mode lists and comments, and the router and declarations are new. The reduction is expected in stage 4, when routes move into rule bundles |

**Next:** stage 4, rules own their behaviour.

## 11 November 2026: stage 2 done (one mode per view)

**Stage 2 is done (11 November 2026): one mode per view.** `js/view/viewMode.js` is now the one answer to "what is this view doing?":
- **Removed:** `state.drag`, `state.factorDrag`, `state.groupingMode`, `state.factorisationMode`, the identity tool's `identityDrag` and `identityPreviewModal`, the separate preview registry (`modalPreviewOwnership.js`) and the interaction gate (`mathematicalInteractionGate.js`).
- **Renamed:** `state.distributionPreview` is now `state.distributionPreviewPlan`, which is data for the renderer only.
- **Drags** are held by `viewMode.beginDrag(owner, record)` and `endDrag`; read them with `ordinaryDrag()`, `factorDrag()` and `identityDrag()` in `app.js`.
- **Previews** hold the mode through `viewMode.preview`, the same lease interface the preview host already used. The host now ends the mode *before* clearing its presentation.
- **Every "can something start?" check** is `viewMode.isIdle()`. Checks made during the student's own drag use `viewMode.isPreview()`. Several checks that used to miss some previews now block during every preview, as decision 1.2 requires.

| Evidence | Result |
| --- | --- |
| Node tests | 637/637 (3 gate tests merged into `tests/view/view-mode.test.js`; new view-mode and host-order tests) |
| Browser tests | 122/122 after each of steps 2a–2e |
| Screenshots | 176/176 match version 628 |
| Computed styles | 19,051,200 values compared with version 628: 0 differences |
| Coupling report (advisory) | `app.js` 3,432 lines (−16). Lines in `app.js`: factorisation 114 (−16), grouping 110 (−17), distribution 85 (−13), identity 98 (−4). The interaction layer grew by 58 lines, because `viewMode.js` is new and well commented |

**Next:** stage 3 (done, see above).

## 11 November 2026: stage 1 drafted

The [interaction standards](Interaction_Standards_Draft.md) (notation, view mode, gesture declaration, rule bundle, renderer labels) are drafted. The owner decided 0.1 (drag the minus to change notation), 0.2 (notation steps stored; history can skip them), 0.3 (division as `Invert`, with a real, locked leading 1), 1.1 (`armed` mode, plus menus later), 1.2 (strict: nothing but confirm and cancel during a preview) 2.1 (six gesture kinds to start, extendable) and 2.2 (a "what can I do here?" framework). 3.1, 3.2, R1 and R3 are agreed as proposed, and R2 is option B (a CSS hit area that doesn't move the layout). **Stage 1 is complete on paper.** The owner's focus palette idea is recorded for after stage 7. Docs only; no code changed.

## 11 November 2026: stage 0 of the rebuild plan

| Evidence | Status |
| --- | --- |
| Code base | Version 628 (End-to-End Architecture Handover), now a Git repository. The baseline commit holds 628 exactly as received |
| Node tests | 628/628 (the 3 coupling-ratchet tests from stage 0 were removed: the report is advisory) |
| Browser tests | 122/122 on version 628 and again after stage 0 (run here on 11 November 2026, four workers, on a temporary port) |
| Documentation links | All relative links valid after archiving the increment notes |
| Coupling | Advisory starting numbers in `scripts/coupling-baseline.json`. `app.js` is 3,448 lines; the interaction layer is 9,220. Features need 36–130 lines each in `app.js` ([table](Rebuild_Plan.md#how-progress-is-measured)) |
| Production code | Unchanged from 628. Stage 0 changed docs, one script, one test and `package.json` only |

**Next:** stage 3 (one router per view); stage 2 is done, see above. The 8 November ledger below is historical; the [handover](HANDOVER_CURRENT.md) is the current guide.

## Earlier ledger (8 November 2026, historical)

**As of 8 November 2026: T3-1 through T3-10 owner-accepted; T3 closure review completed; T4 read-only inventory completed; T4-1 to T4-4 accepted by the owner; T4-4 fixed the quick-release defect D7, the first T4 production change, and the owner reported 91/91 browser tests. T4-5 (read-only keyboard inventory) is recorded. The owner decided that interface design (functionality, invariants, contracts) comes before any interaction changes; further T4 work is postponed meanwhile. Agreed so far: a student without a pointer must still be able to use the project, and keyboard shortcuts should serve pointer users too. Contracts and keys are not yet designed. The owner's [architecture blueprint](../../02_Architecture/Architecture_Blueprint.md) is recorded as the target. A source review then recorded open defects, now D3–D6 (D1, D2 and D7 fixed; in [Known Issues](../../05_Roadmap/Known_Issues.md)); the owner has deferred them in favour of architecture work.** The most recent complete application baseline is the T3-10 code, carried unchanged through the T3 closure handover and this documentation reconciliation. Neither changes production JavaScript or tests.

## Verification and acceptance ledger

| Evidence | Status |
| --- | --- |
| Original Phases 0–5 / Phase 5F | Accepted historical product baseline. |
| T1 inventory and T2 test organization | Completed; T2 browser acceptance reported by owner (77/77 historical baseline). |
| T3-1 through T3-10 | Each independently accepted by owner in chat, most recently T3-10. |
| Latest Node regression suite | 453/453 after rejection reasons and the mutation probe fix (Node 24; CI uses Node 22). `npm run test:mutation` reports the mutation killed. |
| Documentation link check | 362 relative links valid after this reconciliation. |
| Source review | Every file in `js/` read and suspected defects probed; D3–D6 recorded. Historical records and test bodies were not reviewed. |
| Node test discovery | 75 Node test files; 420 executed tests at T3-10. |
| Browser suite | 103 tests in 42 files, 103/103 after exact numbers; also after stylesheet step 2 (on a temporary port). Before that, three ten-worker runs 103/103 after the shared drop-target role. The original 77 tests in 39 files were independently run for the first time (8 November 2026, Windows, Chromium): one worker 3/3 runs clean; 10 workers 4/6 runs clean, 2 runs with one different intermittent failure each. T4-1 traced one failure to a test click blocked by the open menu and removed that overlap (audited); later ten-worker runs through T4-2 were all 77/77; the other failure remains unexplained. See [T4-1](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md). |
| Production JS after T3 | Changed only by T4-4: `dragFeedback.js` and `app.js`. `styles.css` changed in interaction steps 1 and 2; `operatorMetadata.js`, `parser.js` and `domRenderer.js` in step 2; `identityTool.js`, `identityDragFeedback.js`, `visualFeedbackController.js`, one line of `app.js` and `styles.css` for the shared roles. `styles.css` then split into `css/` with no rule text changed. |
| Stylesheet file split | 354 rules moved with identical text. Computed styles identical to the original at widths 1440, 640 and 390 (about 13 million values per width, 104 of 112 states at 390); 112 screenshots identical. |
| Exact numbers | Numbers are exact rationals (`js/engine/rational.js`), fixing D3 and D4. 103/103 browser tests; 176 screenshots identical and computed styles identical (19 million values). Checked in the running app: `1234567890123 + 1` combines to `1234567890124`, and `0.1 + 0.2 = 0.3` with assigned values is TRUE. Older saved numbers still load, read exactly. |
| Stylesheet step 2 | CSS, tests and test tools only; no production JS. Compared with step 1 across 176 states (168 at width 390): the only displayed differences are the two hover-mode changes below; other differences are on undisplayed elements. Six screenshots differ, all from those two changes. The owner has not yet checked them. |
| Production JS throughout T3 | 95/95 production JS modules reported byte-identical between T3-1 and T3-10. |
| Phase 6 and guided architecture tour | Deliberately deferred. |

## T3 quality work — completed

| Batch | Result |
| --- | --- |
| T3-1 | Ten distribution interaction/lifecycle cases reviewed and retained. |
| T3-2 | Two mathematical distribution tests strengthened. |
| T3-3 | Three factorisation tests strengthened. |
| T3-4 | One range-grouping provenance test strengthened. |
| T3-5 | Two equality-function tests strengthened. |
| T3-6 | Three identity-insertion tests strengthened. |
| T3-7 | One negation test strengthened and one longer-product compression test added. |
| T3-8 | One history generated-ID test strengthened. |
| T3-9A | Serialization review: tests retained unchanged after assessing low-value overlap. |
| T3-9B | Two autosave regression tests added (queued-write ordering; failure must not clear dirty state). |
| T3-10 | One multi-target semantic resolver test added. |

**Net:** 13 existing tests strengthened, four justified Node regression tests added (416 → 420), no test removals/mergers, no production-code changes. Selected families were audited; this does **not** imply every test assertion in the repository has been individually reviewed. Mutation probes demonstrated that several previously surviving regressions are now detected. Test count reduction was never a goal.

## Current priorities (owner, 8 November 2026)

Add to and adjust the software in careful increments, in this order of attention:

1. **Rule interactions:** check whether each existing rule's interaction is satisfactory and adjust it if not. This also stress-tests the architecture: interaction changes should not require Engine changes, and boundaries and contracts must never be broken.
2. **Interface clean-up:** the interface is crowded; assign functions and buttons to settings, the toolbar and so on.
3. **Windows and Documents:** start thinking about how they look and interact, how to display parts of large Mathematical Objects, and what a Mathematical Object is and how it is represented.

The [interaction review draft](../../05_Roadmap/Future_Features.md) records the items and order; steps 1 and 2 are implemented and await the owner's check.

**Current work:** the stylesheet tidy is implemented: file split, dead rules, duplicates, tokens, amber and green paint in one file, and simpler hover-mode rules. Two visible hover-mode changes await the owner's check: keyboard focus outlines and the green "Release to negate" target now show. Decisions still open are in [Rendering and Interaction](Rendering_and_Interaction.md#still-open). After that: the grouping preview.

**Latest audit:** the [architecture audit](../../02_Architecture/Architecture_Blueprint.md#architecture-audit-9-november-2026) of 9 November 2026 rates the foundation good, and recommends moving gesture and view state out of `app.js` as the next architecture project after the grouping preview. Its priorities are recommendations, not approved work.

**Designing now:** a shared [preview standard](Preview_Standard_Draft.md) (draft), approved in principle, and a [renderer standard](Renderer_Standard_Draft.md) (draft), before the grouping fix. Owner's working principle: create standards for important layers and boundaries, and build every feature within them.

**Under discussion:** the owner is shaping the Engine around Statement + History, exact numbers and logic: [draft, not approved](../../02_Architecture/Engine_Statements_Draft.md). If adopted, it comes before the Window design and before moving view and gesture state out of `app.js`.

**On pause, not abandoned:** Phase 6, T5, further T4 work and teaching policy. It is too early to settle these; deciding now would close doors rather than strengthen the architecture. Return when the owner says so. Defects D5–D6 remain recorded in Known Issues and are not to be fixed unasked.

## Engineering boundaries

Source code is authoritative for current behaviour; tests provide bounded evidence; living docs describe approved intent/status; historical docs explain prior decisions. Keep mathematical correctness, student agency, stable AST IDs, view-local preview ownership, transaction safety, branching history, offline persistence, accessibility and future noncommutative types central. Any production defect found during test maintenance requires a separate, approved narrow fix.

See [AI Handover](AI_Handover.md), [T3–T5 Plan](../../04_Testing/T3_to_T5_Test_Quality_Execution_Plan.md), and [Known Issues](../../05_Roadmap/Known_Issues.md).

**Division D1 and D2 done (12 November 2026; design: [Division as Invert](Division_Invert_Design_Draft.md)).** The `Invert` node: typed as `÷` or `/`, shown as `÷` inside the divisor's own box (`[÷b]` moves as one factor, dragged by its ÷ sign; pressing the `b` inside selects the `b`, as with `−b`), saved, MathJSON `["Power", x, -1]`, exact values, no value for division by zero. The leading-1 rule (`js/engine/divisionInvariant.js`) runs on every proposal and every commit, so the owner's table works with no rule-specific code: `[÷b]` to the front gives `1÷b×a×c`, the 1 moved away brings a new 1 (`1÷b×a×c×1`), and the 1 dropped onto a factor is refused (locked). Numeric division: `6÷2 → 3`, `1÷3 → 1/3`; division by zero and `0·a÷b → 0` (needs `b ≠ 0`, stage D3) are refused. Notation: a factor after anything ending in a division always gets a visible sign (`6÷2·x`), a fraction-valued divisor is bracketed (`a÷(2/3)`), and the parser refuses `6÷2x` as ambiguous while `6÷2 x` (with a space) means `6÷2×x` (owner, 12 November 2026; a structured input mode and a teacher option are recorded in Future Features). Safety net: `tests/engine/division-value-preservation.test.js` applies every action of seven rules to eleven division expressions and checks the value is kept, no ÷ is left bare and the result reads back; it found three real bugs on its first run (fixed). Also `tests/engine/division-core.test.js` and `e2e/engine/division.spec.js`. **D3 done (12 November 2026):** `b÷b = 1` (new bundle `js/rules/cancel-inverses/`) and `0·a÷b = 0` both record the assumption `b ≠ 0`, kept on the history step (`event.assumptions`, saved with the document) and shown in history and on the status line; assumptions are a general mechanism (`ctx.commitTransformation({ …, assumptions })`). Dragging a `÷` factor now uses the normal product reorder preview (no insertion bar), with the leading 1 shown in the preview when it goes first. Next candidates: the Engine standard (below), stacked fractions (D4), and "show why" for derived rules.


**Engine standard designed, not built (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Owner decisions: types, operators, relations, rules and interactions are each a **definition object** in its own folder plus one line in a registry; rules declare the properties they require and types provide them, so a rule needing several properties (reorder needs associative and commutative) is offered only where all hold; every rule names an interaction, shared across types. Binary operations have three forms: `BinaryAdd` (the axiom, nesting shown as `(a+b)+c`), `SequentiallyApply` (written `a+b+c`, for any binary operator, with a declared direction: left to right by default, right to left for powers, so `a^b^c` means `a^(b^c)`; an operator with no agreed reading opts out, so `a×b×c` for vectors is refused with "write the brackets") and `Add` (everyday addition, only where `+` is associative; today's `Add` node already is this, so no migration). Stages E1–E3, then I1 (interaction definitions; owner, 12 November 2026), then E4–E5 are in the draft; `Add` is defined as `BinaryAdd` applied left to right but stored as a list, so ordinary steps cost the same as today; open decisions are listed at its end. Next: the owner's answers, then E1.

**Engine stage E1 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `js/engine/nodeRegistry.js` describes every node type as data (category, the relation a statement states, where its children live, meaning and notation fields); tree walking, normalisation, equality, invariants, ID reservation, the division invariant and the drag and `sideTerm` checks now ask it, through `isRelationNode`, `childEntries` and the other helpers, instead of naming `Equal`. `js/engine/canonicalText.js` writes and reads the canonical text form (`a÷b` is `Multiply(a, Invert(b))`). `FunctionCall` became `Apply { operator, arguments }`. Relations keep their own stored type names (`Equal`), so saved documents are unchanged. Two equations now compare structurally. A guard test forbids comparing with `'Equal'` outside the `=` rules. Next: E2, the table-driven parser and printer.

**Engine stage E2 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `js/engine/notation.js` holds every written sign as a row: infix levels (`+ -` build `Add`, `× * · ⋅ ÷ /` build `Multiply`, with `-` giving `Negate` and `÷` giving `Invert`), juxtaposition with its rules and the `6÷2x` refusal, prefix signs, brackets, `=`, reserved signs and the print rows, each with its own error messages. `js/engine/parser.js` reads the table and names no sign or node type (checked by a test). Behaviour is unchanged: a frozen copy of the old parser (`tests/helpers/legacyParser.js`) must agree with the new one on about 6,000 inputs, trees and error messages alike, with associativity on and off (`tests/engine/parser-equivalence.test.js`). Owner decision: `Equal` keeps its own type; a natural `Equal` chain (`a = b = c`) and a `BinaryEqual` will follow the `Add` / `BinaryAdd` pattern, since equality is an equivalence relation. Next: E3, type, operator and relation definitions.

**Engine stage E3 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Types, operators and relations are definition objects, one folder each, in `js/definitions/types/`, `js/definitions/operators/` and `js/relations/`, with registries and checking helpers (`js/definitions/define.js`). Defined now: the scalar type (a field), `Add`, `Multiply`, `Negate`, `Invert`, `Group`, the axioms `BinaryAdd` and `BinaryMultiply`, `SequentiallyApply`, and the relation `equal`. Each operator carries its own notation rows and precedence; `js/engine/notation.js` only assembles them. Properties come from the type through `js/engine/structures.js`; the old flags ask it, and their setters became a lesson override. Rules declare `requires` (for example, reorder needs commutativity) and the coordinator checks it. The coupling report and the import-boundary guard now count the new folders as Engine. No behaviour change: the E2 parser oracle and every suite pass. Next: I1, interaction definitions.

**Stage I1 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** The six gestures (`activate`, `drag`, `drag-between`, `drop-tool`, `command`, `key`) are interaction definitions in `js/definitions/interactions/`. The input router reads them and checks each rule declaration against the gesture's fields. `Add` and `Multiply` describe their own on-screen presentation (classes, labels, sign styles), and `js/definitions/operators/presentation.js` answers for them, so the renderer, drag code, preview and views no longer name node types; a guard test keeps it so. The ÷ factor is found by a `data-sign-inside` mark. The router's "imports nothing" test now allows exactly the interaction registry, which is data. Next: E4 (identity rules as data, the generic both-sides rule, `<`).

**Stages E4a and E4b done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Owner decisions: a defined function is typed `\sin(x)`, brackets always; for an inequality multiplied by an unknown sign the student will be asked (E4d); identities are written as data; statements that split into cases, and undefined values that stay but stop interacting, are recorded in Future Features. Built: `\sin`, `\cos`, `\tan`, `\ln`, `\exp` as operator definitions, read and drawn (the name upright, each argument in its own box). Identity rules as data (`defineIdentity`, `js/engine/patterns.js`, one generic bundle `js/rules/identities/`) with `sin.addition` and `cos.addition`: tap the function name to expand, tap the `+` to collapse, both previewed. A route-name clash (lesson 13) is now caught by a Node test. Next: E4c (`<` and `>` as relation folders; the generic both-sides rule).

**Stage E4c done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `<` and `>` are relation definitions, one folder each (`js/definitions/relations/less/`, `js/definitions/relations/greater/`), registering their own node types; nothing outside their folders names them (a test checks). They read, print, convert to MathJSON and draw with their own sign. The both-sides rule serves every relation (`relation: 'acted-on'`): dragging a term across `<` adds its opposite to both sides and keeps `<`. The `=` operation menu is mounted only on equations until E4d brings multiplying both sides of an inequality, with the student asked when the sign is unknown.

**Clean-up plan written (12 November 2026; [Clean-up plan](Cleanup_Plan.md)).** The owner asked for the code to be made as neat as a fresh engineer would make it; the plan cleans in place, in eight steps (C1 names, C2 one candidate preview, C3 leftovers, C4 drag folder, C5 folders by layer, C6 tests by subject, C7 unused code, C8 documentation), each with no visible change and a check against recurrence. It waits for the owner's approval and three decisions. E4c is committed; E4d follows the clean-up.
