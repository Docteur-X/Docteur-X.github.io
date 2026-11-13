/**
 * Ordinary operand drag: bridge between mathematical eligibility and geometry.
 *
 * The mathematical planner is deliberately separate from DOM measurement.
 * `planOrdinaryDragDistributionTargets` only asks the existing distribution
 * rule for eligible targets; it never modifies an AST or creates a preview.
 * `captureOrdinaryDragSnapshot` delegates measurement to the existing pure
 * hit-testing adapter. Keeping the two steps explicit prevents hit testing
 * from silently becoming a mathematical rule engine.
 */
import { findNodeById } from '../../engine/treeUtils.js';
import { getDistributionPlan, unwrapGroupedSum } from '../../engine/operations/distribution.js';
import { captureDragGeometry } from './hitTesting.js';
import { hasProperty } from '../../engine/structures.js';

/**
 * Return a fresh eligibility map for this particular drag and AST revision.
 * The map is deliberately NOT cached across revisions: callers must recapture
 * after render/scroll changes and continue to enforce their drag-session gate.
 */
export function planOrdinaryDragDistributionTargets(expressionRoot, drag) {
  const plansBySumId = new Map();
  if (!expressionRoot || !drag?.parentId || !drag?.item?.id) return plansBySumId;
  const parent = findNodeById(expressionRoot, drag.parentId);
  // Only a factor of an operation that distributes (× over +) can be multiplied out.
  if (!parent?.type || !hasProperty(parent.type, 'distributive') || !Array.isArray(parent.operands)) return plansBySumId;
  for (const factor of parent.operands) {
    if (factor.id === drag.item.id) continue;
    const sum = unwrapGroupedSum(factor);
    if (!sum) continue;
    const plan = getDistributionPlan(parent, drag.item.id, sum.id);
    if (plan) plansBySumId.set(sum.id, plan);
  }
  return plansBySumId;
}

/**
 * Capture a current rectangle snapshot and the mathematical plans associated
 * with its distribution targets. Returns both explicitly, avoiding mutation
 * of drag state inside geometry construction.
 */
export function captureOrdinaryDragSnapshot(equation, expressionRoot, drag) {
  if (!equation || !drag) return { geometry: null, plansBySumId: new Map() };
  const plansBySumId = planOrdinaryDragDistributionTargets(expressionRoot, drag);
  const geometry = captureDragGeometry(
    equation, drag.parentId, drag.parentType, drag.item.id,
    [...plansBySumId.keys()]
  );
  return { geometry, plansBySumId };
}
