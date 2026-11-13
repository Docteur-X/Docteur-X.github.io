# Developer documentation: start here

**Authority:** the JavaScript source and the tests decide what the code does. These pages explain it; the historical records explain how it got here. When they disagree, investigate and correct the page.

## The current set

| Page | What it answers |
|---|---|
| [Handover](00_Current/Handover.md) | How to work on the project: what to preserve, reading order, the owner's way of working, how to make a change, what is next. The only handover. |
| [Overview](00_Current/Overview.md) | The layers and where everything lives. |
| [Pipelines](00_Current/Pipelines.md) | Reading (text to tree), drawing (tree to page), a step (gesture to history), saving (document to storage), file by file. |
| [Decisions](00_Current/Decisions.md) | Every owner decision that shapes the code, with its date. |
| [Status](00_Current/Status.md) | Test counts, what is done, what is next, open defects. One table, updated in place. |
| [Adding things](03_Developer_Guides/Adding_Things.md) | How to add a type, operator, function, relation, identity, gesture or rule: one folder and one registry line each. |

## Sections

| Section | Purpose |
|---|---|
| [01 Founding vision](01_Founding_Vision/Student_Agency.md) | The educational and accessibility principles behind every decision. |
| [02 Architecture](02_Architecture/Architecture_Blueprint.md) | The owner's target architecture, and future designs not yet approved ([statements and proofs](02_Architecture/Engine_Statements_Draft.md), [window manager](02_Architecture/Window_Manager_View_Slots_Future_Design.md)). |
| [03 Developer guides](03_Developer_Guides/Getting_Started.md) | Getting started, [adding things](03_Developer_Guides/Adding_Things.md), [testing](03_Developer_Guides/Testing_and_Verification.md), [code conventions](03_Developer_Guides/Code_Conventions.md), [lessons](03_Developer_Guides/Lessons.md), [design-first workflow](03_Developer_Guides/Design_First_Development_Workflow.md), [documentation maintenance](03_Developer_Guides/Documentation_Maintenance.md), [packaging](03_Developer_Guides/Windows_Compatible_Packaging.md), [import and autosave](03_Developer_Guides/Workspace_Import_Autosave_Lifecycle.md). |
| [04 Reference](04_Reference/Transformation_Contracts.md) | Technical contracts: [data model](04_Reference/Mathematical_Data_Model.md), [serialization](04_Reference/Serialization_Formats.md), [presentation contract](04_Reference/Mathematical_Presentation_Composition_Contract.md), [nested hitboxes](04_Reference/Nested_Mathematical_Hitbox_Visual_Contract.md), [negation and subtraction](04_Reference/Negation_and_Subtraction_v1.md), [terminology](04_Reference/Interaction_Intent_and_Rule_Application_Terminology.md). |
| [04 Testing](04_Testing/T1_Test_Inventory.md) | The test inventory and the test-quality plan. |
| [05 Roadmap](05_Roadmap/Known_Issues.md) | [Ideas overview](05_Roadmap/Ideas_Overview.md) (what matters now, open questions, possible orders), [known issues](05_Roadmap/Known_Issues.md) (defects and lessons, with evidence), [future features](05_Roadmap/Future_Features.md), [creative exploration](05_Roadmap/Creative_Exploration_and_Deferred_Phase6.md). |
| [06 Historical records](06_Historical_Records/README.md) | Earlier handovers, status logs, design drafts and milestone notes, kept read-only. Not current specification. The design documents superseded by this set (12 November 2026) are in [Superseded_2026-11-12](06_Historical_Records/Superseded_2026-11-12/). |

**Maintenance:** with every increment, update [Status](00_Current/Status.md) in place, add new owner decisions to [Decisions](00_Current/Decisions.md), and keep the guides true to the code. See [documentation maintenance](03_Developer_Guides/Documentation_Maintenance.md).
