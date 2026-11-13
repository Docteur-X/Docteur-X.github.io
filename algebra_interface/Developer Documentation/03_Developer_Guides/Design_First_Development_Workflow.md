# Design-first development workflow and collaboration agreement

**Status:** Maintained developer guide. **Audience:** future developers, AI assistants and project owner. **Scope:** substantial new mathematical capabilities, gestures, data-model changes and architectural changes. Small fixes can use a shorter version. **Do not treat this guide as evidence that a proposed feature already exists.**

## Founding priorities

The Manipulator gives students agency: students choose mathematical transformations; the software checks mathematical rules and records inspectable reasoning. It should also support **adjustable reasoning depth**: a teacher or learner can decide when a topic deserves detailed, student-driven transformations versus a justified higher-level operation (for example, using a quadratic-roots tool while focusing on mechanics). Shortcuts must respect mathematical preconditions, identify the invoked rule, and must not falsely record intermediate steps as performed by the student. Educational policy governs availability and presentation, never mathematical truth. Preserve offline usability, accessibility on low-end hardware, stable node identities, modularity, and future vectors, matrices, relations, statements, annotations and multi-view windows.

## Before substantial implementation: discuss and agree

Keep the discussion conversational and proportionate, not a bureaucratic questionnaire. The project owner steers educational purpose, mathematical intuition and student experience; the implementing assistant/developer translates that into design options, module boundaries and verifiable implementation.

1. **Purpose and testable requirements.** What problem does this solve for a student or teacher? Distinguish enduring vision from observable requirements (e.g., no unrequested automatic mathematical commits).
2. **Interaction and reasoning depth.** How is it invoked by pointer, touch, keyboard or menu? Which gestures compete? What eligibility feedback, optional preview and confirmation are appropriate? Who controls shortcuts and depth of working?
3. **Mathematics and data.** Define validity, assumptions, direction of implication, inputs and result. Identify authoritative Mathematical Object/AST state, derived information, transient interaction state, persistence and node-ID/provenance rules. Rules propose on detached data; only authorized commits update the authoritative object.
4. **Boundaries and information flow.** Identify existing owners for gesture interpretation, transformation registration/coordinator, pure mathematical rule, visual feedback, renderer/visualiser, commit/history and document persistence. Prefer extending existing contracts over adding feature-specific logic to `app.js`.
5. **Architectural alternatives.** Compare plausible simple designs and their costs (including whether event-driven, command-like, state-machine or direct calls are warranted). Choose the least complex design that meets foreseeable requirements; do not introduce patterns for fashion.
6. **Short design proposal and verification plan.** Summarize the agreed approach, invariants, alternatives rejected, risks, test cases, browser/manual checks and documentation to update. Confirm important design choices with the owner before significant implementation.

For exploratory prototypes, state what is temporary and what is not yet an architectural commitment. For tiny visual fixes, abbreviate the discussion appropriately.

## During implementation

- Inspect actual code and tests; documentation can be stale. Preserve the last verified release and work in bounded increments.
- Maintain mathematical correctness and student agency; avoid silent automatic transformations.
- Keep pure mathematical rules independent of DOM and storage; use registered transformation requests and shared stale-safe commit/publication infrastructure where appropriate.
- Preserve node identities, history branches, mathematical provenance and non-mutating previews.
- Add plentiful explanatory code comments **where they clarify invariants and non-obvious reasoning**, rather than narrating syntax.
- Test mathematical rules independently, then gesture eligibility, visual preview, cancellation, confirmation, persistence and browser behaviour. Synchronize Playwright gestures with observable eligibility feedback rather than arbitrary sleeps.
- Measure performance when changes may affect low-end devices; do not assume tests prove responsiveness.

## After implementation: report clearly

Provide a concise **plain-English takeaway** first: what changed, why it matters to the student or future maintainer, and what did *not* change. Then provide a compact architecture summary (modules/responsibilities), precise verification results (independently run vs owner-reported; Node vs browser), known limitations, and a link to the verified artifact when available. Never claim tests passed if they were not run.

Update the **living** architecture/reference documents, current status, known issues and **single current AI handover** in place. Create a short architecture decision record only for an enduring consequential decision; do not produce a new historical Markdown file for every increment. Follow [Documentation Maintenance](Documentation_Maintenance.md).

## New-chat / new-maintainer protocol

Read [Founding Vision](../01_Founding_Vision/Student_Agency.md), the [Handover](../00_Current/Handover.md), [Status](../00_Current/Status.md), [Overview](../00_Current/Overview.md) and this guide. Then inspect the relevant code and tests directly; do not treat archived records as current truth. Ask the owner about the next feature rather than presuming the historical roadmap remains binding. Continue with a brief design discussion before substantial implementation, and explain important outcomes in plain English afterward.
