/** Syntactic categories are distinct from eventual value types (scalar/matrix). */
const EXPRESSION_TYPES = new Set(["Number", "Symbol", "Add", "Multiply", "Group", "Negate", "FunctionCall"]);
export function isExpressionNode(node) { return Boolean(node && EXPRESSION_TYPES.has(node.type)); }
export function isStatementNode(node) { return node?.type === "Equal"; }
export function categoryOf(node) { return isStatementNode(node) ? "statement" : isExpressionNode(node) ? "expression" : null; }
/** v1 assumes symbols denote scalars; future type inference can refine this. */
export function isScalarExpression(node) {
  if (!isExpressionNode(node)) return false;
  if (Array.isArray(node.operands)) return node.operands.every(isScalarExpression);
  if (node.operand) return isScalarExpression(node.operand);
  if (node.arguments) return node.arguments.every(isScalarExpression);
  return true;
}
