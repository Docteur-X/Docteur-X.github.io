# Rendering, hit-testing and interaction

`js/view/rendering/domRenderer.js` renders ASTs into mathematical notation, explicit Group brackets, precedence-required parentheses and node-ID hitboxes. `js/interaction/` owns browser-specific selection, hit testing, drag feedback, preview DOM and extracted equality/clipboard controllers. `js/manipulator/*Visual.js` supplies semantic transformation-specific descriptions.

Existing `*Gesture.js` adapters (conceptually **Interaction Recognizers**) describe DOM-free candidate intentions. The Interaction Interpreter should arbitrate competing recognitions; the Mathematical Engine checks applicability of the student-requested rule, not a subjective preference. The Visual Feedback Controller communicates targets and the Transformation Visualiser optionally shows candidate mathematics. Renderer-owned presentation roles are preferable to application code manually painting arbitrary DOM ancestors.

Keep hitbox geometry stable during drag, avoid second post-drop rearrangement animations, preserve cancellation and exact DOM restoration, and distinguish transient hitbox outlines from actual mathematical brackets. Distribution's amber, grouping's blue and numerical eligibility's green are current visual conventions, not mathematical semantics.

Known UI follow-ups: equality insertion amber should have a dashed resting border; optional grouping around atomic factors may be overly broad; crowded factorisation extraction zones can be unavailable even when toolbar Preview Extraction succeeds. Resizable windows and intelligent line breaking are future work, not implemented.

For the distinction between physical input, interaction recognition, mathematical intent, rule application and visual feedback, see [terminology](../../04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md).

## Mathematical presentation composition — adopted design contract

The [Mathematical Presentation Composition Contract v1](../../04_Reference/Mathematical_Presentation_Composition_Contract.md) defines the intended recursive AST-to-presentation mapping, semantic mathematical containers, operator targets, structural navigation, and external proxy targeting. It explicitly distinguishes the **current renderer** from future capabilities; no new renderer, navigator, proxy palette, geometry engine or provenance mechanism was implemented by adopting the contract.

## AST-based navigation

See [Mathematical Structure Navigation v1](Mathematical_Structure_Navigation_v1.md). Navigation is semantic and independent of DOM ancestry. The toolbar is outside the mathematical equation; highlighting is layout-neutral.

## Stylesheet structure

`styles.css` only lists the files in `css/`, in the order they apply. No rules live in it.

| File | Responsibility |
|---|---|
| `tokens.css` | Named colours and values for both themes. The only file that defines custom properties. |
| `base.css` | Reset, plain elements, shared controls, utilities. |
| `interface.css` | The page around the mathematics: panels, toolbars, menus, dialogs. Windows and Documents work will mostly land here. |
| `math-layout.css` | How notation is arranged. New notation adds a section. Mentions no state or feedback. |
| `hitboxes.css` | The interactive boxes around mathematics, at rest and under the pointer. |
| `feedback.css` | What a state means: eligible, proposed, selected and so on. Features name a role; this file paints it. |
| `previews.css` | Temporary marks from a gesture or proposal: ghosts, overlays, candidate expressions. |

`tests/architecture/stylesheet-structure.test.js` guards the boundaries that are already true. No mathematical decision lives in CSS.

**Future mathematics.** Fractions, matrices and multi-line simultaneous equations each add a section to `math-layout.css`, sized in `em` so they scale when nested. Hitbox and feedback styling must not depend on a node's shape. Symbol appearance, such as an italic imaginary `i` or `θ` and `π`, follows a symbol kind in the tree; the Engine decides what a symbol means, never CSS. This prepares the structure only; none of these features exist.

**Rules the tests enforce.** Only `tokens.css` defines custom properties and colours. Every token used is defined, with no fallback. Amber and green are not painted in `hitboxes.css` or `previews.css`. `math-layout.css` mentions no state or feedback.

**Order still matters.** Many rules tie on priority, so the later one wins. Notes in the files mark the ties found. That is why a few rules sit in a surprising place: each narrow-screen rule stays beside its base rule, and `.drag-ghost > .term`, `.is-preview-moving` and `.transformation-preview__confirm` are in `feedback.css`.

**`!important`** remains in 8 rules, for a stated reason: `[hidden]` must beat any `display`; reduced motion must beat any animation; only `!important` can beat an inline transform copied onto a ghost; and two markers must survive the hover-mode hiding rule.

### Still open

Moving these needs a design decision or more work, so they were left unchanged:

| Item | Evidence | What it needs |
|---|---|---|
| Amber looks differ | The shared `proposed-insertion` role, distribution copies, the equality operand and the factorisation zone each draw a proposal differently, in `feedback.css` | Owner decides whether all proposals should look the same. If so, features name the role and these rules go |
| Green has two sources | `is-combine-target` (filled, set by the renderer) and `math-feedback--eligible` (outlined, set through the Visual Feedback Controller) | Same decision |
| Hover mode hides some proposals | In hover mode the equality operand loses its amber border, outline and glow, and factorisation's confirm target loses its halo | The hiding rule excludes feature classes by name. Owner decides; recorded in [Known Issues](../../05_Roadmap/Known_Issues.md) |
| Cascade layers | Tried with one layer per file: about 330 of 19 million values change, including phone font sizes and amber borders | Remove the remaining ties first; the exact check shows what is left |
| Near-duplicate tokens | Several tokens hold nearly equal values, and the equality menu and clipboard ghost ignore the theme | Merging is visible, so it is a design decision |
| Unreachable drop slots | `app.js` only passes a null insertion index, so `makeDropSlot` never runs and its CSS is unused | Remove the renderer path and the CSS together |
| Unused roles | `rejected`, `selected` and `grouping` have rules and controller names, but nothing shows them | Kept as part of the feedback vocabulary |
| Appearance set from JS | 56 `.style` writes in `js/`, not yet classified; drag and overlay positions are expected to stay there | Classify during interface clean-up |

Check every change with the [visual safety net](../../03_Developer_Guides/Testing_and_Verification.md#visual-safety-net-for-stylesheet-work).
