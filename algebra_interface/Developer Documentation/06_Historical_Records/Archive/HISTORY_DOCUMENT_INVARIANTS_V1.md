# History and Document Invariants v1 (2026-11-05)

## Scope and status

Increment 1 introduces `js/core/documentInvariants.js`, a pure, **opt-in** integrity audit. It is not wired into `validateDocument`, IndexedDB, import, export, or editor commits. Existing document loading and legacy migration remain unchanged. This distinction is intentional: current live flows may hold an expression with an empty history, or substitutions differing from the latest historical snapshot.

## Contracts checked

- `assertAstInvariants(root)`: supported node types, required fields, finite numbers, valid bracket/multiplication styles, expression-only children, and unique nonempty node IDs **within each AST**. An `Equal` statement is allowed only at the root.
- `assertPatchInvariants(patch)`: patch list, known operations, safe path components, required set values, and non-removable root. This is **schema validation**, not a complete path-existence or bounds check; actual replay applies patches and checks fingerprints.
- `assertHistoryInvariants(history)`: v2 history header, unique positive state IDs, valid cursor/counter, exactly one root for nonempty histories, reciprocal parent/child links, event identity and version, patch shape, snapshot ASTs, fingerprints, and deterministic replay for every branch. A history without nodes requires cursor null and counter 1.
- `assertDocumentInvariants(doc)`: v2 object collection and active selection, object kind matching its root, independent history integrity, and exact root/substitution equality with the current history snapshot when history is nonempty.

## Architectural boundaries

The audit validates *data consistency*, not algebraic equivalence or proof validity. Fingerprints are noncryptographic and do not authenticate imported data. Snapshot equality currently uses JSON serialization and therefore assumes JSON-compatible objects. No implicit repair is performed. Cross-object node-ID uniqueness is not required: node IDs are occurrence identities scoped to an object/history, and distinct objects can preserve copied historical IDs until copy-as-new-object semantics are designed.

## Follow-up before enforcing on import

1. Decide how to represent and persist an expression with an empty history and live substitutions that differ from the cursor snapshot.
2. Define explicit format/version handling and legacy migration policy, including partial histories and historical metadata.
3. Add resource limits, JSON-only shape checks, patch target existence/array-index checks, and adversarial payload tests before accepting untrusted imports.
4. Validate AST coverage against any newly introduced node types, including `FunctionCall.arguments` in node-ID reservation.
5. Only then integrate the audit with transactional import and hydration, ensuring failures leave the workspace untouched.

## Verification

Run `node --test tests/*.test.js`. Baseline: 172 tests. With six new tests in `tests/document-invariants.test.js`: 178 passing in the build environment. Browser Playwright suite was not rerun in this increment; the user previously reported 10 passing browser tests on the original baseline.
