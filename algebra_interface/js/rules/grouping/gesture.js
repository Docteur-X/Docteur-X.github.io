/**
 * Range grouping gesture adapter: translate an eligible selection into an
 * immutable, DOM-free intention. Selection order is not mathematical order;
 * the Engine's validated plan supplies the canonical sibling order.
 * This adapter never modifies an AST or decides associativity.
 */
export function groupingActionRequest(plan, bracketStyle = 'round') {
  if (!plan || !['Add', 'Multiply'].includes(plan.parentType) ||
      typeof plan.parentId !== 'string' || !plan.parentId ||
      !Array.isArray(plan.operandIds) || plan.operandIds.length < 2 ||
      plan.operandIds.some(id => typeof id !== 'string' || !id) ||
      new Set(plan.operandIds).size !== plan.operandIds.length ||
      !['round', 'square', 'curly'].includes(bracketStyle)) return null;
  return Object.freeze({
    ruleId: 'grouping.range',
    parameters: Object.freeze({
      parentId: plan.parentId,
      parentType: plan.parentType,
      operandIds: Object.freeze([...plan.operandIds]),
      bracketStyle
    })
  });
}
