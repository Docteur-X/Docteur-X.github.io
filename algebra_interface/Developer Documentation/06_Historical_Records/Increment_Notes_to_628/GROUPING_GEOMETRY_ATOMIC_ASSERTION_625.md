# Grouping geometry: atomic, retryable browser assertion (625)

## Evidence and scope

The user's two successive Playwright traces report the same grouping containment failure: selected hitbox bottom 770.34375px, envelope bottom 736.34375px (34px difference). This remains **unresolved**. The earlier viewport scroll/resize listener change did not establish a fix.

The existing regression sampled the fixed overlay and selected operands in separate Playwright/browser operations. This increment changes **only the regression**, replacing separate viewport measurements with a single browser-side `getBoundingClientRect()` snapshot inside a retryable `expect.poll` (3 seconds). It still requires the overlay to contain both complete selected hitboxes within one pixel. The existing equation-relative operand-stability checks and unchanged-mathematics/history checks remain.

If the browser test still fails, treat it as evidence of a persistent production geometry/lifecycle defect. Inspect the trace and the overlay's fixed-position coordinate mapping, DOM scroll and preview activation ordering. Do not loosen the containment contract or add another app-level coordination layer without source evidence.

## Verification

- Local Node suite: 625/625 passed.
- Documentation links: 434 checked after this note and cross-links.
- Playwright browser suite: not run in this environment (no installed Playwright package).
- No production source changes in this increment.
