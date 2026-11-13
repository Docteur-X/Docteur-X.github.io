/** Application composition of mathematical Transformation Features.
 * The registry is a lookup mechanism, not an Engine or a gesture resolver.
 * Keep proposal validation here so app.js does not grow with every new rule.
 */
// Rules that have moved into bundles (stage 4) supply their own entries.
import { RULE_BUNDLES } from '../rules/bundles.js';
import { createTransformationFeatureRegistry } from '../steps/transformationFeatures.js';
import { findNodeById } from '../engine/treeUtils.js';
import { getDistributionPlan } from '../engine/operations/distribution.js';
import { normaliseWithRules } from '../engine/normalization.js';


export function createApplicationTransformationFeatures() {
  // Every bundle's features (js/rules/bundles.js is the one list).
  return createTransformationFeatureRegistry(RULE_BUNDLES.flatMap(bundle => bundle.features));
}
