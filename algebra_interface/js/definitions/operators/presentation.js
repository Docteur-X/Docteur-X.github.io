/**
 * How operators are shown and handled on screen, read from their definitions
 * (stage I1). The renderer, the drag code and the views ask these questions
 * instead of naming node types:
 *
 *   sequenceOf(node or type)   for an operation drawn as a row of draggable
 *                              terms (a sum, a product): its classes, labels
 *                              and sign styles; null otherwise
 *   isTermSequence(node/type)  is it one?
 *   signDrawnInside(child, parent)  does this child draw its own sign inside
 *                              its box, so the row puts no operator before it
 *                              (a ÷ factor in a product)?
 *
 * The data lives in each operator's `presentation` and `notation.print`
 * (js/definitions/operators/<id>/index.js).
 */
import { OPERATORS } from './operators.js';

let byNode = null;
const operatorForNode = type => {
  byNode ??= new Map(OPERATORS.list.filter(operator => operator.node).map(operator => [operator.node, operator]));
  return byNode.get(type) ?? null;
};
const typeOfArgument = nodeOrType => typeof nodeOrType === 'string' ? nodeOrType : nodeOrType?.type;

export function sequenceOf(nodeOrType) {
  return operatorForNode(typeOfArgument(nodeOrType))?.presentation?.sequence ?? null;
}
export const isTermSequence = nodeOrType => Boolean(sequenceOf(nodeOrType));

export function signDrawnInside(child, parentOrType) {
  const attachesInside = operatorForNode(child?.type)?.notation?.print?.attachesInside;
  return Boolean(attachesInside) && attachesInside === typeOfArgument(parentOrType);
}
