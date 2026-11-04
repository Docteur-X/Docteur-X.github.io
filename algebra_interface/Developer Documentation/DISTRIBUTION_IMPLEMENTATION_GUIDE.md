# Developer guide: two-stage distribution (November 2026)

This guide focuses on **why** the implementation is structured this way. It is
for maintainers who know some JavaScript but may be new to expression trees.

## 1. The three mathematical ideas

- **Commutativity:** `ab = ba` permits *swapping* factors (only when enabled).
- **Associativity:** `(ab)c = a(bc)` permits *flattening* nested products (only
  when enabled). It does NOT permit swapping factors.
- **Distribution:** `a(b+c) = ab+ac` and `(a+b)c = ac+bc` permit *replacing* a
  product that contains a sum. Unlike factor rearrangement, the sequence of
  factors is preserved, so this is valid for matrix multiplication too.

Every permission comes from an **operation module**, not from `app.js` or CSS.

## 2. Two separate stages: a model of the interaction

```
                  Drag a factor
                        |
             pointer over '+' ? ---- no ----> ordinary combination/reorder
                        |
                       yes
                        v
            getDistributionPlan()
                        |
                    valid? ---- no ----> no distribution
                        |
                       yes
                        v
              Yellow hover feedback
                        |
                 Release pointer
                        |
                        v
          PREVIEW (no tree mutation)
                /             \
  Escape/click elsewhere     Click ANY amber factor copy
          |                         |
          v                         v
       CANCEL             applyDistribution(root, plan)
       no history                 |
                                  v
                     one new history node + provenance
                                  |
                                  v
                     render, animate new factor copies
```

`distributionPreview` is **not** saved as an algebra node or in history. This
is deliberate: the temporary visual representation `a(a·b+a·c)` is not an
equality transformation and must never become the source of truth.

## 3. File responsibilities

| File | Responsibilities |
|---|---|
| `js/operations/distribution.js` | Validate left/right distribution, check adjacency, commit a mathematical rewrite, clone source factor with new IDs, report lineage. |
| `js/operations/addition.js` | Addition-specific identities and associativity/commutativity permissions. |
| `js/operations/multiplication.js` | Multiplicative identities and associativity/commutativity permissions; independent of distribution. |
| `js/core/nodeFactory.js` | Create individual nodes, with no unconditional flattening. History cloning preserves IDs. |
| `js/core/treeUtils.js` | Generic lookup, walking, replacement, conditional normalization, numeric evaluation; no law decisions. |
| `js/core/normalization.js` | Adapter asking operation rules whether same-type nested nodes may flatten. |
| `js/core/operatorMetadata.js` | Render/serialize necessary parentheses, including nonassociative nesting. |
| `js/rendering/domRenderer.js` | Build real hitboxes, clickable amber preview COPIES, and plus-sign target markers. Never rewrite the tree. |
| `js/app.js` | Own pointer events, original drag session, temporary distribution preview, history and transition animation. The tree remains unchanged until commit. |
| `js/interaction/hitTesting.js` | Cache operand/plus-sign rectangles; find geometric pointer targets without re-rendering. |
| `js/interaction/dragFeedback.js` | Update existing green/amber highlights and a non-layout insertion marker. |
| `styles.css` | Colours, curves, clickable target styling; no semantic decisions. |

For a full explanation of pointer stability, preserved mathematical state,
geometry snapshots, and hysteresis (off), see `INTERACTION_ARCHITECTURE.md`.

## 4. Node ID provenance

Suppose `a` is node `node-8` and `b`, `c` are nodes `node-9`, `node-10`.
Before distribution, a source product contains one `node-8`. Afterwards,
`a*b+a*c` needs TWO different `a` occurrences, for example `node-20` and
`node-23`. We cannot give both new leaves `node-8`: selection, drag state and
history tracing would become ambiguous.

The rule returns a plain JSON object resembling:

```json
{
  "rule": "distribute-left",
  "sourceFactorId": "node-8",
  "sourceSumId": "node-13",
  "producedSumId": "node-26",
  "copiesBySourceId": { "node-8": ["node-20", "node-23"] },
  "retainedAddendIds": ["node-9", "node-10"]
}
```

This record is attached to the history node as `transformation` and is
preserved with the accompanying tree snapshot. For compound copied factors,
`copiesBySourceId` includes **all** nested symbols, operators and group IDs.
The UI does not yet offer interactive lineage tracing; only the data is stored.

## 5. Why only adjacent factors?

To distribute `a` across a sum in `a*x*(b+c)`, the UI would need to commute
`a` past `x` (or distribute a **whole prefix product**, which is a different
user action). That is invalid if multiplication is noncommutative. In this
first interaction, selecting `x` instead is legal because it is adjacent to
the sum: `a*x*(b+c) -> a*(x*b+x*c)`.

This restriction is intentional and should be relaxed only by adding a
separate, explicit, mathematically validated selection rule. It is *not*
a consequence of the renderer or the hitbox CSS.

## 6. History versus input re-parsing

`Build expression` creates a NEW tree and new IDs. Local transformations (such
as distribution or a single-node Group wrap) preserve IDs for everything that
survives unchanged. Future **Edit Expression** should distinguish these two
cases and avoid rebuilding the entire tree after a small edit.

**Range grouping is implemented:** it wraps adjacent siblings with a new Group and inner operator while retaining existing leaf IDs. This supports deliberate preparation for factorisation.

## 7. What to test manually in a browser

1. `a*(b+c+d)`: drag `a` onto `+`; expect AMBER hover, three overhead curves and clickable amber copies; no circular ↘ buttons or downward layout shift.
2. While arrows are present, click elsewhere; check no change and no history.
3. Repeat, confirm any amber factor copy; expect `a*b+a*c+a*d` and one history step. Also test keyboard Tab then Enter/Space.
4. `(a+b)*c`: drag `c` onto `+`; expect `a*c+b*c`, not `c*a+c*b`.
5. `2*(3+4)`: dragging `2` onto the **whole** group may evaluate numerically
   if both operands are numeric; onto `+` must preview distribution instead.
6. `a*x*(b+c)`: distributing `a` directly should be blocked; `x` may distribute.
7. `x*a*(b+c)*y`: ensure `x`, `y` remain outside the sum in the same order.
8. While previewing, hit Escape; ensure the original ID structure remains.
9. Check light/dark themes, zoomed layout and reduced-motion preferences.
10. Confirm undo and redo-by-history navigation create/restore correct branches.

The automated tests assert rule validity and the generated DOM structure, but
browser pointer geometry, hover colours, and motion are not browser-tested in
this delivery.

## 8. Why preview factor boxes are buttons, but overhead arrows are not

The SVG curves are purely decorative (`pointer-events: none`) and absolutely
positioned over the equation. They must not add to the expression's height or
block clicks. Their endpoints are measured AFTER the browser has laid out
all the mathematical terms. In particular, do not reintroduce the old circular
`↘` button above each term: stacking controls above the products changes their
vertical alignment and distracts from the mathematics.

`domRenderer.js` renders each transient copied factor as a native `<button>`
carrying `data-distribution-confirm="true"`. This is an INTERACTION control,
not an expression-tree node, so it has no mathematical node ID. `app.js` uses
one delegated click listener to confirm any copy. A document-level pointerdown
handler cancels a preview when clicking elsewhere; it deliberately excludes
these buttons. The equation's ordinary keyboard selection handler likewise
ignores them, allowing native Enter / Space activation.

A preview is still just visual state. Cancel it and the old expression tree,
node IDs and history remain intact; confirm it and `distribution.js` performs
the same validated rewrite and provenance recording as before.

### Equality-root confirmation regression (2026-11-04)

`applyDistribution()` previously rejected a document root unless its type was `Add`, despite the gesture and preview correctly locating `Multiply` nodes inside `Equal.left` and `Equal.right`. Confirmation therefore failed with "The proposed expansion is no longer available". The rule now validates the targeted `Multiply` subtree without restricting the document root. `replaceNodeAtLocation()` already handles relation children. Regression tests cover both equation sides and ensure the opposite side remains unchanged. Future rules must similarly avoid assumptions about the top-level document root.
