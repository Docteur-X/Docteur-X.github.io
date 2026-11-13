# Manipulator — authoritative AI/developer handover

**Direction (owner, 11 November 2026):** follow the [rebuild plan](Rebuild_Plan.md). **Stage 0 is done:**
- the project is a Git repository based on version 628;
- the 89 increment notes are archived in [Increment_Notes_to_628](../Increment_Notes_to_628/README.md);
- `npm run report:coupling` shows how far each feature is spread. It's one advisory measure of complexity, not a requirement.

**Stage 1 is drafted:** the [interaction standards](Interaction_Standards_Draft.md) cover notation, view mode, gesture declaration, rule bundle and renderer labels. Every item is decided, so stage 1 is complete on paper.

**Stage 2 is done (11 November 2026): one mode per view.** `js/view/viewMode.js` is now the one answer to "what is this view doing?":
- **Removed:** `state.drag`, `state.factorDrag`, `state.groupingMode`, `state.factorisationMode`, the identity tool's `identityDrag` and `identityPreviewModal`, the separate preview registry (`modalPreviewOwnership.js`) and the interaction gate (`mathematicalInteractionGate.js`).
- **Renamed:** `state.distributionPreview` is now `state.distributionPreviewPlan`, which is data for the renderer only.
- **Drags** are held by `viewMode.beginDrag(owner, record)` and `endDrag`; read them with `ordinaryDrag()`, `factorDrag()` and `identityDrag()` in `app.js`.
- **Previews** hold the mode through `viewMode.preview`, the same lease interface the preview host already used. The host now ends the mode *before* clearing its presentation.
- **Every "can something start?" check** is `viewMode.isIdle()`. Checks made during the student's own drag use `viewMode.isPreview()`. Several checks that used to miss some previews now block during every preview, as decision 1.2 requires.

**Stage 3 is done (11 November 2026): one router per view.** `js/view/inputRouter.js` is the only place the equation view listens to pointer and key input:
- **Routes:** `app.js`'s 23 pointer, click and key listeners on the equation, its parent, `document` and `window` are now 23 named routes in one table. They run in the order declared, and the router adds one native listener per place and event. `window.manipulatorDiagnostics.routes()` lists them.
- **One mode check:** each route says which modes it runs in (`modes: 'idle'`, `'preview:grouping'`, `'dragging:identity-tool'` and so on), and the router checks this in one place.
- **One outside-click rule:** a click outside any preview cancels it and is consumed (`consumeOutsidePreviewClick`). Context changes are exempt, because they dismiss previews themselves: workspace navigation, Build, history, Duplicate and Import.
- **"What can I do here?":** `js/app/gestureDeclarations.js` declares every registered rule's gestures as data. `js/view/partFromElement.js` reads a part from the renderer's labels and the tree, and `inputRouter.gesturesFor(part)` answers the question, offering nothing while the view isn't idle. A test keeps the declarations complete.
- **Still elsewhere** (moving with their rules in stage 4): listeners inside `equalityInteractionController.js`, `structureNavigator.js` and the preview modules' own buttons. The hover-outline routes and the drag move/release routes still contain their own mode checks.

**Stage 4 has started (11 November 2026): negation is the first rule bundle.** `js/rules/negation/` holds everything about negation's interaction:
- **`rule.js`** (pure): its registry entries and gesture declarations. `transformationFeatureAssembly.js` and `gestureDeclarations.js` now include these instead of listing negation themselves.
- **`install.js`:** `installNegation(ctx)` registers its routes (the minus-sign shield, click and Enter to expand, Escape), its preview host, and its drop target (−1 onto a neighbour). It uses only the **rule context**, a set of generic services that `app.js` gives every rule: the view, view mode, router, `propose`, source stamps, `createPreviewHost`, `commitTransformation`, `registerDropTarget` and so on. These are listed at the top of `install.js`.
- **Its own helpers,** moved there: `gesture.js`, `visual.js`, `activation.js`, `operatorArbitration.js`, `compressionTarget.js` and `inlinePreview.js`.
- **`app.js`** now mentions negation 5 times, down from 56, and its only call is `installNegation(ruleContext)`.
- **The shared drag modules no longer name negation.** A rule's drop-target kind passes through `ruleTargetKinds`, `rules.ruleTarget(kind)` and `target.ruleOwned`. The precedence list in `intentArbitration.js` still lists `'negation-compress'`, because that is the one agreed place for precedence.
- **`tests/architecture/rule-bundle-boundaries.test.js`:** a rule may import only its own folder, the Engine and shared interaction helpers. Other code may use a rule only through its `index.js` or `rule.js`. One known exception remains: `input/semanticInput.js` imports `rules/negation/gesture.js`.

**Stage 4, rules 2 and 3 (11 November 2026): rearrangement and numeric combination are bundles.**
- **`js/rules/rearrangement/`** owns reordering by drag (drop-target kind `insert`) and by the arrow keys. It holds `gesture.js`, `propose.js`, `visual.js`, `commitCandidate.js` and `pointerExit.js`, moved from `manipulator/` and `interaction/`.
- **`js/rules/numeric-combination/`** owns number-onto-number combination (drop-target kind `combine`). It holds `gesture.js` and `commitCandidate.js`.
- **The shared drag geometry still *suggests* gaps and siblings.** The rule that owns that kind of target now decides (`accepts`, `canTarget`), validates (`validate`) and commits (`drop`). `executeOrdinaryDragExit` has one generic path for every rule target, and only distribution's own case is left.
- **The rule context gained** `substitutions()`, `setSelectedNode()`, `renderHistory`, `syncInput`, `render(animate)` and `registerOccurrenceKey(action, handler)`. The occurrence keyboard route now hands rule keys to that registry.
- **The shared drag modules name no moved rule:** combine and insert pass through `ruleTarget(kind)` like negation's target. Only distribution keeps a named adapter, `canDistribute`, until it moves.
- **`tests/architecture/live-adapter-imports.test.js`** now checks that every file calling a live adapter imports it, in `app.js` and every rule's `install.js`.

**Stage 4, rule 4 (11 November 2026): identity (+0 and ×1) is a bundle.** `js/rules/identity/` owns:
- the toolbar pick-up;
- the drag (view-mode owner `identity-tool`);
- target highlighting;
- the preview (owner `identity`), with Confirm, Cancel, the amber click and the outside click;
- its Escape handling.

Its files moved there: `dropArbitration.js`, `toolPreview.js`, `dragFeedback.js`, `gesture.js` and `visual.js`.

The rule context gained `ui(name)` (a rule's own controls outside the equation), `createEquationElement`, `isContextChangeControl`, `consumeOutsidePreviewClick`, `registerEscape` and `registerActivity`. `commitTransformation` now also passes through `transformation` and `kind`.

`app.js`'s drag and Escape routes ask the generic `ruleOwnsView()` instead of naming identity.

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

**Stage 5, part 2a (11 November 2026): R1 and the D8 fix.**
- **R1:** a sum or product nested inside brackets or after a minus now has its own occurrence box (`span.term.nested-operation`, with `data-node-id`, `data-parent-id` and `data-hitbox-role="occurrence"`). It is invisible and layout-neutral at rest. It is not a tab stop; the structure navigator reaches it. A sum or product that is a whole side of an equation has the same kind of box (`.equation-side`, 12 November 2026).
- **D8 fixed:** hovering the `+` or a gap inside brackets now lights that sum or product, not the whole bracket. During a drag or a preview, no ordinary hover glow shows. The view mode now publishes its kind as `data-view-mode` on the equation, and both CSS and the JavaScript hover resolver show the nested box's hover only when the view is idle.
- **One CSS rule widened carefully:** `.term:has(.term:hover):hover`, which cancels a parent's hover glow, now leaves feedback states alone: selection, drop targets and preview marks. Without that, the new box made it wipe the amber distribution target.
- **Owner's idea recorded:** outline policies, an advanced setting, in Future Features.

**Stage 5, D9 and D10 (11 November 2026):**
- **D9 fixed:** the rearrangement preview and drag ghosts are copies attached to `<body>`, and they now carry `.math-scope`. The hitbox layout rules select `.math-scope` instead of `.equation`, so nested boxes keep their size in the copies. A stylesheet test forbids `.equation`-scoped hitbox rules.
- **D10 fixed by R1:** dragging `−1` onto a bracket's `+` now offers distribution. It has a browser test.
- **Lessons 6–8** are in Known Issues.

**Any new copy of the mathematics outside `#equation` must carry `.math-scope`.**

**Stage 5, part 2b (12 November 2026): the renderer draws mathematics and labels only.**
- **5f:** equality's amber inserted-operand marks are a decoration in the equality bundle; `applyVisualRoles` is gone from the renderer.
- **5g:** the renderer labels what a part *is* ("Addend: a", "minus sign"). What it *does* comes from the rules' gesture declarations, through two new optional fields: `spoken` (screen-reader words) and `hint` (tooltip). `js/view/actionWording.js` applies them to every rendering, via `renderMath` in `app.js`. The words are unchanged, and a test pins them.
- **Stage 5 is complete (12 November 2026).** The last item, the equation-side R1 gap, is closed: a sum or product that is a whole side of an equation has its own invisible `.equation-side` box (tested in `e2e/view/equation-side-box.spec.js`; screenshots unchanged). **Stage 6 started (12 November 2026):** (6a) the shared `state` is split by owner in `js/app/applicationState.js`: `documentState` (tree, history, assigned values), `viewState` (selection, last click, symbol-panel drafts, sign display) and `preferences` (theme); (6b) the 17 rule extension lists and the rule context's `register*` functions live in `js/app/ruleExtensions.js`. (6c) the page controls are wired in `js/app/ui/panelControls.js` (expression form, symbol values, display choices, selection toolbar, clipboard, history) and `js/app/workspace/workspaceControls.js` (object and document buttons); `app.js` passes only named actions, and a test forbids `dom.*.addEventListener` in it. (6d) documents, objects, saving, import and export live in `js/app/workspace/workspaceSession.js`, which owns document state only and reaches the view through hooks (`dismissPreviews`, `cancelInteraction`, `beforeObjectLoad`, `afterObjectLoad`, `setStatus`, `confirm`); a test keeps it free of view, rule and interaction imports. Unused imports were removed from `app.js`. (6e) the ordinary drag (pickup, following the pointer, the exits) lives in `js/view/drag/ordinaryDragView.js`, its collaborators passed in by name; `tests/architecture/free-names.test.js` checks that every name a moved module uses is declared or imported. (6f) `app.js` no longer decides anything by feature name. The bracket toolbar (Wrap, Remove, double-click toggle) moved to `js/rules/grouping/explicitBrackets.js` and now commits a copy through `commitTransformation` (it used to edit the live tree in place); the equation's true/false status moved to the equality bundle; preview checks became `viewMode.isPreview()` / `isIdle()`; the rules supply the selection label and hints (`registerSelectionLabel`, `registerSelectionHint`, with `fallback`), what double-click does (`registerSelectionActivate`), and the clipboard commands (`clipboard.arming`, `clipboard.apply`); confirm targets share `data-preview-confirm`, and rule controls near the selection carry `data-selection-control`. Intended behaviour changes (decision 1.2, one answer): during ANY preview the bracket and Copy buttons are disabled, a touch tap does not select, and the hover outline shows only on a confirm target. New browser test: `e2e/rules/grouping/explicit-brackets.spec.js`. Feature words left in `app.js` are the eight install lines, the `dragging:factor` mode name and comments. (6g) history (`js/view/historyView.js`), the symbol panel (`js/app/ui/symbolPanel.js`), the multi-selection and general selection toolbar (`js/view/selectionView.js`) and the equation's input routes (`js/view/equationSelectionRoutes.js`, before the rules' routes, and `js/view/equationRoutes.js`, after them) moved out, each a factory whose collaborators are passed in by name. Each module is created at its old position, so the router's order is unchanged: `e2e/view/route-order.spec.js` compares the live route table with `e2e/view/route-order.json` (192 lines, identical before and after). Shared `let` flags became small objects (`touch.tap`, `outsideClick.suppress`). (6h) rendering (`js/view/equationView.js`) and the rule context (`js/app/ruleContext.js`) moved out. **Stage 6 is complete:** `app.js` is 639 lines (2,249 at the start of stage 6, 3,448 at version 628); it creates the modules in dependency order, installs the eight bundles and binds the controls. New guards: `tests/architecture/free-names.test.js` (every moved module's names are defined; the whole module graph of `app.js` parses and links in Node) and `e2e/view/route-order.spec.js`. **Stage 7 is complete (12 November 2026); the rebuild plan is finished.** The owner chose "same to both sides": drag a term of an equation across = and a preview adds its opposite to both sides (`a+b=c` gives `a+b+−b = c+−b`, the new terms in amber); confirm commits one step, and cancelling `b+−b` is a separate step. It lives entirely in `js/rules/both-sides/` (engine, rule, inline preview, install), plus one line in `js/rules/bundles.js` and its section in `css/previews.css`. Building it first removed two hidden couplings: (7a) the feature registry, the gesture declarations and `app.js` each listed the rules (now one list, `js/rules/bundles.js`); (7b) the shared drop arbiters hard-coded the known drop-target kinds, so a new bundle's drop was silently refused (now any registered kind becomes a generic `rule-drop`; `tests/view/drag/rule-drop-arbitration.test.js`). The undefined-name check now scans every rule file by itself (and handles `//` inside strings, re-exports, getters and multi-name declarations). How to add a rule: [Adding a transformation](Adding_a_Transformation.md). Follow-up (12 November 2026): a single-term side (the `x` of `x = 2y+3`) can now be dragged across too, and parts carry `sideTerm`, so the rule's "what can I do here?" declaration matches exactly the terms it accepts. **Cancel-opposites rule (12 November 2026), the second rule built only as a bundle** (`js/rules/cancel-opposites/`, plus one line in `js/rules/bundles.js`; no routes, no CSS): drag a term onto its opposite in the same sum; it glows green with "b + −b = 0", and releasing commits one step immediately (like numeric combination), leaving one `0` in the place of the first term. Removing the `0` is numeric combination's existing step. Opposites are compared by structure, ignoring IDs, explicit brackets and product notation (`2x` and `−(2x)` cancel); numeric pairs are left to numeric combination, so the two rules never claim the same drop. The whole "move a term across" story is one browser test (`e2e/rules/cancel-opposites/cancel-opposites.spec.js`: `a+b=c` → `a+b+−b=c+−b` → `a+0=c+−b` → `a=c+−b`). It needed no framework change. Found while building it: a rule's `drop` that throws used to fail silently (the page error reached only the console); the shared drag view now catches it, clears the drag and tells the student nothing changed. This closes lesson 9's open item for rule drops. **Derived-rule check (12 November 2026):** `tests/engine/derived-rule-chains.test.js` proves through the real rules that cancel-opposites gives the same result as its six-step justification (negation expand, identity ×1, range grouping, factorisation, adding 1 + −1, and 0·x = 0, which numeric combination already had). The student-facing parts (show why, earn the shortcut, a general derived-rule contract) are recorded in [Future Features](../../05_Roadmap/Future_Features.md). Inert and partial rendering (step 8) are done: `js/view/rendering/inert.js` is the one rule for unfocusable copies (used by the drag ghost, the factorisation ghost and the rearrangement preview, which each had their own copy), and `renderExpression(subtree, { context: { parent, index } })` keeps the brackets a subtree needs. `{ inert: true }` is available to previews; the negation and identity previews still manage their own confirmation targets. R2 option B, gap selection and node specifications (step 6, `js/view/rendering/nodeSpecs.js`: one entry per node type; the page came out identical, 0 computed-style differences) are done.

**Stage 5, R2 (12 November 2026): touch hit areas.**
- On a touch screen (`@media (pointer: coarse)`), every part of the live equation has a tap area of at least `--hit-min` (44 px, in `tokens.css`). It is drawn by an invisible `::before` centred on the part, so the layout never moves.
- **Overlaps are settled by the browser's own hit testing:** a deeper part wins over its parent, and an operator wins over a neighbouring operand (`z-index: 1`).
- **Desktop pointers are unchanged.**
- **New test:** `e2e/view/touch-hit-areas.spec.js`, run on an emulated touch screen and on a desktop pointer.
- **Decided:** clicking a gap selects the parent.

**Gap selection (owner, 12 November 2026):**
- **A click or tap on a gap or operator of a nested sum or product selects that sum or product,** e.g. `b c` in `a+(b c)`. `gapOwner(target)` in `app.js` finds it: the target's closest occurrence box is the R1 `.nested-operation` box.
- **Such a press no longer picks up the enclosing bracket for dragging.** The bracket is still dragged from its brackets and edges. This is the same rule as for nested parts like the `y` in `−y`.
- **Its selection shows as a ring** (`feedback.css`), because the box has no border.
- **Test:** in `e2e/view/hover-ownership.spec.js`.

**Previously planned (now mostly done):** equality's inserted-operand marks (`applyVisualRoles`), interaction wording out of the renderer, R2 option B (CSS hit areas), then node specifications, inert and partial rendering. New computed-style baselines should be captured from this commit, because the R1 wrapper shifts element paths. A new rule is a new folder in `js/rules/` with `rule.js`, `install.js` and `index.js`, plus one install line in `app.js`; follow any existing bundle. Factorisation will use the same selection services (decorations, commands). D8 is deferred to stage 5. Follow `js/rules/negation/` as the pattern. Add any service a rule needs to the rule context in `app.js` in a generic form, never named after the rule. Add a route only through `inputRouter.route(...)`, never with `addEventListener` on the equation, `document` or `window`.

**Ground rules:**
- Commit each step in Git (the owner asks for commits).
- Don't make small "extraction" refactors outside the plan's stages.
- Add no new mathematical features until stage 7.
- Aim to reduce complexity and improve the architecture. Don't force line counts down.

**Baseline:** Equality Escape Propagation Boundary (628 Node tests), full Playwright suite reported passing by the user on 2026-11-11. This increment is **documentation-only**; do not claim a fresh browser run. See [current architecture](ARCHITECTURE_CURRENT.md) and [three source-traced workflows](END_TO_END_TRANSFORMATION_WALKTHROUGH_628.md).

## What the project is for

An offline, student-directed algebra manipulator for learning *why* transformations are valid. Preserve mathematical correctness, student agency, stable occurrence IDs, source-stamped history/commit integrity, accessible and predictable previews, and extensibility to more mathematical structures. Avoid refactoring for line-count reduction alone; the rebuild plan reduces how far features are spread, measured by the coupling report.

## Current implementation status

- Mathematical rule proposals and semantic descriptions are separate from input geometry, DOM rendering, and history commits.
- Six deliberate preview families share `previewSessionHost.js` ownership but keep feature-specific presentation; immediate transformations use separate source-stamped commit lifecycles.
- `renderEquation()` delegates ordered DOM publication to `equationPresentationMount.js`; the grouping toolbar is published before measuring its fixed overlay.
- Explicit navigation dismisses previews through the context-change boundary; outside-click handlers must not swallow navigation actions.
- Negation and equality Escape handlers consume handled cancellation events so a single keypress does not also trigger the window selection fallback.
- Detached working/history snapshots and save acknowledgement boundaries have regression coverage.

## Where to begin a new session

0. Read [Lessons](../../03_Developer_Guides/Lessons.md): what went wrong before, and the rules that follow from it. Add a lesson whenever a mistake or defect teaches something new.
1. Read `ARCHITECTURE_CURRENT.md` and `END_TO_END_TRANSFORMATION_WALKTHROUGH_628.md`, then verify claims against source. Read historical notes only when investigating a particular decision.
2. Run `node scripts/run-node-tests.mjs` and `node scripts/check-documentation-links.mjs`; use `npx playwright test` in a browser-capable environment. Do not claim browser tests ran locally if they did not.
3. Trace the specific feature through semantic input → mathematical proposal → preview/commit gate → history publication → render and persistence. Identify the owner before changing code.
4. Preserve high-quality explanatory comments, tests, current documentation, and a clear handover for every meaningful production change. Discuss consequential design ambiguities rather than silently deciding.

## Remaining work and risks

The broad boundary review found no defect needing a refactor. The [coupling report](Rebuild_Plan.md#how-progress-is-measured) shows each rule still needs 36–130 lines in `app.js`, so new features aren't yet easy or predictable. Architectural work now follows the rebuild plan's stages. Within each stage, work stays **evidence-led**: investigate a reproducible ownership bypass, unsafe source/lease transition, or confusing dependency before extracting modules. Browser geometry, keyboard focus, multi-preview interactions and asynchronous persistence remain regression-sensitive. Future differential and clipboard interaction concepts are exploratory, not approved architecture. Return to mathematical/educational feature development when appropriate.

## Historical record

See [archived handover chronology](../Increment_Notes_to_628/HANDOVER_CHRONOLOGY_ARCHIVED.md) and [archived architecture chronology](../Increment_Notes_to_628/ARCHITECTURE_CHRONOLOGY_ARCHIVED.md). Their older “current” and “pending” claims are historical only. See also the [boundary review](ARCHITECTURAL_BOUNDARY_REVIEW_628.md).

**Division D1 and D2 done (12 November 2026; design: [Division as Invert](Division_Invert_Design_Draft.md)).** The `Invert` node: typed as `÷` or `/`, shown as `÷` inside the divisor's own box (`[÷b]` moves as one factor, dragged by its ÷ sign; pressing the `b` inside selects the `b`, as with `−b`), saved, MathJSON `["Power", x, -1]`, exact values, no value for division by zero. The leading-1 rule (`js/engine/divisionInvariant.js`) runs on every proposal and every commit, so the owner's table works with no rule-specific code: `[÷b]` to the front gives `1÷b×a×c`, the 1 moved away brings a new 1 (`1÷b×a×c×1`), and the 1 dropped onto a factor is refused (locked). Numeric division: `6÷2 → 3`, `1÷3 → 1/3`; division by zero and `0·a÷b → 0` (needs `b ≠ 0`, stage D3) are refused. Notation: a factor after anything ending in a division always gets a visible sign (`6÷2·x`), a fraction-valued divisor is bracketed (`a÷(2/3)`), and the parser refuses `6÷2x` as ambiguous while `6÷2 x` (with a space) means `6÷2×x` (owner, 12 November 2026; a structured input mode and a teacher option are recorded in Future Features). Safety net: `tests/engine/division-value-preservation.test.js` applies every action of seven rules to eleven division expressions and checks the value is kept, no ÷ is left bare and the result reads back; it found three real bugs on its first run (fixed). Also `tests/engine/division-core.test.js` and `e2e/engine/division.spec.js`. **D3 done (12 November 2026):** `b÷b = 1` (new bundle `js/rules/cancel-inverses/`) and `0·a÷b = 0` both record the assumption `b ≠ 0`, kept on the history step (`event.assumptions`, saved with the document) and shown in history and on the status line; assumptions are a general mechanism (`ctx.commitTransformation({ …, assumptions })`). Dragging a `÷` factor now uses the normal product reorder preview (no insertion bar), with the leading 1 shown in the preview when it goes first. Next candidates: the Engine standard (below), stacked fractions (D4), and "show why" for derived rules.


**Engine standard designed, not built (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Owner decisions: types, operators, relations, rules and interactions are each a **definition object** in its own folder plus one line in a registry; rules declare the properties they require and types provide them, so a rule needing several properties (reorder needs associative and commutative) is offered only where all hold; every rule names an interaction, shared across types. Binary operations have three forms: `BinaryAdd` (the axiom, nesting shown as `(a+b)+c`), `SequentiallyApply` (written `a+b+c`, for any binary operator, with a declared direction: left to right by default, right to left for powers, so `a^b^c` means `a^(b^c)`; an operator with no agreed reading opts out, so `a×b×c` for vectors is refused with "write the brackets") and `Add` (everyday addition, only where `+` is associative; today's `Add` node already is this, so no migration). Stages E1–E3, then I1 (interaction definitions; owner, 12 November 2026), then E4–E5 are in the draft; `Add` is defined as `BinaryAdd` applied left to right but stored as a list, so ordinary steps cost the same as today; open decisions are listed at its end. Next: the owner's answers, then E1.

**Engine stage E1 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `js/engine/nodeRegistry.js` describes every node type as data (category, the relation a statement states, where its children live, meaning and notation fields); tree walking, normalisation, equality, invariants, ID reservation, the division invariant and the drag and `sideTerm` checks now ask it, through `isRelationNode`, `childEntries` and the other helpers, instead of naming `Equal`. `js/engine/canonicalText.js` writes and reads the canonical text form (`a÷b` is `Multiply(a, Invert(b))`). `FunctionCall` became `Apply { operator, arguments }`. Relations keep their own stored type names (`Equal`), so saved documents are unchanged. Two equations now compare structurally. A guard test forbids comparing with `'Equal'` outside the `=` rules. Next: E2, the table-driven parser and printer.

**Engine stage E2 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `js/engine/notation.js` holds every written sign as a row: infix levels (`+ -` build `Add`, `× * · ⋅ ÷ /` build `Multiply`, with `-` giving `Negate` and `÷` giving `Invert`), juxtaposition with its rules and the `6÷2x` refusal, prefix signs, brackets, `=`, reserved signs and the print rows, each with its own error messages. `js/engine/parser.js` reads the table and names no sign or node type (checked by a test). Behaviour is unchanged: a frozen copy of the old parser (`tests/helpers/legacyParser.js`) must agree with the new one on about 6,000 inputs, trees and error messages alike, with associativity on and off (`tests/engine/parser-equivalence.test.js`). Owner decision: `Equal` keeps its own type; a natural `Equal` chain (`a = b = c`) and a `BinaryEqual` will follow the `Add` / `BinaryAdd` pattern, since equality is an equivalence relation. Next: E3, type, operator and relation definitions.

**Engine stage E3 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Types, operators and relations are definition objects, one folder each, in `js/definitions/types/`, `js/definitions/operators/` and `js/relations/`, with registries and checking helpers (`js/definitions/define.js`). Defined now: the scalar type (a field), `Add`, `Multiply`, `Negate`, `Invert`, `Group`, the axioms `BinaryAdd` and `BinaryMultiply`, `SequentiallyApply`, and the relation `equal`. Each operator carries its own notation rows and precedence; `js/engine/notation.js` only assembles them. Properties come from the type through `js/engine/structures.js`; the old flags ask it, and their setters became a lesson override. Rules declare `requires` (for example, reorder needs commutativity) and the coordinator checks it. The coupling report and the import-boundary guard now count the new folders as Engine. No behaviour change: the E2 parser oracle and every suite pass. Next: I1, interaction definitions.

**Stage I1 done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** The six gestures (`activate`, `drag`, `drag-between`, `drop-tool`, `command`, `key`) are interaction definitions in `js/definitions/interactions/`. The input router reads them and checks each rule declaration against the gesture's fields. `Add` and `Multiply` describe their own on-screen presentation (classes, labels, sign styles), and `js/definitions/operators/presentation.js` answers for them, so the renderer, drag code, preview and views no longer name node types; a guard test keeps it so. The ÷ factor is found by a `data-sign-inside` mark. The router's "imports nothing" test now allows exactly the interaction registry, which is data. Next: E4 (identity rules as data, the generic both-sides rule, `<`).

**Stages E4a and E4b done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** Owner decisions: a defined function is typed `\sin(x)`, brackets always; for an inequality multiplied by an unknown sign the student will be asked (E4d); identities are written as data; statements that split into cases, and undefined values that stay but stop interacting, are recorded in Future Features. Built: `\sin`, `\cos`, `\tan`, `\ln`, `\exp` as operator definitions, read and drawn (the name upright, each argument in its own box). Identity rules as data (`defineIdentity`, `js/engine/patterns.js`, one generic bundle `js/rules/identities/`) with `sin.addition` and `cos.addition`: tap the function name to expand, tap the `+` to collapse, both previewed. A route-name clash (lesson 13) is now caught by a Node test. Next: E4c (`<` and `>` as relation folders; the generic both-sides rule).

**Stage E4c done (12 November 2026; design: [Engine standard](Engine_Standard_Design_Draft.md)).** `<` and `>` are relation definitions, one folder each (`js/definitions/relations/less/`, `js/definitions/relations/greater/`), registering their own node types; nothing outside their folders names them (a test checks). They read, print, convert to MathJSON and draw with their own sign. The both-sides rule serves every relation (`relation: 'acted-on'`): dragging a term across `<` adds its opposite to both sides and keeps `<`. The `=` operation menu is mounted only on equations until E4d brings multiplying both sides of an inequality, with the student asked when the sign is unknown.

**Clean-up plan written (12 November 2026; [Clean-up plan](Cleanup_Plan.md)).** The owner asked for the code to be made as neat as a fresh engineer would make it; the plan cleans in place, in eight steps (C1 names, C2 one candidate preview, C3 leftovers, C4 drag folder, C5 folders by layer, C6 tests by subject, C7 unused code, C8 documentation), each with no visible change and a check against recurrence. It waits for the owner's approval and three decisions. E4c is committed; E4d follows the clean-up.
