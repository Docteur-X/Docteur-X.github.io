/**
 * Range-grouping rule bundle: the pure part (no DOM).
 *
 * Putting explicit brackets around a run of adjacent selected addends or
 * factors. The Engine (operations/grouping.js) checks the range and builds
 * the grouped tree on DETACHED data. Interaction is in ./install.js.
 */
import { getRangeGroupingPlan, groupOperandRange } from '../../engine/operations/grouping.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { groupingActionRequest } from './gesture.js';
import { describeGroupingPreview } from './visual.js';

export const GROUPING_RULE_IDS = Object.freeze(['grouping.range']);

function proposeRangeGrouping(root, parameters) {
  const verified = getRangeGroupingPlan(root, parameters.operandIds);
  const same = verified && verified.parentId === parameters.parentId &&
    verified.parentType === parameters.parentType &&
    verified.operandIds.length === parameters.operandIds.length &&
    verified.operandIds.every((id, index) => id === parameters.operandIds[index]);
  if (!same) return null;
  // The grouping operation mutates its input tree, so NEVER run it on the live
  // root during a preview. The preview's blue envelope is purely presentation.
  const detached = structuredClone(root);
  const grouped = groupOperandRange(detached, verified.operandIds, parameters.bracketStyle);
  return grouped ? {
    plan: verified,
    root: normaliseWithRules(detached),
    provenance: grouped.provenance,
    groupId: grouped.group.id
  } : null;
}

export const groupingFeatures = Object.freeze([
  { id: 'grouping.range', propose: proposeRangeGrouping,
    gesture: groupingActionRequest, visual: describeGroupingPreview, confirmationMode: 'preview' }
]);

export const groupingDeclarations = Object.freeze([
  { ruleId: 'grouping.range', kind: 'command',
    on: { role: 'occurrence', selected: true },
    description: 'Put brackets around the selected neighbouring terms' }
].map(declaration => Object.freeze(declaration)));
