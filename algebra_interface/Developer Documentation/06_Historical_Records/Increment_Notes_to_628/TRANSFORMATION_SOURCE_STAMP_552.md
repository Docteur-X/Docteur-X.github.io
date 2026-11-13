# Canonical mathematical-source stamp — 552-test increment

`js/interaction/transformationSourceStamp.js` provides the sole app-level
constructor for the mathematical source stamp. It requires exactly the five
fields used by the existing application: document ID, mathematical object ID,
history revision, AST root ID, and serialized AST fingerprint. The result is
frozen. The comparison in `ordinaryDragSourceStamp.js` remains generic because
controller unit fixtures intentionally use smaller synthetic stamp records.

The canonical producer rejects undefined or object-valued identities, NaN,
infinite numbers, and non-string fingerprints. `null` is allowed explicitly
for a missing object/root. Pickup rechecks the stamp after effectful ghost
and geometry callbacks; semantic sessions and commits have separate freshness
guards. No DOM geometry is encoded in this stamp.

Four tests added in `tests/transformationSourceStamp.test.js`.
552/552 Node tests passed; Playwright pending. Future work: authoritative
object revisions to avoid repeated serialization, without weakening freshness.
