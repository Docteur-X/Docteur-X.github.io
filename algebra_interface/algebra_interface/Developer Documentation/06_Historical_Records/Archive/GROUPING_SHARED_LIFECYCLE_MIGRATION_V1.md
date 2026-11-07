# Grouping — Shared Commit Lifecycle Migration v1 (2026-11-06)

## Purpose and scope

This increment migrates deliberate adjacent-sibling range grouping to the same source-stamped, single-use confirmation and detached history preparation already used by equality function application, identity insertion, distribution, and factorisation. It does not change the grouping gesture, blue selection envelope, bracket preview, grouping eligibility, mathematical teaching policy, or history serialization format.

**Student agency remains authoritative:** students select a contiguous range and explicitly confirm; the Engine validates associativity and constructs the grouped AST. The UI cannot grant mathematical permission by itself.

## Data flow and ownership

1. `groupingGesture.js` creates an immutable, DOM-free `grouping.range` request from a validated adjacent-sibling plan and chosen bracket style.
2. `transformationFeatureAssembly.js` verifies the plan against the authoritative source, then calls the mutating grouping rule **only on `structuredClone(root)`**. It returns a detached, normalized candidate AST, provenance, and new Group node ID. The source AST remains untouched throughout preview.
3. `app.js` opens `groupingCommitLifecycle` with the active document/object IDs, history cursor, root ID and AST fingerprint. The existing `groupingOverlay` remains the sole owner of blue bracket preview geometry and click/keyboard confirmation.
4. On confirmation, the gate consumes the proposal once and rejects stale stamps. The callback independently rechecks the exact parent and ordered sibling IDs against the current mathematical tree.
5. `prepareAtomicTransformationCommit` constructs the next history on detached data; only after successful preparation are the new root/history published. Document synchronization and autosave follow, with persistence errors handled separately.
6. Cancellation clears only transient preview state. It never changes mathematical history or the original selection.

## Critical invariants

- Grouping's Engine rule mutates its supplied AST. **Never call it on the live root during preview.**
- The original operand IDs remain stable; new Group and inner-operation IDs identify only introduced structure.
- The selected range is canonicalized in expression order, regardless of click order.
- A proposal cannot commit twice or into another object, document, history revision or AST.
- Failed detached history preparation leaves the authoritative expression/history unchanged.
- Explicit brackets are real `Group` nodes, not CSS decorations. The renderer still owns mandatory precedence parentheses.
- Autosave failure after a valid in-memory commit is a durability problem, not grounds for silently reversing mathematical work.

## Verification and remaining scope

Node: **244/244 passed** in the development environment, including three new shared lifecycle tests for detached candidates, cancellation/stale rejection and history-preparation failure. Browser: **32 Playwright tests expected; not executed in this environment**. The added browser test covers cancellation followed by a successful single commit; manual confirmation of blue overlay geometry and touch selection is still important.

Rearrangement and numerical calculation have not been migrated. This increment does not introduce a new generic gesture interpreter, multi-window controller or transaction system. The shared commit gate does not guarantee IndexedDB durability.

## Handover

Review the current source before relying on older milestone documentation. Future migrations should first determine whether the Engine mutates its input, then preserve the existing gesture/visual semantics while replacing only the proposal/commit boundary. Browser tests should wait for observable preview eligibility, not arbitrary delays. Preserve support for future matrices, logical statements, multiple views, low-resource hardware and annotations without allowing UI code to decide mathematical truth.
