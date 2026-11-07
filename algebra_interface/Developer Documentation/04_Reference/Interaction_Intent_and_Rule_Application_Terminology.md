# Interaction, intent and mathematical rule application — terminology

**Status:** Maintained conceptual vocabulary (7 November 2026). This describes intended responsibilities; it is **not** a claim that all existing source identifiers have been renamed or every boundary is fully implemented.

## Guiding principle

**Students directly manipulate mathematical objects. The software interprets their intentions and faithfully applies the mathematical rules governing those objects.** The student chooses the action and, where supported, the depth of reasoning. The engine does not autonomously choose a solution strategy.

## Vocabulary and ownership

| Term | Meaning | Responsible layer |
|---|---|---|
| **Input event** | Pointer, keyboard, touch or accessibility event | Input / browser adapter |
| **Interaction** | Deliberate student activity involving mathematical objects (click, drag/drop, selection) | Interaction layer |
| **Interaction recognizer** | Recognizes **one** possible interaction pattern and proposes its interpretation; does not commit mathematics | Modular recognizer (existing `*Gesture.js` files are historical names) |
| **Interaction Interpreter** | Coordinates recognizers, resolves competing interpretations and forms a structured **intent** | Interaction interpretation / arbitration |
| **Mathematical intent** | Student-requested rule and selected mathematical targets, independent of pixels and DOM | Output of interaction interpretation |
| **Mathematical rule** | Defined mathematical law with explicit applicability conditions and, eventually, assumptions and type requirements | Mathematical Engine |
| **Rule application** | Check the requested rule's preconditions and, if applicable, construct its mathematical result | Mathematical Engine |
| **Rule Application Coordinator** | Conceptual name for the routing responsibility currently implemented by the **Transformation Coordinator**; does not select a strategy for the student | Feature registry / coordinator |
| **Mathematical result** | Proposed new AST structure and relevant provenance/conditions | Mathematical Engine |
| **Rule Application Visualiser** | Conceptual name for the currently termed **Transformation Visualiser**; shows the proposed result without committing it | Preview / visualisation layer |
| **Visual Feedback Controller** | Owns transient semantic feedback, including eligibility, selection emphasis and amber provenance styling; does not apply mathematical rules | Presentation feedback layer |
| **Commit lifecycle and history** | Confirm, reject stale or duplicate proposals, publish safely and record the student's chosen action | Commit / document layers |

**Preferred conceptual flow:** input events → interaction → recognizer proposals → Interaction Interpreter → mathematical intent → Rule Application Coordinator → Mathematical Engine rule applicability and application → proposed result → visualisation / feedback → student confirmation (when required) → history and publication.

This is a **responsibility map**, not necessarily a strict synchronous execution order: hover eligibility and transient feedback may occur before materializing a complete candidate AST.

## Words to retain in appropriate contexts

- **Transformation** remains accurate for the *change in expression structure* and for existing technical APIs (Transformation Feature Contract, `transformationCoordinator.js`). It is not a claim that the engine independently chooses what to do.
- **Manipulation** describes the student's overall activity; **direct mathematical manipulation** describes the interaction philosophy.
- **Gesture** is appropriate for low-level physical patterns such as pinch, swipe or long-press, and remains in existing file/API names pending a separately tested naming migration.
- **Operation** may mean an AST operator such as `Add`; prefer **rule application** when discussing what the engine does to a selected expression.
- **Justification** refers to the mathematical basis or assumptions of a rule, not discretionary or subjective approval. Say **check applicability** rather than “decide which mathematics is justified.”

## Applicability is not a subjective choice

The engine must apply specified rules **only when their preconditions hold**. For example, cancelling `x/x` to `1` requires `x ≠ 0`. A future assumptions framework may distinguish applicable, conditional, inapplicable and undetermined outcomes. These are mathematical/epistemic statuses, not preferences chosen by the engine. The current scalar-algebra implementation does **not** yet provide a complete context-sensitive assumptions or type system.

## Maintainer guidance

1. In new prose and design discussions, use **Interaction**, **Recognizer**, **Intent**, **Mathematical Rule** and **Rule Application** consistently.
2. In source references, preserve **actual exported names** and paths until an intentional code migration; do not silently rename imports, tests or public contracts.
3. Keep recognition separate from mathematical eligibility, visual feedback separate from candidate construction, and confirmation separate from rule application.
4. Update this one living glossary when terminology evolves. Do not create a new milestone-specific terminology file.
5. Explain rule changes in plain English, including what the student requests, what rule is applied, and what conditions must hold.
