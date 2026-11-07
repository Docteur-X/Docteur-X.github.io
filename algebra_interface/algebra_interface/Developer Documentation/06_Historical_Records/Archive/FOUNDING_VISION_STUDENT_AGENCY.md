# Founding vision: student agency in mathematical manipulation

**Status:** Enduring project vision and design principles (6 November 2026). This document describes what the Manipulator aims to be, not a claim that all features below already exist. For implementation details consult source, tests and CURRENT_STATUS.md.

## Why this project exists

The Manipulator aims to make manipulating mathematics on a computer as natural and direct as manipulating symbols on paper. Mathematical expressions should feel like structured objects that the student can select, move and transform, while remaining governed by the actual laws of mathematics.

**Founding principle: The student chooses the transformations; the software faithfully enforces mathematical rules and preserves the paths the student explores.**

This is not primarily an automatic equation solver. The computer should support a student's mathematical reasoning rather than replace their choice of strategy. A learner should be free to distribute, factorise, rearrange, introduce an identity, work with a separate expression, or take a different valid path—even if the choice is not the shortest route to an answer. An unusual but valid step must not be rejected merely because it is not the expected solution strategy.

## Three connected aims

1. **Manipulate mathematics:** give mathematical structures direct, meaningful gestures; the mathematical engine independently checks the operation, its assumptions and its domain.
2. **Express mathematical reasoning:** students decide which transformations to apply and when, explore alternatives and branches, and work with multiple mathematical objects in a worksheet.
3. **Communicate mathematical understanding:** preserve enough structured history, provenance and optional explanation that students, teachers and future software can inspect or replay how a result was obtained.

The system can record *what* was transformed and *which rule* justified it. It must not pretend that gesture/history data alone reveals *why the student chose* a particular step. Future annotations and explanations should let learners supply their own higher-level reasoning.

## Agency without compromising correctness

- **Student owns strategy.** Never silently auto-solve, auto-simplify, or choose the next rule as the only permitted path. Suggestions and teaching scaffolds should be optional or governed by explicit teaching policy.
- **Mathematical engine owns validity.** Gestures indicate intent, not proof. Rules must check types, domains, assumptions and direction of implication; a forward consequence must not be misrepresented as a reversible equivalence.
- **Previews are proposals, not commits.** Feedback and optional visualization should clarify a possible change. Only deliberate acceptance updates authoritative mathematical-object state and history.
- **Preserve identity and provenance.** Mathematical occurrences, transformations and branches should remain inspectable and reproducible; a replay of recorded steps is not automatically a proof of the student's overall strategy.
- **Separate mathematics from its views.** A document is a worksheet containing multiple mathematical objects. Windows, gestures, annotations, highlights and renderings must not determine mathematical truth.
- **Accessible by design.** Ordinary algebra should remain usable offline on inexpensive, older hardware, with keyboard and touch access and graceful reduction of visual effects rather than weaker mathematical checks.

## Architectural implications for contributors

A new mathematical feature should have a discoverable mathematical rule, one or more gesture adapters, eligibility feedback and an optional transformation visualizer. The gesture interpreter recognizes possible intent; the transformation coordinator requests an engine proposal and owns confirmation/cancellation; the renderer owns notation and hitbox geometry; the visual layer communicates semantic roles without inventing mathematical rules. The authoritative mathematical object is changed only through a validated commit.

This is a design direction. Current integration is not yet fully consolidated: app.js contains feature-specific wiring and equality application has bypassed parts of the transformation registry. Do not treat the aspirational contract as a description of fully implemented code.

## Product test for future decisions

Before adding a feature, ask:

1. Does it empower students to manipulate mathematics, express reasoning or communicate understanding?
2. Does it preserve student choice rather than taking over the solution strategy?
3. Can the engine justify its mathematical effects independently of the gesture and renderer?
4. Can the result be inspected, undone, branched or explained without inventing missing reasoning?
5. Will the implementation remain understandable and extensible to logical statements, vectors, matrices, multiple views and low-resource devices?

When priorities conflict, mathematical correctness and learner agency outrank visual novelty and automatic convenience.

## Deferred ambitions (not yet implemented)

Relation-specific operations and arbitrary functions with domain/monotonicity conditions; justified substitution; richer statements and logical connectors; cross-object reasoning; movable/snapping/resizable windows with multiple views of the same object; annotations anchored to mathematical identities; performance budgets and low-resource rendering. These should grow from the same principles without becoming prerequisites for basic algebra.
