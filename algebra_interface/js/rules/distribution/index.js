/** Distribution rule bundle. Others use it only through this file (decision 3.1). */
export { DISTRIBUTION_RULE_IDS, distributionFeatures, distributionDeclarations } from './rule.js';
export { installDistribution } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { distributionFeatures, distributionDeclarations } from './rule.js';
import { installDistribution } from './install.js';
export const bundle = Object.freeze({
  id: 'distribution', install: installDistribution,
  features: distributionFeatures, declarations: distributionDeclarations
});
