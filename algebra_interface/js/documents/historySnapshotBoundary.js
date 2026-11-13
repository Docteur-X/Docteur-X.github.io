/**
 * Detach the mathematical values used when entering or leaving a history state.
 *
 * History snapshots are authoritative records, not live editing containers.
 * Their AST node IDs must survive copying, while nested substitution values
 * must never be shared with mutable editor state. Keep this pure and DOM-free.
 */
import { cloneExpression } from '../engine/nodeFactory.js';

export function detachHistorySnapshot(expression, substitutions = {}) {
  if (substitutions === null || typeof substitutions !== 'object' || Array.isArray(substitutions)) {
    throw new TypeError('History substitutions must be an object.');
  }
  return {
    expression: expression == null ? null : cloneExpression(expression),
    substitutions: structuredClone(substitutions)
  };
}
