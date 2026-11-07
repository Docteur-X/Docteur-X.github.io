# Architectural Consolidation v1 — Equality and Clipboard Interaction

## Purpose and scope

This increment extracts the **presentation and pointer-interaction implementations**
for the newly introduced equality-function and mathematical-clipboard features
from `js/app.js`. It is intentionally **not** the general transformation lifecycle
refactor. The latest verified mathematical rule, teaching grouping policy, history
semantics, feature registration, and serialization format are unchanged.

## Ownership map

| Responsibility | Current owner |
| --- | --- |
| Mathematical validity and candidate AST | `js/relations/equalityFunctionApplication.js` |
| Transformation feature dispatch | `js/manipulator/transformationCoordinator.js` and feature registry |
| Session clipboard data | `js/core/clipboardLibrary.js` |
| Equality operation menu, arming indicator, and inline preview DOM | `js/interaction/equalityInteractionController.js` |
| Clipboard panel, pointer ghost, and drop target arbitration | `js/interaction/clipboardPanelController.js` |
| Rendered mathematical notation and semantic visual roles | `js/rendering/domRenderer.js` |
| Candidate creation, stale-source verification, and history commit | `js/app.js` (remaining integration debt) |

## Data flow

1. The clipboard controller reports a completed pointer drop or the equality
   menu invokes its accessible alternative. Neither constructs an AST result.
2. `app.js` captures the selected clipboard entry, current object, document,
   history cursor and source fingerprint, then asks the registered coordinator
   for a mathematical proposal.
3. The mathematical engine constructs the candidate and provenance; the
   coordinator describes its visual roles.
4. The equality interaction controller renders the candidate **transiently**
   in the existing viewport using `renderExpression(..., {visualRoles})`.
   It retains the original DOM nodes for exact cancellation.
5. Confirmation returns to the application controller, which rejects stale
   proposals and commits the result once through existing history APIs.

## Important invariants

- The authoritative mathematical object is never owned by a window, menu,
  clipboard panel, or preview controller.
- A clipboard entry is a session snapshot; changing documents never changes
  its meaning. It is not stored in the document or IndexedDB.
- Arming is transient interaction state, not a mathematical node or history event.
- A specific subtree drop is reserved for justified substitution and **must not**
  fall back silently to an armed equation-level operation.
- An unconfirmed preview must not change the mathematical AST or history.
- Cancel must restore the *same DOM nodes* to preserve event handlers.
- Existing expression-node identities must be preserved by the engine; inserted
  operands receive new identities as specified by the rule.
- Menu positioning and pointer ghost geometry are viewport/presentation concerns.

## Why this is deliberately bounded

The mathematical proposal and commit still live in `app.js`. Moving them to a
shared transaction coordinator without a full contract for history revisions,
rejections, and cancellation would be a riskier change. Future consolidation
should first formalize `gesture intention -> resolved immutable request ->
mathematical proposal -> visual roles -> stale-safe commit` and migrate each
feature incrementally. The current feature registry does **not** yet provide
universal gesture arbitration or commit guarantees.

The equality interaction controller is created per current view and refers to
an injected `equation` element. This is an intentional step toward future
multiple windows. It currently supports one root equality per view; nested
relations and multi-window editing authority remain future work.

## Verification

- `node --test tests/*.test.js` verifies all Node tests, including architectural
  boundaries and mathematical regressions.
- `npm run test:e2e` must be run in a browser-capable environment. In particular,
  test arming/disarming, portal menu placement, clipboard dragging, inline amber
  preview, cancellation, history commits and document switching.
- The new boundary tests are **not** behavioural proof: Playwright verification
  and actual-device interaction remain important.

## Long-term design constraints

Keep mathematical correctness and student agency paramount: students select
transformations, the Engine enforces mathematics, and the system preserves their
reasoning. Future vectors, matrices, inequalities and logical statements require
relation- and domain-specific eligibility, explicit operand order and
conditional assumptions. Multiple views, annotations and resizable windows
must not change the authoritative Mathematical Object. Keep ordinary algebra
usable on inexpensive, offline computers; avoid unnecessary rerendering or
expensive work on every pointer event.

## Deferred known issues

The equality preview's dashed amber border and optional grouping of atomic
operands remain visual/teaching-policy refinements. They were not changed here.
The occasional history-navigation failure under parallel Playwright execution
also remains an investigation item; a sequential suite previously passed.

### Follow-up: v1.2 controller lifecycle repair
See `ARCHITECTURAL_CONSOLIDATION_V1_2_LIFECYCLE_REPAIR.md` for amber click sequencing, full-rerender invalidation, disposable controllers and interrupted clipboard drag cleanup.
