# Document snapshot immutability — 602-test increment

## Verified implementation

The workspace save coordinator relies on replacement document identity to determine whether a completed asynchronous save still corresponds to the current document. We have **not** introduced a separate revision counter.

The public document-controller operations were tested to ensure they publish a replacement document and leave the previous snapshot's serialized content unchanged. Tests cover activation, renaming, committing, adding and removing mathematical objects.

`captureDocument()` previously used a shallow spread for `substitutions`. It now deep-copies the supplied substitution payload, matching its already detached AST and history inputs. This prevents nested caller-owned substitution values from aliasing into a committed document snapshot.

## Verification

- 602/602 Node tests passed locally (three new tests in `tests/documentSnapshotImmutability.test.js`).
- 410/410 documentation links valid.
- Playwright has **not** been run for this increment; ask the user to run the full suite.

## Architectural caveat

These tests protect supported controller operations and input aliasing. They do not make all document objects deeply frozen, nor prevent external callers from mutating `controller.document` directly. A future boundary review should consider whether to expose read-only snapshots or make mutation pathways explicit, but only after checking existing UI consumers and performance impact. Avoid adding a redundant revision counter without evidence it simplifies persistence.
