# Grouping overlay viewport synchronization — 625

## Evidence and diagnosis

User Playwright trace reports the grouping envelope bottom at 736.34 px while a selected operand bottom is 770.34 px. `measureSelectedRows()` measures full selected hitboxes, and `createGroupingPreview()` renders a fixed overlay using viewport coordinates. A click on an edge button may scroll a container after the overlay was measured. The overlay previously refreshed only on selection/preview state changes, not scrolling. This is a presentation synchronization defect, not an AST or mathematical-rule issue.

## Change and boundaries

`js/interaction/groupingPreview.js` now schedules a coalesced geometry refresh on captured document scrolls (including nested scroll containers) and window resize. Listeners and pending animation frame are removed on destroy. The module alone owns its viewport geometry; no new `app.js` coordination or AST mutation. Optional event APIs accommodate lightweight Node DOM stubs.

## Verification and limitations

625/625 Node tests pass locally; 430 existing documentation links passed before this note. User browser verification is pending. Run `npx playwright test e2e/grouping-presentation-geometry.spec.js` and the full suite. If geometry still fails, capture both selected and overlay bounding rectangles at the assertion to distinguish animation, scrolling and stale geometry.
