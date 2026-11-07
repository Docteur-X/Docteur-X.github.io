# Pedagogical vision — making mathematical reasoning inspectable

**Status:** Enduring product principles and proposed future capabilities, 5 November 2026. This is not a claim that the teaching website or explanation-depth controls exist.

For the overarching principle that **students choose the mathematical transformations while the software enforces mathematical validity**, see [Founding vision: student agency](FOUNDING_VISION_STUDENT_AGENCY.md).

## Educational problem

Experts routinely compress algebraic steps while solving larger problems (including physics). Beginners may know a rule yet temporarily forget its applicability or lose the thread when a textbook omits a step. Conversely, forcing every elementary step to be explicitly justified can interrupt fluent thinking. The cost of either mismatch accumulates as the student works.

**Guiding principle:** Make mathematical reasoning explicit when it supports understanding, and unobtrusive when it interrupts fluent work. Every compressed step should remain inspectable and justifiable.

The Manipulator makes mental mathematical structure tangible: identifiable subexpressions, eligible gestures, mathematical constraints, and provenance-based visual explanations. These are *representations* of mathematical laws, not their proofs. Explicit teaching of rules should precede expecting fluency, while optional inspection should remain available during independent problem solving.

## Intended learning progression

1. **Explicit instruction:** teach the rule, its conditions, and its visual/mathematical justification before asking for independent use.
2. **Guided manipulation:** the learner performs steps with meaningful hover feedback and optional explanatory previews.
3. **Fluent problem solving:** familiar rules can require fewer interruptions, while a learner can inspect, expand or replay a step on demand.

Scaffolding should eventually be **per rule**, not solely a global beginner/expert switch. A student may be fluent in commutativity but still need detailed factorisation previews. Do not infer mastery or remove access to explanations based on a few successful actions.

## Reversible explanatory depth

A mathematical transformation has invariant validity and a committed result, regardless of how much explanation is shown. Presentation can vary from full provenance arrows and rule conditions to a minimal immediate commit. A later **Explain this step** view should recover the rule, assumptions, mathematical correspondence and, where supported, a visual explanation. An expanded explanation is a view, **not an invented sequence of committed micro-steps**.

### Configurable confirmation (proposed)

The registry currently stores a single `confirmationMode` (`preview` or `immediate`). A future version may advertise supported modes and a default, with resolution by **feature capabilities → teaching-policy restrictions → permitted user preference**. Teachers can require previews when introducing a rule; learners can choose immediate execution when allowed. Confirmation mode must not change mathematical validity or the semantics of history events.

## Historical navigation and replay (proposed)

- **Navigate:** move through stored history states with a timeline/slider, initially read-only. Branching history needs branch selection or a graph; a simple slider describes only one chosen path.
- **Inspect:** view a rule's justification, assumptions, before/after structures and provenance.
- **Replay:** reconstruct the *visual explanation of a committed step* using the feature's visual adapter, without changing history. This need not reproduce the exact original mouse movement or animation.
- **Reapply / Continue from here:** an explicit action may create a new branch from a historical state. Merely scrubbing must not move the committed history cursor or create a history event.

Replay requires stable rule identifiers, version/semantics, source/result states, node correspondences, assumptions and enough provenance for a trustworthy explanation. Structural patches alone may not explain *why* a step is valid. When old visual adapters or rule versions are unavailable, fall back to an honest textual/structural explanation rather than inventing provenance.

## Teaching website and embeddability (proposed)

A future website may provide lessons, exercises, reflection prompts and progress tracking, while an embedded Manipulator handles mathematical interaction and the Engine remains independently callable. The website should consume a stable API for loading an object, configuring permitted rules, and observing committed transformations; it should not implement algebraic validity itself. Begin with a few interactive lessons and test with educators/students before investing in accounts or analytics.

## Verification questions for future developers

- Can students request *why* a step was valid without interrupting an advanced workflow?
- Does changing explanation depth leave ASTs, node IDs, validity and history identical?
- Can a historical replay explain provenance without modifying the active Mathematical Object?
- Do visuals make structural meaning clear without implying that moving pixels is a mathematical proof?
- Does the experience remain keyboard-accessible and usable on low-end hardware?
