> **Update (2026-11-06):** This is the historical first-integration guide. For the current contract and equality registration, see [Transformation Feature Contract v1](TRANSFORMATION_FEATURE_CONTRACT_V1.md). The seven-rule counts below describe the earlier version.

# Transformation Feature Registry v1

Status: **implemented (first integration)**. The registry groups references to existing Engine rules, gesture adapters, semantic visual adapters, and confirmation policy. It does **not** implement a plugin loader or own the DOM.

## Why it exists

A mathematical rule must remain usable without a mouse or renderer. The Manipulator can expose that rule through multiple input methods and visual explanations. A stable rule ID connects these independently implemented responsibilities and can also identify the rule in committed history.

## Modules and ownership

- `js/manipulator/transformationFeatures.js`: validates and stores immutable feature descriptors; rejects duplicate IDs.
- `js/manipulator/transformationCoordinator.js`: resolves a rule ID, calls the registered pure proposal function, and optionally requests a semantic visual descriptor.
- `js/manipulator/*Gesture.js`: converts physical interactions into DOM-free action requests. A rule can have more than one input method.
- `js/manipulator/*Visual.js`: returns semantic descriptions of the preview or feedback; does not calculate validity or commit history.
- `js/operations/` and other mathematical modules: own mathematical eligibility and transformations. The Engine never imports the registry or UI.
- `js/app.js`: assembles the seven registered rule IDs and retains the existing, proven drag/preview lifecycles. The five interaction families are identity insertion, distribution, grouping, factorisation, and rearrangement.

## Adding a transformation

1. Implement or reuse a mathematically sound Engine proposal function. It must not manipulate the DOM or history.
2. Define a stable rule ID and a gesture/action-request adapter (or another input route).
3. Optionally define a semantic visual descriptor; reuse generic feedback patterns when possible.
4. Register the feature once with `createTransformationFeatureRegistry`, including `confirmationMode` (`preview` or `immediate`).
5. Add tests for rule eligibility, request translation, preview cancellation/staleness, provenance and browser interaction. Update the current-status and feature documentation.

Example (illustrative, not a currently registered rule):

```js
const feature = {
  id: 'example.rule',
  propose: proposeExample,       // Engine-owned pure proposal
  gesture: exampleActionRequest, // Optional interaction adapter
  visual: describeExample,      // Optional semantic descriptor
  confirmationMode: 'preview'
};
```

## Architectural constraints

- Requests are intentions; history records only **committed** mathematical changes. Hover, drag and cancelled previews do not enter mathematical history.
- A registry lookup is not a mathematical permission check. The Engine and teaching policy remain authoritative.
- Registry metadata is not an AST, renderer, event log or dynamic plugin framework.
- The current v1 registry centralises registration and rule dispatch. The existing operation-specific hover and preview DOM paths remain in place; extracting all UI orchestration from `app.js` is a future incremental step, not an implemented claim.
- The coordinator retains compatibility with its earlier map-of-rules API for external callers during migration.
- Document operations (creating/copying/deleting objects) belong to document history, not to mathematical transformation features.

## Verification

Run `node --test tests/*.test.js`. At implementation, 168 tests passed. Browser verification is still recommended for all five gesture families, especially rapid rearrangement and nested equation transformations.


## Future confirmation and replay extension (not implemented)

`confirmationMode` is currently a fixed descriptor value. Future features may advertise supported modes and a default; the runtime should resolve teaching-policy requirements before user preferences. The same Engine proposal must produce equivalent mathematical commits in preview and immediate modes. Historical visual replay should reuse semantic visual adapters but operate on inspected historical states without committing anything. See [pedagogical vision](PEDAGOGICAL_VISION.md) and [history semantics](HISTORY_SEMANTICS_AND_REPLAY.md).
