# Escape characterization: nested-selection setup correction (628)

## Evidence

The reported Playwright failure occurred at the initial `toHaveCount(2)` assertion, before the negation preview was opened or Escape was pressed. The screenshot showed one selected operand. This does **not** demonstrate double Escape cancellation.

## Contract and change

The selection model (`js/interaction/selection.js`) permits unrelated occurrences but excludes simultaneous ancestor/descendant selections. The app's unmodified pointerdown policy may clear non-modal selection; it is not a test of Escape. The characterization now builds `a+b+-(c+d)`, selects the independent `a` and `b` addends by their accessible labels, and activates the separate negation operator using keyboard Enter. It explicitly checks retained selection both before and after preview entry, then checks one Escape cancels only the preview and a second clears selection. This keeps the test focused on keyboard-dispatch ownership.

No production code or mathematical behavior changed. The 628 Node tests passed locally with `node scripts/run-node-tests.mjs`. Browser verification of the corrected characterization is pending. If selection fails after Enter, investigate the preview's selection contract rather than relaxing the Escape assertion.
