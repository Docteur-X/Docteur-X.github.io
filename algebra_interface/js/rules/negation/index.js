/**
 * Negation rule bundle (stage 4, the first rule moved).
 *
 *   rule.js     pure: registry entries and gesture declarations
 *   install.js  interaction: routes, preview and drop target, via the rule context
 *   gesture.js, visual.js, activation.js, operatorArbitration.js,
 *   compressionTarget.js, inlinePreview.js   negation's own helpers
 *
 * Other code uses negation only through this file (decision 3.1).
 */
export { NEGATION_RULE_IDS, negationFeatures, negationDeclarations } from './rule.js';
export { installNegation } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { negationFeatures, negationDeclarations } from './rule.js';
import { installNegation } from './install.js';
export const bundle = Object.freeze({
  id: 'negation', install: installNegation,
  features: negationFeatures, declarations: negationDeclarations
});
