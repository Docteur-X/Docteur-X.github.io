# Window Manager and independently viewable mathematical regions (future design)

Status: design note only. No window-manager, persistence, or AST schema changes are implemented here.

A Mathematical Object (MOb) may eventually be too large to display in a single mathematical window. A future Window Manager should be able to mount **independently viewable regions** of the same MOb into stable, non-mathematical structural slots. These slots are presentation and interaction locations, **not** Add/Multiply/Group AST nodes and not automatically mathematical occurrences.

## Proposed responsibilities

- The Mathematical Engine owns the authoritative mathematical structure and occurrence IDs.
- A Document owns MObs and persistent interface state.
- The Window Manager owns windows, view lifecycle, focus, and associations between a window/slot and a particular MOb region.
- The Renderer receives the selected AST subtree and presentation context and constructs meaningful nested mathematical containers within a slot.
- Interaction targets resolve back to the authoritative MOb and node/operator identity, regardless of which window displays them.
- The Visual Feedback Controller decorates the relevant visible targets without modifying the AST or causing unwanted equation reflow.

## Open design questions

- How to identify a viewable region robustly across rule applications, history navigation, and node replacement.
- How to coordinate multiple windows showing overlapping regions of the same MOb.
- How to represent region boundaries and contextual scope without creating artificial AST operators.
- Whether view slots can follow a stable structural location, a stable node occurrence, or an explicit rule-provided continuity relation.
- How selection, focus, proxies, and provenance interact across different views.

**Do not implement rule-following proxy continuity or structural slots by silently reassigning node IDs.** Preserve the distinction between occurrence identity, view-slot identity, and mathematical provenance.
