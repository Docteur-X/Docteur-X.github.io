/**
 * Create an independent editing state from a committed mathematical object.
 *
 * The document controller publishes replacement snapshots and the save queue
 * identifies them by object identity. Editing must therefore never mutate
 * a history or substitution object reachable from a published document.
 * Keep this boundary free of DOM, persistence and preview dependencies.
 */
import { cloneExpression } from '../engine/nodeFactory.js';
import { createDocumentHistory } from './documentHistory.js';

const detach = value => JSON.parse(JSON.stringify(value));

export function createObjectWorkingState(object) {
  return {
    expressionRoot: object?.root ? cloneExpression(object.root) : null,
    history: object ? detach(object.history) : createDocumentHistory(),
    substitutions: object ? detach(object.substitutions) : {}
  };
}
