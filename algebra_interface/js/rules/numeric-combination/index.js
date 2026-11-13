/** Numeric combination rule bundle. Others use it only through this file (decision 3.1). */
export { NUMERIC_COMBINATION_RULE_IDS, numericCombinationFeatures, numericCombinationDeclarations } from './rule.js';
export { installNumericCombination } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { numericCombinationFeatures, numericCombinationDeclarations } from './rule.js';
import { installNumericCombination } from './install.js';
export const bundle = Object.freeze({
  id: 'numeric-combination', install: installNumericCombination,
  features: numericCombinationFeatures, declarations: numericCombinationDeclarations
});
