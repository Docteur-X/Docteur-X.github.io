# Factorisation — mathematical rule and interaction handover

**Implemented:** 2 November 2026. **Status:** narrow rule with automated tests and user-reported browser verification of the explanatory preview; broader keyboard, nested-layout and pointer regression coverage remains needed.

## Teaching goal

Factorisation should feel like the *reverse direction of distributivity*, but
it remains a distinct operation with a distinct user interaction and provenance.
Students first expose common factors using other mathematical transformations,
then select and extract them. The interface must not secretly commute factors,
insert `1`, decompose coefficients, or simplify the residual expression.

## First-version mathematical scope

- **Left:** `a*b+a*c+a*d -> a*(b+c+d)`.
- **Right:** `b*a+c*a+d*a -> (b+c+d)*a`.
- Every direct child of an explicitly grouped `Add` must be a `Multiply`
  with at least two explicitly represented factors.
- Ctrl/Cmd+click exactly one factor in **every** product. Selected factors
  must be at the same end and structurally equal (ignore node IDs and purely
  visual bracket style, but **do not** automatically commute or simplify).
- The order of the residual factors and addends is preserved, including in
  noncommutative multiplication. Products with more than two factors require
  associativity; two-factor extraction does not.
- Only the current grouped sum is affected. The default teaching policy requires a **visible grouping boundary** (explicit `Group` or mandatory precedence brackets); stricter `explicit-group` and more permissive `any-add` policies are implemented in `factorisationPolicy.js`.
- A nested `Group(Group(Add(...)))` uses the outermost visible Group as its
  extraction boundary, while retaining all inner Group IDs.

Examples deliberately **not** recognised as direct factorisation:
`a*b+a`, `a*b+c*a`, `2*a*b+4*a*c` without preparatory steps.
The implemented `×1` toolbar can now introduce explicit identity factors; numerical decomposition (`4 -> 2*2`) remains planned. Neither changes the narrow matching rule in `factorisation.js`.

## User interaction

1. Create an explicit group around the addends, e.g. `(a*b+a*c)`.
2. Ctrl/Cmd+click the first `a` in each product. General selection permits
   arbitrary nodes, but the *factorisation rule* checks eligibility.
3. A small amber extraction zone appears beside the selected group when
   there is room. If another hitbox occupies that area, it moves above/below
   the group; if all candidate positions are crowded, the toolbar remains
   available instead. Drag a selected factor to the zone or click **Preview extraction**.
4. A **modal one-line explanatory preview** keeps the original addends
   visible, with the selected common factors faded. It inserts a NEW amber
   factor beside the grouped sum in normal layout (not at fixed coordinates).
   Thus `(b*a+c*a+d*a)*f` can preview the old sum, then the amber `a`, then
   `f` without overlapping the neighbouring factor.
5. Persistent overhead amber arrows converge from the faded factors to the
   new factor. Students can study this visual explanation indefinitely; the
   amber factor is clickable for confirmation. The complete mathematically
   correct result is separately stored as an independent candidate tree.
6. Escape, Cancel, or clicking elsewhere restores the exact original equation
   DOM and preserves selection, tree IDs and history. Confirm commits the
   previously constructed candidate and its provenance as ONE history entry.

The preview is NOT a floating factor button. The one-line visual composition
uses ordinary browser layout and must never be mistaken for the actual result
tree. The complete candidate remains separate and is committed only on confirmation. See **`TRANSFORMATION_PREVIEW.md`** for the detailed
lifecycle, transition mechanics, and the separation between committed tree,
candidate tree and decorative graphics.

## Division of labour

| File | Responsibility |
| --- | --- |
| `core/structuralEquality.js` | Compare mathematical subtrees without IDs or bracket style; never silently commute |
| `operations/factorisation.js` | Pure eligibility and atomic left/right rewrite; provenance |
| `interaction/selection.js` | Store arbitrary selected IDs; does not know factorisation rules |
| `interaction/factorisationPreview.js` | Small pre-drop extraction-zone button and collision avoidance |
| `interaction/transformationPreview.js` | Generic modal preview lifecycle, persistent SVG arrows, accessible confirmation and restoration |
| `interaction/inlineExtractionVisual.js` | Purely visual one-line source/new-factor composition using normal layout |
| `rendering/domRenderer.js` | Render both the committed and proposed trees using the same layout rules |
| `app.js` | Coordinate selection, factor drag, preview mode, candidate tree, history and cancellation |

## Node IDs, history and provenance

`applyFactorisation(root, plan)` returns a **new tree**. It does not mutate
`root`. The existing `Group`, inner `Add`, and residual operand nodes keep
their IDs. An old `Multiply` retains its ID when at least two residual factors
remain; otherwise its sole remaining child replaces it. The extracted factor
is a new occurrence with fresh IDs, because it represents several original
factor occurrences. The transformation record includes `sourceFactorIds`,
`extractedFactorId`, `retainedResidualIds`, `retiredProductIds`, and
`originIdsByNewId`. Undo/redo use tree snapshots with stable IDs.

This is an initial provenance format, not a universal rule schema yet.
Compound copied factors record the representative subtree's descendant
origins; a richer many-to-one correspondence for all matching subtrees is
future work.

## Testing and limits

Run `node --test tests/*.test.js`. Mathematical tests include left/right
extraction, noncommutative order, nonassociativity, nested groups, structural
matching, no-mutation preview checks, and stale-plan rejection. DOM tests exercise collision avoidance, full candidate rendering, click/keyboard confirmation and cleanup with a fake DOM.

**Browser QA remains necessary:** test Ctrl/Cmd+click of factors inside nested
hitboxes, dragging into extraction zones, cancel/confirm, scrolling/zoom,
keyboard focus, dark mode and reduced motion. No Playwright browser run was
performed for this release.

## Deferred improvements

- `a -> a*1`, `a -> a+0`, and integer decomposition such as `4 -> 2*2`.
- Selecting a *compound* factor is supported structurally, but should be
  tested for visual clarity and long/nested expressions.
- Fraction, power and matrix layouts require named regions and type checks.
- General rule contracts (`check`/`apply`/provenance) and composite teacher
  macros are future goals, not implemented features.
- Incremental **Edit Expression** should preserve unaffected IDs instead of
  reparsing the whole text input. This becomes valuable for identity insertion.

## Scope teaching policy (3 November 2026)

**Mathematical eligibility is not teaching eligibility.** The pure
`getFactorisationPlan(root, selectedIds)` validates the distributive-law
pattern and returns `groupId: null` for an Add without an explicit Group.
`scopeNodeId` always identifies the visual scope (Group ID if present; otherwise
Add ID). `applyFactorisation()` handles both representations, preserving
existing Group IDs and inserting no artificial Group into a mandatory-bracket
expression. The renderer supplies any required parentheses.

`js/teaching/factorisationPolicy.js` exports
`checkFactorisationTeachingPolicy(root, plan, policy)` with modes:

- `visible-brackets` (default): explicit Group **or** mandatory precedence brackets;
  unbracketed standalone Add requires the student to group first.
- `explicit-group`: requires an actual Group node, even where parentheses are mandatory.
- `any-add`: accepts any mathematically eligible Add, including the root.

The application checks this policy when displaying extraction affordances and
again on preview confirmation. Policy changes do not alter algebraic rules.
Do not duplicate the policy in `factorisation.js` or the DOM renderer. Future
teacher settings can select a mode without changing the transformation code.


## Historical preview proposal (implemented later)

The existing full-candidate preview is mathematically correct but too abrupt
for teaching. The subsequently implemented visual is one-line, analogous to the
distribution preview. For `(45*5+45*9)`, show a newly proposed amber `45` just
outside the sum, leave both original `45` occurrences in place but faded, and
draw **persistent** converging overhead arrows from those originals to the new
factor. Amber communicates the new proposed occurrence; fading with arrows
communicates relocation/merging rather than unexplained disappearance.

The preview remains modal and noncommittal: the mathematical tree and history
stay unchanged until the amber factor is clicked; cancellation retains the
selection. Avoid two stacked before/after equations. The preview should reflow
to accommodate neighbouring factors without moving committed drag geometry.
**Implemented in the current release**; see the interaction section above and `ARCHITECTURE_DECISIONS.md`.
