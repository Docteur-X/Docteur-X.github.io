/**
 * Publish an already-prepared mathematical transition into the active view.
 *
 * This is the single in-memory publication boundary for every rule's commit.
 * (Clean-up C7 removed a one-root document wrapper it also kept in step: that
 * wrapper only existed with no workspace document open, which the page never
 * allows, since the expression editor is hidden until a document is open.)
 *
 * Publication itself consists only of synchronous property assignments; the
 * browser cannot observe the intermediate assignments in the same JS task.
 * Persistence, rendering and notifications deliberately remain with the app.
 * In particular, an IndexedDB save failure must not roll back valid work.
 *
 * A future multi-view design should publish through the authoritative object
 * store, then notify its views. Do not add DOM or IndexedDB dependencies here.
 */
export function publishPreparedTransformation({ state, staged }) {
  if (!state || !staged?.root || !staged?.history) {
    throw new TypeError('A prepared root and history are required.');
  }
  state.expressionRoot = staged.root;
  state.history = staged.history;
  return staged;
}
