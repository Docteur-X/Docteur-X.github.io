# Testing and verification

`npm test` runs Node tests (`tests/*.test.js`); `npm run test:e2e` runs Playwright Chromium (`e2e/`). Current v3 baseline reported by the owner: **256 Node and 34 browser tests passed**, plus manual interaction checks. This documentation-only reorganization does not rerun browser tests.

Separate evidence: pure mathematical correctness; commit lifecycle/serialization; actual browser rendering and gestures; manual educational usability. Passing Node tests cannot prove DOM mounting (a previous refactor accidentally omitted it). Browser tests should wait for observable eligibility classes/states before pointer release, not arbitrary sleep durations.

Test invalid/unknown mathematical conditions, stale revisions, duplicate confirmation, preview cancellation, history branching and import failure. Check keyboard/touch and small viewports where relevant. Keep the tests independent of the historical documentation folder layout. Performance benchmarks on older hardware are future work.
