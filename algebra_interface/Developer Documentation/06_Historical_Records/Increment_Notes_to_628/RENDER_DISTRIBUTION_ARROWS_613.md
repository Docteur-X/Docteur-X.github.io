# Distribution-arrow presentation extraction — 613 tests

**Change:** Move the decorative SVG painter from `app.js` into `js/ui/distributionArrows.js`. No mathematical transformation, modal ownership, pointer handling, semantic hitbox identity, or commit logic moved.

**Contract:** `renderDistributionCurves({ equation, preview, document })` first removes the old decorative overlay. With no preview, source factor, or factor-copy buttons it adds nothing. Otherwise it draws one inert arrow per rendered factor copy. This is a DOM presentation operation; it must run after layout is available, including on geometry refresh.

**Verification:** 613/613 Node tests passed locally, including three new tests. Playwright pending. Verify distribution in both directions, resize refresh, confirmation/cancellation and no arrow accumulation. The prior 610-test Renderer Presentation Boundary was user-reported Playwright passing.

**Why this boundary:** the Renderer produces addressable mathematical DOM, while feature-specific decorative curves belong to a presentation adapter. Do not move mathematical distribution eligibility into this adapter.
