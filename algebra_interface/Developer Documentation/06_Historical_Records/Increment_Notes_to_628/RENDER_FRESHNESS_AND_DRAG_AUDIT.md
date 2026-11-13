# Render freshness hardening and drag migration audit (2026-11-10)

## Status and evidence

Implemented in this increment: view-local semantic resolver invalidation, fingerprint validation of indexed hitbox attributes, root/object identity validation, and fail-closed handling of mutated nested hitboxes. `renderEquation()` and the empty-object rendering path invalidate the resolver immediately before replacing equation children; the existing semantic refresh repopulates it after mounting. The generation counter is diagnostic and is **not** yet a portable event token. No drag handlers were migrated in this increment. Browser testing is still required on the user's Windows machine.

## Why this matters

DOM nodes are ephemeral; AST node IDs are persistent mathematical identity. A DOM node that remains attached but has its `data-node-id`, role, parent ID, operator owner or position changed must not be interpreted using a cached mathematical address. Similarly, a new AST root or active object makes an old index untrustworthy until it is refreshed. The resolver rejects these cases instead of falling back to a nearby ancestor or a different target role.

This does not protect against *in-place mutation of the same AST root object* that retains reference identity, or a mutation followed by reversion of all fingerprinted attributes between checks. The long-term design should treat AST revisions as explicit versioned transactions and have the renderer publish its render revision; never imply the current guard is a complete transaction/version system.

## Source-grounded drag event inventory

- `js/app.js` contains equation `pointerdown` listeners around lines 3097 and 3116, equation `pointermove` hover listeners around 3168, and global `pointermove`, `pointerup`, `pointercancel` and cancellation paths around 3190–3271 (line numbers approximate and change with edits).
- Ordinary dragging uses `state.drag`, `dragFeedback` geometry, an arbitration session and candidate actions. Factor dragging has separate `state.factorDrag` lifecycle and ghost cleanup. Identity and clipboard dragging have additional independent paths.
- The existing `semanticTargetResolver`, `semanticInput`, and `negationActivationAdapter` provide the reusable semantic boundary, but pointer drag logic is not yet uniformly routed through it.
- Drag source capture, hover candidate detection, final release and cancellation must be inventoried and tested separately: the release position may differ from the last `pointermove` position.

## Next vertical slice: ordinary rearrangement drag

1. Record source `mathematicalObjectId`, `nodeId`, role, pointer ID and render generation on pointerdown. Reject unavailable semantic targets.
2. On pointermove, obtain a *current* semantic target address through the resolver; keep geometry as a presentation-only input. Preserve existing insertion-boundary semantics where the target is a gap rather than an AST occurrence.
3. Use the existing intent arbiter and rearrangement gesture recognizer to produce a request, not a DOM mutation.
4. On pointerup, re-resolve the release target and verify source object, render generation and preview gate before opening a candidate preview. If invalid, cancel safely.
5. Keep the existing mathematical rearrangement rule, preview and atomic commit code as authority. Remove old drag routing only after equivalent browser coverage is green.

## Browser acceptance checks

- Negation click and keyboard preview confirm/cancel still work.
- Drag addends/factors to valid and invalid targets; check hover and release without an intervening move.
- Rerender or change mathematical objects during a gesture; old source and target cannot commit.
- While a modal preview is open, another drag cannot start or commit.
- Verify pointer cancellation, Escape, history undo/redo and accessibility keyboard interactions.

## Decision pending

Should a semantic drag event refer to insertion boundaries using a dedicated `boundary` address (parent node plus boundary index) rather than overloading `operator` or occurrence addresses? Recommended: dedicated boundary address, since a gap is not itself an AST occurrence. Discuss before changing the production drag contract.
