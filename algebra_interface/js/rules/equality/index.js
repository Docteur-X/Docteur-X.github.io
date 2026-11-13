/** Equality rule bundle. Others use it only through this file (decision 3.1). */
export { EQUALITY_RULE_IDS, equalityFeatures, equalityDeclarations } from './rule.js';
export { installEquality } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { equalityFeatures, equalityDeclarations } from './rule.js';
import { installEquality } from './install.js';
export const bundle = Object.freeze({
  id: 'equality', install: installEquality,
  features: equalityFeatures, declarations: equalityDeclarations
});
