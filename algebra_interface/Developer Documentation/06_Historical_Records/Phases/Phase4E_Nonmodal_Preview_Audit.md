# Phase 4E — Non-modal preview and animation lifecycle audit

**Status (8 November 2026):** characterization implemented; Node verification recorded separately; owner browser verification pending. Production JavaScript is unchanged.

## Scope and classification

| Mechanism | Owner | Modal lease? | Critical lifecycle contract |
| --- | --- | --- | --- |
| Ordinary drag ghost, insertion marker and green/amber drop feedback | `dragFeedback.js`, app drag session and visual-feedback controller | No | No AST mutation on hover; stop on pointerup, pointercancel, Escape, blur and view reset. |
| Blue rearrangement clone | `rearrangementPreview.js` via `dragFeedback.js` | No | Original hitboxes remain fixed; queued latest request only; commit only a settled destination; hard stop invalidates pending animation callbacks. |
| Numeric combination feedback | Ordinary drag recognition and rule validation | No separate confirmation modal | Release revalidates and publishes through existing commit path; never create a modal lease merely for hover feedback. |
| Factor extraction pickup/zone feedback | Factor gesture and factorisation overlay | No until deliberate confirmation | Selection and drag feedback must not monopolize modal ownership. |
| Identity toolbar pickup | Identity drag controller | No until deliberate confirmation | Tool pickup alone does not acquire a lease. |
| Structural navigation and selection highlights | Structure Navigator / visual feedback | No | View-scoped transient feedback; no mathematical mutation. |
| Modal confirmation for negation, equality, identity, grouping, distribution and factorisation | Feature preview + shared modal ownership | Yes | Existing single-use mathematical commit lifecycle remains authoritative. |

## Async and cancellation contract

`rearrangementPreview.js` maintains `phase`, `queued`, `generation` and `runningAnimations`. `stop()` increments the generation, cancels animations, removes the decorative clone and restores the original container's visibility. Promise completions and microtask notifications compare their captured generation to the current one. The `show()`/`dismiss()` soft transition is distinct from hard `stop()`; only a settled, unqueued visual destination may authorize release. These are existing implementation properties, not new Phase 4E production changes.

### New Phase 4E tests

Three Node tests added to `tests/interaction.test.js`: (1) late animation completion after hard stop cannot call the settled callback or resurrect a clone; (2) queued destinations are discarded on cancellation and a new session may start; (3) repeated hard stops preserve the original mathematical DOM children. These complement existing tests of latest-wins queueing, soft return, settled visual hit testing, and unchanged hitbox geometry.

## Residual risks / Phase 4F handoff

- These are fake-Web-Animations tests, not measurements of real browser rendering, scroll, zoom, reduced-motion or GPU timing. Preserve and run existing Playwright rearrangement, touch and cancellation suites.
- Inspect all asynchronous callbacks and event-listener teardown paths under rapid object/document switching; this audit does not prove there are no retained detached nodes.
- Add targeted browser evidence of absence of layout shifts and exactly-once publication under repeated release/cancellation if not already covered.
- Test cross-family modal conflicts and fault-injected cleanup in 4F; do not migrate non-modal drag animation into exclusive modal ownership.
- Reconcile redundant legacy guards only with call-site evidence. Phase 5, not Phase 4E, owns app composition extraction.

**Non-negotiable:** no new mathematical authority, no new history-publication route, no change to educational provenance or stable occurrence IDs.
