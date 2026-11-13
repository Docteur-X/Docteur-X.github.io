/** Identity rule bundle (+0 and ×1). Others use it only through this file (decision 3.1). */
export { IDENTITY_RULE_IDS, identityFeatures, identityDeclarations } from './rule.js';
export { installIdentity } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { identityFeatures, identityDeclarations } from './rule.js';
import { installIdentity } from './install.js';
export const bundle = Object.freeze({
  id: 'identity-element', install: installIdentity,
  features: identityFeatures, declarations: identityDeclarations
});
