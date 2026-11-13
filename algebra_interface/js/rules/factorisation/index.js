/** Factorisation rule bundle. Others use it only through this file (decision 3.1). */
export { FACTORISATION_RULE_IDS, factorisationFeatures, factorisationDeclarations } from './rule.js';
export { installFactorisation } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { factorisationFeatures, factorisationDeclarations } from './rule.js';
import { installFactorisation } from './install.js';
export const bundle = Object.freeze({
  id: 'factorisation', install: installFactorisation,
  features: factorisationFeatures, declarations: factorisationDeclarations
});
