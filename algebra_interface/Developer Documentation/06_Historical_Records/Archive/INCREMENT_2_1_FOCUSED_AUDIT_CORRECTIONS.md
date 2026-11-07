# Increment 2.1 focused audit and corrections

## Scope
Read-only inspection of the existing opt-in serialization and history validation boundary, followed by narrowly scoped corrections. Existing editor import/export and IndexedDB paths remain unchanged.

## Corrections
- `documentInvariants.js`: independently bounded AST traversal, bounded patch numeric indexes, and bounded JSON inspection for history and AST input.
- `serializationLimits.js`: reject enumerable accessors and symbol keys without evaluating accessors. Non-enumerable built-in array properties (such as `length`) remain permitted.
- `documentSerialization.js`: reject oversized compact event graphs and patch batches before hydration.
- `documentHistory.js`: check patch targets during hydration to reject array expansion, sparse-array removal, and mismatched object/array path key types.
- `tests/serialization-audit-corrections.test.js`: four focused negative regression tests.

## Verification
Node test suite: 192 passed, 0 failed (`node --test tests/*.test.js`). Browser tests not rerun; the adapter remains opt-in.

## Remaining risks and design questions before Increment 3
- `assertBoundedJson` checks data representation, not cryptographic authenticity or semantic mathematical validity. JavaScript `JSON.stringify` can still have special handling for inherited `toJSON` methods; do not accept arbitrary live JavaScript objects as untrusted import inputs without a stricter parsing boundary.
- The history event patch format permits root replacement. The resulting snapshot is checked by the invariant validator after hydration, but the patch target guard is not a complete algebra-aware patch schema.
- History replay still copies snapshots and hashes their serialized contents, so total cost scales with cumulative state size, not just event count. Set realistic file-size and time limits in user-facing import.
- Empty histories and pre-first-commit live states need a clear persistence policy.
- Existing v1/v2 legacy document compatibility requires dedicated browser-level verification before enabling imports.
- Event fingerprints are non-cryptographic and do not prove mathematical correctness.

## Design principle
Keep mathematical proof checking separate from event replay integrity. Preserve node IDs and branches, and do not couple storage encoding to UI state.
