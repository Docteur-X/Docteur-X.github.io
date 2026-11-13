/**
 * Prepare a mathematical history transition on detached data before publishing it.
 *
 * A history append can throw while constructing patches or serialising provenance.
 * Never assign the proposed root first: a failed append must leave the live
 * expression and its branch cursor untouched. The caller publishes the returned
 * root/history pair synchronously, then performs fallible presentation/autosave
 * work separately. This helper knows nothing about DOM, IndexedDB or gestures.
 */
import { appendHistoryState } from '../documents/documentHistory.js';

export function prepareAtomicTransformationCommit({ history, resultRoot, substitutions, actionLabel,
  transformation = null, kind = 'rule-transform', operation = null, assumptions = [] }) {
  if (!history || !resultRoot || !substitutions || typeof actionLabel !== 'string') {
    throw new Error('Incomplete mathematical commit request.');
  }
  // Clone the entire history graph so even a failure late in appendHistoryState
  // cannot mutate a parent node's children or advance the live cursor.
  const nextHistory = structuredClone(history);
  const nextRoot = structuredClone(resultRoot);
  const snapshot = { expression: structuredClone(nextRoot), substitutions: structuredClone(substitutions) };
  const node = appendHistoryState(nextHistory, snapshot, {
    actionLabel, transformation, kind, operation, assumptions
  });
  return { root: nextRoot, history: nextHistory, historyNodeId: node.id };
}
