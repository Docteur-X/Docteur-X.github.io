# Increment 2.1 — Serialization and History Validation Hardening

## Scope

Opt-in only. No IndexedDB, application import/export, mathematical transformation, or UI behavior is changed.

## Contracts

- `serializationLimits.js` provides conservative limits for JSON depth, value counts, array/object size, approximate serialized bytes, mathematical objects, history nodes, and patch operations.
- `assertBoundedJson` uses an explicit stack, rejects cycles, sparse arrays, unsupported values and non-plain objects. Byte estimation is deliberately conservative and not a substitute for an external request-body size limit.
- Compact envelopes accept exactly `format`, `formatVersion`, and `document`. Legacy full documents remain accepted through the existing document migration path.
- History hydration reconstructs states parent-first, applying each event once rather than repeatedly replaying each root-to-node path. Fingerprints are still checked.
- Invariant auditing reuses the hydrator to verify snapshots and adds basic resource and patch-schema checks.
- Empty histories are still valid for newly created mathematical objects; this remains an explicit compatibility policy, not a guarantee of a complete edit trail.

## Limitations / decisions before Increment 3

- Fingerprints are non-cryptographic and do not prove mathematical validity or defend against intentional forgery.
- The patch validator is a structural filter; target-aware patch semantics and allowed AST field schemas require further hardening before hostile-file import.
- AST inspection is recursive and should be made depth-bounded before exposing this path to arbitrary input. JSON depth limits prevent overly deep documents at the serialization adapter, but standalone invariant functions are not a hardened public import API.
- Full documents may include legacy extension fields; the compact envelope is strict, while the document schema deliberately remains backward-compatible.
- Validation currently reconstructs snapshots and may use significant memory for large expression trees. Limits are safety ceilings, not performance targets.
- Browser tests should be rerun when the adapter is wired into application import/export.

## Verification

Run `node --test tests/*.test.js`. Additional tests exercise envelope rejection, bounded JSON, patch schemas, branching hydration and empty objects.
