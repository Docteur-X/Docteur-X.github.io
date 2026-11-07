# Developer documentation — start here

**Authority:** the actual source and executable tests determine current implementation; these maintained references summarize it; historical records document decisions and earlier states. When sources disagree, investigate rather than silently choosing an old claim.

**Current verified baseline:** Negation v1.2.3 (owner-reported passing Node and Playwright suites; 268/268 Node tests). This documentation-only terminology update does not change application code. See [Current status](05_Roadmap/Current_Status.md).

**Shared terminology:** [Interaction, Intent and Rule Application](04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md) explains the student-directed vocabulary and its relationship to existing code names.

**Design-first collaboration:** [Development workflow and handover agreement](03_Developer_Guides/Design_First_Development_Workflow.md).

## Fast reading paths

- **New contributor (10–20 minutes):** [Founding vision](01_Founding_Vision/Student_Agency.md) → [Current status](05_Roadmap/Current_Status.md) → [Architecture map](02_Architecture/System_Overview.md) → [Getting started](03_Developer_Guides/Getting_Started.md).
- **Implement a mathematical transformation:** [Feature guide](03_Developer_Guides/Adding_a_Transformation.md) → [Transformation framework](02_Architecture/Transformation_Framework.md) → [Contract reference](04_Reference/Transformation_Contracts.md) → relevant code and tests.
- **Work on rendering, interaction or windows:** [Rendering and interaction](02_Architecture/Rendering_and_Interaction.md) → [Roadmap](05_Roadmap/Future_Features.md).
- **Work on history/import/export:** [Documents and history](02_Architecture/Documents_and_History.md) → [Data model](04_Reference/Mathematical_Data_Model.md) → [Serialization](04_Reference/Serialization_Formats.md).
- **Continue an AI-assisted development session:** [Handover](03_Developer_Guides/AI_Handover.md), then inspect actual code.

## Documentation sections

| Section | Purpose | Authority |
|---|---|---|
| [01 Founding vision](01_Founding_Vision/Student_Agency.md) | Enduring educational and accessibility principles | Normative product direction, not feature availability |
| [02 Architecture](02_Architecture/System_Overview.md) | Current subsystem ownership and data flow | Maintained explanation; verify against source |
| [03 Developer guides](03_Developer_Guides/Getting_Started.md) | How to run, change, test and hand over | Practical procedures |
| [04 Reference](04_Reference/Transformation_Contracts.md) | Current technical interfaces and formats | Source-linked reference, not formal API stability promise |
| [05 Roadmap](05_Roadmap/Current_Status.md) | Current verified status, issues and deferred ambitions | Dated status; separate verified from proposed |
| [06 Historical records](06_Historical_Records/README.md) | Preserved milestone documents and chronicles | Historical only; **not current specification** |

**For every future maintainer:** Read the [documentation maintenance policy](03_Developer_Guides/Documentation_Maintenance.md) before updating reference files.

**Maintenance rule:** Update the relevant maintained reference and [Current Status](05_Roadmap/Current_Status.md) with each implementation change; append historical milestones rather than stacking “latest” notices in active documents. See [Documentation maintenance](03_Developer_Guides/Documentation_Maintenance.md).


### Nested mathematical hitboxes (current incremental contract)

See [Nested Mathematical Hitbox Visual Contract v1](04_Reference/Nested_Mathematical_Hitbox_Visual_Contract.md) for renderer/feedback ownership, semantic hitbox roles, and current migration limits.


Windows release packaging: [Windows-Compatible Packaging](03_Developer_Guides/Windows_Compatible_Packaging.md).

- [Negation and Subtraction v1](04_Reference/Negation_and_Subtraction_v1.md) — current AST, parser, first preview and known limitations.

- [Workspace import and autosave lifecycle](03_Developer_Guides/Workspace_Import_Autosave_Lifecycle.md) — persistence ordering and stale status prevention.
