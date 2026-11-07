# Annotation and inspection boundary (future design)

**Status:** Architectural proposal only. No independent annotation subsystem is implemented.

## Three distinct student-facing activities

- **Manipulate:** request a mathematically justified transformation of an AST through the Engine and commit it to Mathematical History.
- **Annotate:** circle, underline, highlight, label or explain an existing mathematical occurrence without changing its AST or mathematical validity.
- **Inspect:** view structure, assumptions, rule applicability or historical explanations without modifying the AST or annotations.

An annotation is human communication, not an algebraic rule or typed mathematical assumption. For example, labelling `m` as “mass” does not by itself establish units or dimensions in the Engine.

## Data and rendering proposal

Store annotation records separately from the Mathematical AST, anchored by `{documentId, objectId, nodeId}` and, where relevant, a `historyStateId`. Render them in a separate annotation overlay using the mathematical renderer's node-to-element geometry. Normal annotation decorations must not steal mathematical hit-tests; annotation-edit mode may have its own pointer handling. Preserve accessibility through textual equivalents and keyboard navigation.

The difficult case is transformation: a circled factor may split into two occurrences under distribution. Do **not** blindly copy its circle to both. Initial policy should anchor an annotation to a specific occurrence and/or historical state, and surface missing targets. Future opt-in policies could follow provenance, remain historical, or request teacher review.

Annotation creation, editing and deletion are **non-mathematical document-level changes** (or a distinct annotation event category). They must not create mathematical transformation history. Optional learning analytics, if ever added, are a separate privacy-sensitive concern.

## Future implementation boundary

Potential modules: annotation model, controller, anchor resolver and renderer. None should import or alter mathematical rule implementations. Test annotation survival across saving, branching and object copying, and avoid visually misleading automatic propagation.
