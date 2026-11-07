/**
 * In-application mathematical clipboard (v1).
 *
 * This is deliberately NOT the operating system's text clipboard: a rendered
 * string loses explicit brackets, node types, and other mathematical metadata.
 * Clipboard entries are immutable-by-convention JSON data, independent of the
 * source object's later edits. They are NOT mathematical assertions: copying
 * an equation does not assert any new equality or justify a transformation.
 *
 * A clipboard entry retains source identity for future provenance displays,
 * but every pasted occurrence must receive NEW AST IDs. In particular, source
 * node IDs must never be reused across independent mathematical objects.
 */
import { cloneExpression, createNodeId } from './nodeFactory.js';
import { findNodeById, walkExpression } from './treeUtils.js';
import { categoryOf } from './nodeCategories.js';
import { assertAstInvariants } from './documentInvariants.js';

const clone = value => JSON.parse(JSON.stringify(value));

/** Capture exactly one existing subtree, or the entire expression/equation. */
export function captureMathematicalClipboard(root, nodeId, { documentId = null, objectId = null } = {}) {
  if (!root) throw new Error('There is no mathematical content to copy.');
  const selected = nodeId == null ? root : findNodeById(root, nodeId);
  if (!selected) throw new Error('The selected mathematical node no longer exists.');
  // An equality is currently valid as a whole statement, not as a child of
  // another statement. Future logical statements can extend this contract.
  assertAstInvariants(selected);
  return {
    format: 'algebra-mathematical-clipboard', version: 1,
    category: categoryOf(selected),
    root: cloneExpression(selected),
    source: { documentId, objectId, nodeId: selected.id }
  };
}

/** Return a fresh, independent AST; never mutate the clipboard entry. */
export function pasteMathematicalClipboard(entry) {
  if (!entry || entry.format !== 'algebra-mathematical-clipboard' || entry.version !== 1 ||
      !entry.root || categoryOf(entry.root) !== entry.category) {
    throw new Error('Unsupported mathematical clipboard entry.');
  }
  assertAstInvariants(entry.root);
  const result = clone(entry.root);
  // Traversal covers Equal.left/right, Group.operand and FunctionCall.arguments.
  // Every occurrence receives a fresh ID, including unchanged leaf symbols.
  walkExpression(result, node => { node.id = createNodeId(); });
  return result;
}
