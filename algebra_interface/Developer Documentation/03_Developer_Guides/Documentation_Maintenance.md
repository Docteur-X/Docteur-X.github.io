# Documentation maintenance policy

**Status:** Maintained developer policy. **Purpose:** keep the Manipulator understandable without accumulating another library of contradictory milestone notes.

## 1. What is authoritative?

- **Mathematical truth and intended educational behaviour:** the founding vision, mathematical definitions, explicit assumptions and reviewed design decisions. A passing test does not establish mathematical truth by itself.
- **What the software currently does:** inspect running source code, supported interfaces and relevant tests. Treat documentation as a guide, not gospel.
- **Current explanations and procedures:** maintained documents in `01_Founding_Vision` through `05_Roadmap`. Correct these when the implementation changes.
- **Past decisions and superseded designs:** `06_Historical_Records`. These explain history; they do not define the current implementation.

When these disagree, investigate the discrepancy and document the resolution. Never silently rewrite a mathematical rule merely to match old prose or a green test.

## 2. Document ownership and update locations

| Change | Update in place |
|---|---|
| Any released code change | `00_Current/Status.md`: the table, updated in place (test counts, done, next) |
| An owner decision | `00_Current/Decisions.md`, with its date |
| A change to a pipeline or the folder map | `00_Current/Pipelines.md` or `00_Current/Overview.md` (the files they name are checked to exist) |
| A change to the owner's target or a future design | Relevant `02_Architecture/` document |
| Mathematical data, API or serialization contract | Relevant `04_Reference/` document |
| Developer workflow or test commands | Relevant `03_Developer_Guides/` document |
| New limitation or unresolved defect | `05_Roadmap/Known_Issues.md` |
| Proposed capability or deferred work | `05_Roadmap/Future_Features.md` (clearly label *proposed*) |
| How to continue, the owner's way of working | The single `00_Current/Handover.md` |
| Fundamental educational goal | `01_Founding_Vision/`, only after explicit product-level agreement |

**Do not create a new milestone Markdown document by default.** Edit the living document in place. Create a new reference only when it has a distinct, enduring audience and responsibility.

## 3. For each implementation increment

1. **Read before writing.** Inspect the relevant source, tests and maintained references. Check historical notes only where they help explain intent.
2. **State the change clearly.** Record what changed, what did not, and which subsystem owns the behaviour. Keep mathematical correctness separate from teaching preferences and UI presentation.
3. **Update affected living docs in the same increment as code.** Remove or replace obsolete claims rather than appending another “latest version” banner.
4. **Update current status and the single handover.** Distinguish *implemented*, *Node-tested*, *browser-tested*, *manually verified*, and *proposed*. Never claim tests were run if they were only reported by the project owner.
5. **Record known limitations.** Do not hide unfinished work under a green test count.
6. **Check links, paths and examples.** Verify relative Markdown links, source paths, commands and relevant code snippets against the actual repository.
7. **Review for duplication.** Link to the authoritative explanation rather than repeating it across several files.

A documentation-only change should not alter source code, mathematical state or persistence formats. Test the application only as necessary and state what was actually run.

## 4. Keep documents short and navigable

- When a phase or review batch finishes, move its record to `06_Historical_Records` and keep only lasting facts in living documents.
- Current test counts and status belong only in `00_Current/Status.md`; other documents link to it.
- Before adding a file, ask which existing document should hold this instead.

- Start with a one-paragraph purpose and scope; use descriptive headings.
- Put the big picture in architecture overviews, exact shapes in references, practical steps in guides, and executable examples in tests.
- Prefer links to repeated explanations. Keep handover notes concise and actionable.
- Avoid duplicating source comments or listing every internal function unless it is a public contract.
- If a document grows too long, split by stable responsibility, not by release number.
- Keep `Developer Documentation/README.md` as the single entry point, with short reading paths for contributors.

## 5. Historical records and architectural decisions

Historical files are retained for provenance, not expanded automatically. Fix broken links or add a clearly marked archival correction when necessary; do not silently edit the historical narrative to sound current.

Create a short **Architecture Decision Record (ADR)** only when a consequential choice deserves durable rationale (for example, Mathematical Objects being independent of their windows). An ADR should state: context, decision, alternatives, consequences, status, and date. If superseded, link to the replacement rather than rewriting the old decision. Minor CSS fixes and ordinary feature increments do not need ADRs.

## 6. Review criteria for future maintainers and AI assistants

Before delivering an increment, ask:

- Can a new contributor tell **what is true today** without reading the historical archive?
- Do the documented interfaces match the actual source, including error cases and ownership of state?
- Are mathematical rules, gesture intentions, rendering and history responsibilities accurately separated?
- Have stable node identities, assumptions, future matrices/vectors, multiple windows and offline low-resource use been considered where relevant?
- Is the student's agency preserved: the student chooses transformations, the software validates them and records the reasoning path?
- Have all test claims been attributed accurately, and are remaining risks visible?

**Do not trust this policy or any other document blindly.** Compare claims with the implementation and correct outdated descriptions. Future maintainers should be able to improve the project without needing the original conversation or author.

## 7. What should be automated?

Use lightweight checks for broken relative links, missing required files, invalid referenced source paths and obsolete filenames. Automation can verify navigation, but cannot establish mathematical correctness or architectural truth. Avoid building a large documentation-management framework.

## 8. Definition of done

A change is documentation-complete when affected living references, current status, known issues (if applicable), and the single handover are updated; links and examples have been checked; historical material is clearly separated; and no redundant milestone document was added without a specific reason.

## Design-first collaboration

Follow the maintained [Design-first development workflow](Design_First_Development_Workflow.md) for substantial features; update that guide in place if the agreed collaboration process changes.

## Link integrity check (documentation hardening, 8 November 2026)

Run `npm run check:docs` (or `node scripts/check-documentation-links.mjs` when npm is unavailable) after changing Markdown paths or archiving files. The check validates local relative destinations across maintained and historical documentation; it does **not** verify the factual freshness of claims, headings, or anchor fragments. Keep `Current_Status.md`, `AI_Handover.md`, and `START_HERE_FOR_NEXT_CHAT.md` synchronized manually with verified evidence, and distinguish exploratory ideas from approved requirements. Historical snapshots remain historical even when their links are repaired.
