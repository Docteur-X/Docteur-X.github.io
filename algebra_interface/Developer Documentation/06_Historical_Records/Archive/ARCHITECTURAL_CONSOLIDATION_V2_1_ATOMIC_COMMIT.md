# Architectural Consolidation v2.1 — In-memory commit safety

## Purpose and scope

This increment repairs a concrete failure mode found in the v2 audit: the equality confirmation callback previously assigned `state.expressionRoot = result.root` before `addHistoryNode(...)`. If event construction failed, the live expression could change without a matching history node. No algebraic rules, gesture mappings, previews, or other transformations are migrated here.

## New boundary

`js/manipulator/atomicTransformationCommit.js` exports `prepareAtomicTransformationCommit(...)`. It clones the history graph and proposed expression, then constructs the next history state and event **on detached data**. A failure in cloning, event patching, provenance serialisation, or history construction leaves the authoritative live expression and history untouched. On success, the equality integration synchronously publishes the prepared root/history pair; no history construction occurs between those assignments.

The helper is DOM-free and storage-free, so future transformation features can reuse it. The existing single-use `transformationCommitLifecycle.js` continues to consume a proposal before calling its commit callback, including when the callback throws. A failed proposal is not retried automatically.

### Guarantees and limits

- **Before publication:** failures leave the live root and history unchanged. The prepared candidate has no mutable references to the original proposal.
- **Publication:** root and history are replaced synchronously on the browser main thread. This is a coherent in-memory update for the current single-view application; it is not a general concurrent transaction mechanism.
- **After publication:** workspace capture, autosave scheduling, and UI/history rendering are separate concerns. Workspace capture exceptions are reported without rolling back valid mathematical history. IndexedDB save errors are handled by the existing `saveDocument` path and keep work dirty; users are advised to export a JSON backup. A storage failure must never be misreported as a mathematical rejection.
- **Remaining limits:** a future multi-window or worker-based state store needs an explicit object-level revision/transaction boundary. `captureActive` is not a database transaction; its partial failure may require a dedicated workspace-state repair. The helper clones history, so its cost scales with history size; optimize only after measurement, perhaps with persistent structural sharing.

## Tests and handover

`tests/atomic-transformation-commit.test.js` covers detached successful preparation, failure injection during event/provenance serialization, and candidate independence. `tests/transformation-commit-lifecycle.test.js` additionally covers reentrant confirmation. Run `node --test tests/*.test.js` and the Playwright suite (`npm run test:e2e`) in a provisioned browser environment. The browser suite was not run during this increment in the authoring environment.

Keep the mathematical engine authoritative on eligibility, the coordinator responsible for proposal/commit orchestration, and the renderer/controller responsible for visuals. Student agency and mathematical correctness are non-negotiable. Do not silently turn an IndexedDB autosave failure into a lost mathematical step.
