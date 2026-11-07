# Multi-Object Compact History — Increment 2

## Scope

`js/core/documentSerialization.js` introduces a pure, opt-in document format adapter.
No changes have been made to `app.js`, IndexedDB, workspace navigation, algebra
operations, or the existing import/export controls. Integration is Increment 3.

## API and wire format

- `serializeCompactDocument(liveDocument)` returns `{ format:
  'algebra-document-event-history', formatVersion: 1, document: ... }`.
- `deserializeCompactDocument(payload)` accepts this envelope and legacy full
  Mathematical Document v2 objects, returning a snapshot-backed live document.
- Each object's history retains graph nodes, parent/children links, event patches,
  metadata, next-node counter, and current cursor; only cached `snapshot` fields
  are omitted from the compact representation.
- Empty documents and objects with empty histories are supported.
- A compact document's `schemaVersion` remains 2: the separate envelope version
  identifies the *storage representation*, not a new mathematical document model.

## Integrity and ownership

The adapter first checks that input is finite, acyclic JSON-compatible data.
Export validates the live document using the existing structural validator and
opt-in invariant audit. Import hydrates each event history, then validates the
resulting document and cursor/root consistency. Both functions work on copies.
The validator is not yet a hardened untrusted-input boundary: depth/size limits,
more complete patch target validation, and efficient bounded replay are still
required before hooking this into the browser import or persistence paths.

## Tests

`tests/document-serialization.test.js` covers independent objects, branching
and cursors, round-trip identity, empty documents, legacy full documents,
corrupted events, unsupported format versions, and input immutability.
Run `node --test tests/*.test.js` (or `npm test` where npm is installed).

## Next steps

Increment 3 should add bounded validation and transactional import/export
integration, with backward compatibility for saved full documents. Do not
conflate deterministic replay with proof of mathematical equivalence.
