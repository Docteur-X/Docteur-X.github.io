# Transformation Features and Reversible Explanatory Depth

**Status (5 November 2026):** The lightweight Transformation Feature Registry v1 **is implemented** for seven rule IDs across five interaction families. Adjustable confirmation, history explanation/replay and rule-specific scaffolding are **proposals, not implemented**. See [registry v1](TRANSFORMATION_FEATURE_REGISTRY_V1.md).

## Transformation Feature: a conceptual unit, not a monolithic file

A **Transformation Feature** associates the independent components needed to expose one mathematical capability: an Engine rule (or rules), one or more gesture/action adapters, hover-feedback semantics, a visual explanation adapter, and a confirmation policy. The implemented small explicit registry keyed by stable rule IDs makes these associations discoverable and reduces duplicated rule dispatch; `app.js` still owns significant UI orchestration.

The feature definition **must not merge responsibilities**. The Engine remains browser/DOM-independent and callable without a gesture. A rule can have multiple gestures (or none); feedback and visual patterns can be shared across features. The renderer owns mathematical notation and layout; visual adapters describe explanatory roles, not mathematical truth or pixel coordinates. Registry v1 already uses the five migrated interactions as concrete contract tests; it is not an elaborate plugin framework.

Proposed flow: input -> hit-testing/gesture adapter -> action request -> transformation coordinator -> Engine validation/candidate + provenance -> hover feedback or preview coordinator/visual adapter -> renderer -> confirmed document/history commit. Hover and cancelled previews do not mutate the committed AST.

## Mathematical history vs document history

**Mathematical history** records *committed* mathematical transformations of a Mathematical Object: rule ID and version/semantics where necessary, validated parameters, source state, resulting structural change, node IDs, assumptions and provenance. The request is an intention, **not** automatically an event; only a successful commit creates a mathematical-history record. Identical mathematical transformations invoked by mouse, keyboard or API should have equivalent mathematical records.

**Document history** records lasting organisational operations such as creating, copying, deleting or reordering Mathematical Objects. Future cross-object operations may require coordinated atomic commits and references between the two histories. Neither history should normally store cursor coordinates, hover states, temporary selections, preview openings or cancellations. Optional learning analytics, if developed, must be separate and privacy-conscious.

## Pedagogical principle: reversible explanatory depth

**Make mathematical reasoning explicit when it supports understanding, and unobtrusive when it would interrupt fluent problem-solving. Every compressed mathematical step should remain inspectable and justifiable.**

Experienced mathematicians compress routine steps mentally. Beginners may need the underlying structure, assumptions and justification made tangible through hitboxes, gestures, faded terms, arrows and previews. Too little explanation hides the reasoning; too much can interrupt attention and fluency. The Manipulator should eventually support *explanation on demand* and adjustable, preferably rule-specific scaffolding:

1. **Explicit instruction:** show rule, conditions, provenance and detailed visual explanation.
2. **Guided manipulation:** student performs the step; show meaningful feedback and offer deeper explanation when requested.
3. **Fluent work:** minimise interruption for familiar steps, but allow a later “Why is this valid?” inspection or expansion into smaller justified steps.

The mathematical validity and committed result **must not vary** with explanation depth. Teaching policy may control available actions; presentation settings control how much justification is shown. Avoid inferring mastery from a few interactions or hiding explanations irreversibly.

## Implications for future implementation

- Keep mathematical history rich enough to reconstruct a trustworthy justification: rule identity, inputs, assumptions/domain restrictions, source/target node provenance, and relevant rule versions. A before/after snapshot alone may be insufficient. Do not promise exact animation replay from mathematical history alone.
- Explanations should be derived from the rule and its provenance, not fabricated by the visual layer from visual similarity. The Engine gives mathematical facts; the visualiser chooses pedagogical presentation.
- An expandable step is an **explanatory view**, not necessarily a new branch or additional committed history events. Do not silently insert reconstructed micro-steps into the student's actual work.
- A gesture is a representation of a law, not its proof. Make the mathematical justification accessible even when students learn through movement.
- Preserve low-end-device usability, keyboard accessibility, and the existing stable drag geometry; do not sacrifice meaningful visual explanations merely to minimise rendering work.

## Adoption path and tests

The feature associations and minimal registry are implemented. Next, prototype one inspectable history step (e.g. distribution) with two explanation depths. Test that changing explanation depth never alters mathematical results, history, or node IDs; that gesture and keyboard invocations record equivalent mathematical events; and that explanations remain correct under branching and imported histories. Evaluate comprehension and cognitive load with educators and students before adding more modes.

Related: [MANIPULATOR_ARCHITECTURE_V1.md](MANIPULATOR_ARCHITECTURE_V1.md), [EVENT_SOURCED_HISTORY.md](EVENT_SOURCED_HISTORY.md), [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md), [FUTURE_FEATURES.md](FUTURE_FEATURES.md).
