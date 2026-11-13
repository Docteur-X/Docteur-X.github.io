# Grouping Preview Host migration — 579-test increment

## Verified status

- Source: `js/app.js` now creates `groupingPreviewHost` using `createPreviewSessionHost`.
- `groupingPreviewLease`, its release helper, the grouping-specific sequence counter and `groupingCommitLifecycle` have been removed.
- The grouping feature retains its range selection, coordinator-proposed detached candidate, blue bracket overlay, revalidation of exact adjacent siblings, atomic history publication, and operand node IDs.
- The host owns the lease, single-use commit gate, stale source rejection, and terminal cancellation. Its presentation adapter owns only blue bracket display and feature-state cleanup.
- Node test suite: 579/579 passing. Browser verification: pending for this increment; user reported Playwright passed on the prior 576-test distribution archive.

## Tests and boundaries

`tests/grouping-preview-host-integration.test.js` exercises grouping candidates through the real host: detached AST, exclusive ownership, single-use confirmation, cancellation, stale stamps and externally revoked leases. Existing grouping tests continue to cover plan semantics and atomic history preparation. No claim is made that these Node tests reproduce focus, click-away or visual layout; run Playwright locally.

## Browser acceptance

Test selecting adjacent addends and factors; entering blue bracket preview via toolbar and bracket; confirming via bracket and button; Escape/click-away cancellation; retained selection on cancel; source change/object switch; inability to start a competing preview; preserved operand IDs/history and undo/redo.

## Next

After browser verification, audit factorisation and equality preview ownership before selecting the next migration. Do not merge rule-specific mathematics into the host. Prefer removing superseded code rather than retaining parallel preview lifecycles.
