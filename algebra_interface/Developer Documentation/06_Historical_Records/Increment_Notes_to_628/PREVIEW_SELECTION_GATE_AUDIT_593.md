# Preview interaction gate: selection entry points (2026-11-10)

## Verified baseline and scope

The user reported that Playwright passed for the 593-test commit/cleanup version. This increment changes only selection-entry guards in `js/app.js`; it does not change mathematical rules, commit, preview host, or AST ownership. Local Node tests: 593/593. Documentation links: 408/408. Browser verification for this increment is pending.

## Entry-point audit

| Input route | Before this increment | After this increment |
| --- | --- | --- |
| Equation keyboard selection and commands | Shared modal gate | Unchanged |
| Ordinary drag completion | Shared modal gate | Unchanged |
| Touch selection (`selectTouchNode`) | Feature-specific flags at upstream pointer handler | Shared gate at selection mutation boundary |
| Ctrl/Cmd range selection (`toggleRangeSelection`) | Grouping mode only | Shared gate at selection mutation boundary |
| Multi-select toolbar toggle | Feature-specific preview flags | Shared gate before mutation |
| Nested/root occurrence click selection | Feature-specific flags | Shared gate before mutation |
| Identity toolbar pickup | Explicit modal ownership check | Unchanged |
| Negation preview request | Explicit modal ownership check | Unchanged |
| Factorisation/grouping preview requests | Explicit modal ownership check | Unchanged |

## Important boundaries and follow-up

Selection is not necessarily a mathematical transformation, but selection state is relevant to a pending grouping/factorisation proposal. A modal preview should not permit a different input method to mutate that state. The gate reads the existing modal ownership registry; no second state store is introduced. Existing feature-specific preview confirmation and cancellation controls remain exempt, and outside-click cancellation must consume its initiating gesture.

This is **not** a complete proof that every toolbar or document command respects modal exclusivity. Browser-test touch, Ctrl/Cmd selection, multi-select toolbar, nested click, preview confirmation and cancellation, and cross-family locks. Subsequently audit other application-level toolbar commands and modal ownership invalidation during workspace/history transitions. Avoid adding per-feature lock flags when the shared registry suffices.
