# Ordinary drag dependency ports (541-test increment)

Status: implemented and Node-tested on 2026-11-10; Playwright verification pending.

## Motivation

The unified ordinary drag controller had a flat pickup dependency object and a separate movement dependency object, with state ownership injected separately. Understanding which callback was allowed to read mathematics, measure geometry, apply policy or finish a gesture required reading both helpers and the composition root. This increment establishes one explicit internal contract while preserving the production wiring and mathematical behaviour.

## Implemented architecture

`js/interaction/ordinaryDragPorts.js` validates the complete injected configuration at controller construction and returns five frozen, responsibility-grouped ports:

- `state`: the existing application-owned drag state getter/publisher. No duplicate store.
- `source`: view identity, semantic resolver, AST/root and source freshness access, and session creation.
- `presentation`: ghost creation/positioning, geometry capture, feedback and equation bounds.
- `policy`: whether another gesture may begin, additionally gated by authoritative drag exclusivity.
- `lifecycle`: target update and completion/cancellation callbacks, still implemented by existing application code.

`ordinaryDragController.js` now assembles pickup and movement exclusively from these grouped ports. No transformation rule, AST mutation, preview host or history implementation was rewritten. The externally supplied `pickup`, `movement`, `state` configuration is intentionally unchanged in this increment to avoid a broad simultaneous change to application wiring and existing tests. This is *not* a second controller or compatibility state store. The next stage may migrate the public configuration to grouped ports, after browser verification.

## Verification

- 541/541 Node tests passed; four new `ordinaryDragPorts.test.js` tests cover grouping, frozen port records, and fail-closed validation of incomplete source/presentation/lifecycle/feedback dependencies.
- 406/406 relative documentation links valid.
- User's previous 537-test archive passed Playwright. This 541-test archive requires user browser verification.

## Known limitations and next steps

- Grouping currently occurs inside the controller; the application composition root still supplies the legacy-shaped flat dependency configuration. Do not call this a complete app.js decoupling.
- Port records are frozen, but callback closures still observe mutable application state by design. Freezing does not make callbacks pure.
- `finishDrag` still coordinates feature-specific preview/commit effects; a later increment should separate those without compromising commit-time mathematical revalidation.
- Verify nested/Alt dragging, rearrangement, distribution, release cancellation and preview exclusivity in Playwright before migrating the public dependency contract.
