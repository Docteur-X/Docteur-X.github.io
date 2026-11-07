# Serialization and compatibility reference

Inspect `js/core/documentSerialization.js`, `documentInvariants.js`, `documentHistory.js`, `serializationLimits.js`, `documentRepository.js` and `workspaceDocuments.js` for exact current formats and validation limits.

Document schema v2 supports multiple Mathematical Objects with independent histories. Compact event-only export/import and validated hydration are implemented; older v1 documents are migrated on import. History stores branching events, snapshots and node IDs; corruption, unsafe patch paths and malformed JSON must be rejected without mutating the current workspace.

Do not infer a new format from older archived guides. Changing an envelope or patch schema requires compatibility fixtures, validation tests, browser import/export tests and a documented migration policy. IndexedDB autosave durability is separate from synchronous mathematical commits.
