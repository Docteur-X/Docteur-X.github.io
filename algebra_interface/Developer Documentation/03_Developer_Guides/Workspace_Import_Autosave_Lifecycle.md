# Workspace import and autosave lifecycle

## Purpose and authoritative state

An imported document must be fully validated and durably written before it
becomes active. An autosave of the previously active document must finish
writing its captured committed snapshot, even if the user switches documents
or starts an import in the meantime. The application must not allow a stale
save completion to overwrite the current workspace's status message.

## Ownership and ordering

- `app.js` coordinates document activation, pending autosave timers, import,
  status messages, and UI navigation; it does not change mathematical rules.
- `documentRepository` owns IndexedDB persistence; `queueSave` serializes
  writes, preserving the order in which snapshots were submitted.
- `workspaceStatusGate.js` owns only the freshness check for asynchronous
  status messages. It does **not** cancel writes or decide mathematical truth.
- `scheduleSave()` captures the committed document at scheduling time rather
  than reading whichever document happens to be active when the timer fires.
- Starting an import and switching active documents invalidate older status
  tokens. A save may announce success/failure only when its token remains
  current **and** its document is still active.
- A successful import is announced only after its durable write, document
  registration, and activation. Failed imports do not activate partial data.

## Verification

`tests/workspace-status-gate.test.js` checks stale status invalidation and
background-document suppression. `e2e/compact-import-export.spec.js` exercises
real file inputs, overlapping autosave/import, mathematical content, history,
reload, and preservation of the original document.

Run `node --test tests/*.test.js` and `npm run test:e2e` (or the GitHub CI
workflow). A browser run is required before promoting this increment from
source-tested to browser-verified. Keep this guide maintained in place.
