> **Verification update (owner report, 7 November 2026):** Negation v1.2.3 passed the Node and Playwright suites and manual interface checks. The subsequent terminology documentation update makes no application-code changes. Earlier “browser pending” statements below describe their historical verification point.

# Current status — Negation v1.2.3 (7 November 2026)

**Latest user-verified baseline:** Negation v1.2.2. The project owner reported that all Node and Playwright tests passed and confirmed the green “Release to negate” interaction visually. This is a user report, not a fresh browser run in the v1.2.3 build.

**Current source increment:** Negation v1.2.3 (contract and regression hardening). The semantic negation visual adapter now supplies distinct expansion/compression preview wording; structural parser round-trip and negative-literal tests have been added. No mathematical rules, gestures, history formats, or preview geometry were changed. The Node suite passed **268/268** in the build environment; Playwright must be rerun on this release before it becomes the next verified baseline.

## Implemented capabilities

- Mathematical Document with multiple Mathematical Objects, branching history, IndexedDB persistence and validated JSON import/export.
- Expression AST, explicit Group nodes, addition, multiplication, scalar numerical combination, rearrangement, distribution, factorisation, grouping, identity insertion, and limited equality function application.
- Registered transformation proposals and shared single-use, stale-safe commit lifecycle for the principal transformation families; common prepared-state publication boundary.
- Unary `Negate`, subtraction parsed as addition of a negated term, atomic negative numeric literals, inline expansion/compression preview, click/keyboard amber confirmation, and green compression eligibility feedback.
- Nested occurrence/operator hitboxes, mathematical clipboard, selection and drag feedback. See [Negation reference](../04_Reference/Negation_and_Subtraction_v1.md).

## Boundaries and future work

The current engine primarily models ordinary scalar algebra. General type/assumption reasoning, division, powers, logical contexts, general substitution, matrices/vectors, multiple active views, and resizable windows are not implemented. Preview labels now derive from a shared semantic adapter; the preview is still a negation-specific UI controller. The compression hover path currently materializes detached candidates; optimize only after profiling.

**Verification:** Run `node --test tests/*.test.js` and `npm run test:e2e` (or `npx playwright test`) in a Node/npm-enabled environment. Distinguish reported browser results from local Node execution. Track unresolved issues in [Known Issues](Known_Issues.md) and update this single status snapshot rather than appending another dated milestone section.
