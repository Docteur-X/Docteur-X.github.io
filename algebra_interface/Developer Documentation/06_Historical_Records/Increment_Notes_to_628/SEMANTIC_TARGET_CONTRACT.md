# Semantic Target Contract — experimental implementation

Status: implemented in working copy, not yet wired into production interaction dispatch. Updated 2026-11-10.

## Purpose

Keep renderer geometry and DOM details outside gesture recognisers and mathematical rules. The AST remains authoritative for node existence; the renderer declares which occurrences, content containers and operators are currently represented by DOM targets. A view-local resolver bridges these two worlds in both directions.

## Public methods

- `refresh()` rebuilds the AST occurrence index and DOM target index after rendering or object changes.
- `resolve({ mathematicalObjectId, nodeId, targetRole?, operatorPosition? })` returns attached DOM targets for a mathematical address. Existing API preserved.
- `addressFromElement(element, { mathematicalObjectId })` returns a frozen semantic address or `null`. It walks upward from an event target to the nearest indexed semantic target, stopping at the view boundary. It does not return DOM nodes.
- `describe(nodeId)` reports the occurrence's semantic structure and representation availability.

Address: `{ mathematicalObjectId, nodeId, role: 'occurrence' | 'content' | 'operator', operatorPosition? }`. Operator position is the renderer's 1-based boundary index when supplied. The `semanticInput` envelope separately holds `viewId` and `objectId`.

## Invariants

1. Only renderer-declared metadata on elements indexed during refresh counts as a semantic target.
2. AST identity is not inferred from CSS class, pixel position, text, or a nearby sibling.
3. An element detached from this view is unavailable; another view's elements are unavailable even if node IDs match.
4. A descendant resolves to the nearest indexed ancestor, enabling nested expression hitboxes.
5. Malformed operator indices do not produce semantic addresses.
6. Reverse resolution does not validate rule eligibility or authorize a commit.
7. No production handlers are changed by this increment.

## Known limitations / decisions to discuss

- DOM mutations after `refresh()` that reuse indexed elements can leave stale metadata until the next refresh; consider a renderer generation/epoch contract before wiring production events.
- Actual browser hit-testing, pointer capture, focus, keyboard navigation, and accessibility semantics need end-to-end validation.
- Role precedence on overlapping elements is currently occurrence, then content, then operator; the Renderer should avoid declaring multiple conflicting roles on the same element.
- Existing operator metadata does not universally encode a boundary index; indexless operators are supported.
- The existing negation adapter still uses a CSS selector. Replace it only after confirming real markup and integration with preview locking.

## Evidence

`tests/semantic-reverse-targets.test.js` (3 tests) and all existing Node tests: 459/459 passed on 2026-11-10. No browser test was run in this increment.
