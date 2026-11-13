/**
 * The relation registry: every relation, listed once (Engine stage E3).
 * Adding a relation (<, ≤ …) is one folder in js/relations/ and one line here.
 */
import { defineRegistry } from '../define.js';
import { registerRelationNode } from '../../engine/nodeRegistry.js';
import { relation as equal } from './equal/index.js';
import { relation as less } from './less/index.js';
import { relation as greater } from './greater/index.js';

export const RELATIONS = defineRegistry('Relation', [equal, less, greater]);
// Each relation's node type joins the node registry (stage E4c).
for (const relation of RELATIONS.list) registerRelationNode(relation.node, relation.id);

/** The relation a statement node states (Equal → equal, Less → less), or null. */
export function relationForNode(nodeOrType) {
  const type = typeof nodeOrType === 'string' ? nodeOrType : nodeOrType?.type;
  return RELATIONS.list.find(relation => relation.node === type) ?? null;
}
