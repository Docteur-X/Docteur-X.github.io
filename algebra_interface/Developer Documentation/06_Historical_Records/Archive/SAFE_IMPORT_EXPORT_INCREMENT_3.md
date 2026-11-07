# Increment 3 — Safe JSON Import/Export Integration

## Scope and architectural contract

The workspace Export JSON button now downloads the versioned `algebra-document-event-history` envelope through `serializeCompactDocument`. The Import JSON control uses `deserializeCompactDocument`, accepting compact event-only documents and legacy full-snapshot documents. Imported histories are hydrated into snapshot-backed live histories. Mathematical object IDs, AST occurrence IDs, history branches, and cursors are preserved; only the imported **document** receives a new ID.

The IndexedDB repository continues to store complete snapshot-backed documents. This is deliberate: changing file interchange and browser-local storage simultaneously would expand migration and recovery risks. No algebraic transformation, preview, or undo/redo behaviour is changed.

## Failure isolation

Import checks the 10 MiB file limit, parses JSON, validates/hydrates the complete document, assigns a new document ID, then awaits a successful queued IndexedDB write **before** placing the document in the in-memory workspace and activating it. Invalid data or a failed write leaves the active document unchanged. The existing save queue serializes storage writes. Export failures are reported without producing a download.

## Verification

Node tests include a source-wiring/operation-order regression check and legacy/compact adapter compatibility. Browser tests exercise the actual file controls, compact envelope, history restoration after reload, and invalid-import isolation. Run `node --test tests/*.test.js` and `npx playwright test` in an environment with Playwright installed.

## Known boundaries and next steps

This is a structural/replay-integrity boundary, **not** a mathematical proof checker or a security sandbox. Empty-history policy, legacy field compatibility, cumulative replay resource budgets, and arbitrary hostile input remain areas for ongoing hardening. A document may be valid for ordinary live editing yet fail strict compact export if its state and history cursor disagree; this is surfaced as an export error, never silently rewritten. Existing IndexedDB records are still loaded through the legacy repository validator; migrating stored records to compact format is a separate decision. Browser tests must be executed on a machine with Playwright installed before declaring end-to-end verification complete.
