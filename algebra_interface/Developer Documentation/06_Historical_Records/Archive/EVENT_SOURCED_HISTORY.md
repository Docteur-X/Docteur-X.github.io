# Event-sourced history foundation (hybrid v1)

## Current behaviour

`js/core/documentHistory.js` owns the branching history graph and constructs one
**versioned event** alongside each **complete state snapshot**. The editor still
restores snapshots immediately on history navigation; previews, hover state,
animations, theme and pointer positions are never history events.

An event records:

- Stable `event-N` and `state-N` IDs, parent state reference, event kind and
  schema version (`1`).
- `ruleId` / `ruleVersion` **when explicitly supplied**, optional rule inputs,
  affected node IDs, newly generated node IDs and rule provenance.
- A deterministic JSON patch between the previous and next mathematical
  snapshots, plus before/after fingerprints for replay consistency checks.

**Why store patches as well as rule inputs?** Old work must remain reconstructible
when a mathematical module is refactored or its normalization changes. Replay
applies data changes; it does **not** invoke current mathematical rules.

`appendHistoryState()` creates events and snapshots atomically. `replayHistoryState()`
reconstructs a chosen branch by following parent links, verifies fingerprints,
and does not change the active state. `verifyHistoryReplay()` checks every node.
`exportEventHistory()` creates an event-only JSON-compatible representation;
`hydrateHistorySnapshots()` restores snapshots from that representation. These are library capabilities. **Workspace v1 now saves full document histories** through IndexedDB and JSON import/export; compact event-only serialization is not yet the default document export format. See `WORKSPACE_V1.md`.

## Invariants and limitations

- History remains a **tree**: an edit made from an older state creates a new
  child without deleting existing branches.
- IDs of unaffected expression nodes are preserved; new IDs are captured in
  events. History state IDs are independent of mathematical node IDs.
- A free edit is marked `free-edit`, variable testing is `context-edit`, and
  initial construction is `construction`; none is asserted to prove equality.
- Some legacy actions still have `ruleId: null` because their callers do not
  yet provide structured operation descriptors. Do not infer a rule from the
  human-readable label. Gradually add descriptors at each rule call site.
- Arrays (such as ordered operands) are replaced atomically in patches.
  This is deterministic but can be less compact than a specialised reorder
  event. Compression benefits must be measured, not assumed.
- Fingerprints are **non-cryptographic** corruption checks, not signatures.
  Future import must validate schema, node types, limits and referenced IDs.
- Replaying a long history from the initial state costs time proportional to
  the branch length. A future repository can use periodic checkpoints.
- Source-document references for cross-document substitution should include
  `{documentId, stateId, nodeId}` and preserve the source state used.
- Browser persistence is implemented through Workspace v1. **Still deferred:** robust schema migrations, history graph compaction, compact document export integration, and cross-document dependencies.

## Developer workflow

1. Let the mathematical rule validate and commit its operation.
2. Call `addHistoryNode()` with a `kind`, rule provenance and, when available,
   a structured operation descriptor (`ruleId`, `ruleVersion`, `inputs`, IDs).
3. Keep interaction-only previews out of history.
4. Add a regression test checking snapshot restore, event replay, branching,
   ID preservation and serialization for any new transformation.
5. Run `node --test tests/*.test.js` (or `npm test` when npm is available).

Do not replace the snapshot-based undo path with event replay until performance,
compatibility and import validation have been tested on real saved documents.
