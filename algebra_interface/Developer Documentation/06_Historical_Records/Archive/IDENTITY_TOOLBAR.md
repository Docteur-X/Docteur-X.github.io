# Identity introduction toolbar (v1)

## Pedagogical behaviour

The toolbar offers **+0** and **×1**. Drag a tool over the left/right half of an operand hitbox to apply the identity to that subtree, or over a matching operator to insert into an associative operand sequence. While dragging, a pointer-transparent amber copy follows the cursor. A valid original hitbox glows amber and the hint bar describes the left/right action or associative gap; **the expression stays stationary**. Releasing over a valid target then displays the proposed expression **inline**, with the newly introduced identity and adjacent operator amber, and locks a deliberate preview; click the amber identity or **Confirm** to commit, or **Cancel**, Escape, or outside click to discard. Nothing is recorded in history until confirmation.

## Responsibility boundaries

- `operations/identityInsertion.js` validates requests, consults each operation's associativity policy, and creates a candidate tree. It has no DOM dependency. Existing node IDs are retained; new operation/identity occurrences receive fresh IDs.
- `interaction/identityDragFeedback.js` owns the floating drag ghost, target glow, and pure hint descriptions; it never renders the candidate or changes hitbox geometry.
- `interaction/identityTool.js` owns only the post-drop temporary visual candidate. The committed expression remains in the DOM with unchanged geometry and hit-testing, but is made transparent during preview; the candidate is positioned in a separate overlay only after dropping. During dragging the source equation stays fully visible and retains stable hit-test geometry.
- `rendering/domRenderer.js` identifies operator gaps using stable parent IDs and insertion indices. It continues to own mathematical layout.
- `app.js` coordinates toolbar pointer events, target interpretation, preview confirmation/cancellation, and one history event per confirmed insertion.

## Mathematical boundaries

Identity insertion is a justified **structural transformation**, not an automatic simplification. The normalizer must not immediately remove a newly inserted 0 or 1. Direct insertion into an existing operation is permitted only when that operation explicitly declares associativity; otherwise wrapping the selected subtree is available. The current identity registry covers scalar addition and multiplication. Future vector, matrix, function-composition, and abstract-algebra identities require type-aware identity factories, including possible left/right-only identities.

## Verification / limitations

The mathematical regression tests cover left/right insertion, operator gaps, non-associative cases, node ID retention, equality-side isolation, and invalid requests. Browser verification is still needed for nested hitboxes, implicit multiplication operator gaps, narrow screens, keyboard access, and all modal interaction boundaries. The current toolbar is pointer-first; a fully keyboard-operable target picker should be added before claiming complete accessibility. No automatic identity decomposition (`0 → 3+(-3)`, `1 → 4/4`) is included yet.
