# Preview cancellation and creation navigation (628-test increment)

## Evidence and root cause

The browser failure in `phase4d3-grouping-lease.spec.js` occurred after clicking **New object** while grouping preview was open. The screenshot contained only **Object 1**. The capture-phase outside-pointer handler exempted existing object/document list buttons, but **not** `#objectNew` (or `#workspaceNew`). It therefore cancelled the preview and consumed the same click before the creation handler ran. The subsequent test steps operated on the original object, so the expected grouping selection could not be established.

## Contract and correction

Explicit navigation and creation controls must reach their existing context-change handler, which dismisses previews and checks the shared modal gate. The outside-pointer handler still consumes ordinary non-navigation clicks to prevent accidental activation. The exception now covers `#objectNew`, `#workspaceNew`, and existing object/document list entries. This is a narrow input-routing correction; the AST, rule engine, preview host, and renderer are unchanged.

The browser test now asserts **Object 2** exists after creation and asserts both selected operand hitboxes before trying to reopen grouping. Those checks identify the failing boundary promptly instead of timing out on a missing preview button.

## Verification

Node and documentation checks are run locally for this increment. The changed Playwright regression and full browser suite require browser verification. Do not mark browser success until observed.
