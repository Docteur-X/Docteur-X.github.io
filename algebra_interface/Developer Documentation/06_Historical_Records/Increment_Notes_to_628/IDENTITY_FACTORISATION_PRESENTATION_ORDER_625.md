# Identity and factorisation preview presentation ordering — 625 baseline

Source review, 2026-11-11. This is a focused contract audit, **not** a production refactor.

## Identity

`app.js` identity Preview Session Host calls `identityVisual.show`, then `setModal`, then reveals `identityPreviewActions`. `js/interaction/identityTool.js` creates an absolutely positioned overlay within the equation panel; `css/previews.css` uses `position:absolute; inset:0`. Unlike grouping, it does **not** snapshot viewport coordinates when entering preview. Revealing the toolbar may change page layout, but the overlay follows its containing panel. Do not blindly transpose grouping's ordering fix to this family. A new Playwright regression (`e2e/identity-presentation-layout.spec.js`) checks the candidate overlay's panel geometry and cancellation without a commit. Browser verification is pending.

## Factorisation

The factorisation Preview Session Host sets preview mode, updates the toolbar **before** calling `transformationPreview.show`, and then focuses the confirmation element with `preventScroll:true`. `transformationPreview.show` swaps the displayed candidate, retaining the original DOM for cancellation. Persistent provenance arrows are measured on the next animation frame after the candidate is inserted. This already follows the important layout-before-measure rule at preview entry. It has a distinct DOM ownership contract from identity and grouping; do not force these into a generic overlay controller.

## Follow-up

Run the new identity Playwright case and full suite. If a layout failure appears, diagnose actual containing-block geometry and timing before changing production. Consider a dedicated factorisation provenance-arrow geometry test only if existing browser coverage proves insufficient. No production code was changed in this audit.
