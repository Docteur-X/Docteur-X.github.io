# Drag grouped composition — 2026-11-10

## Implementation
`app.js` now passes the five responsibility-grouped ports directly to `createOrdinaryDragController`: `state`, `source`, `presentation`, `policy`, and `lifecycle`. `ordinaryDragPorts.js` accepts only this grouped contract, validates all collaborators and freezes its exposed port records. No second drag state store exists.

## Test-fixture transition
Older unit tests previously built flat `pickup`/`movement` fixtures. A **test-only** adapter in `tests/helpers/legacyDragFixture.js` translates those fixtures while they are progressively modernised. It is not imported by production code and is not an approved application interface. New tests must construct grouped ports directly. The port contract suite tests that production rejects the flat shape.

## Behaviour and limitations
This is dependency wiring only. The mathematical engine, previews, history, DOM targeting and drag semantics are unchanged. Browser Playwright verification is required on the user's machine. Next: migrate remaining historical fixtures to direct grouped construction, then reduce `app.js` callback complexity and address `finishDrag` side effects. Do not introduce additional wrappers without removing old complexity.
