/** Range-grouping rule bundle. Others use it only through this file (decision 3.1). */
export { GROUPING_RULE_IDS, groupingFeatures, groupingDeclarations } from './rule.js';
export { installGrouping } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { groupingFeatures, groupingDeclarations } from './rule.js';
import { installGrouping } from './install.js';
export const bundle = Object.freeze({
  id: 'grouping', install: installGrouping,
  features: groupingFeatures, declarations: groupingDeclarations
});
