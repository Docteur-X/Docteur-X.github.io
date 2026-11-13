/** Rearrangement rule bundle. Others use it only through this file (decision 3.1). */
export { REARRANGEMENT_RULE_IDS, rearrangementFeatures, rearrangementDeclarations } from './rule.js';
export { installRearrangement } from './install.js';

// The bundle's one description (stage 7): js/rules/bundles.js lists it, and
// the feature registry, the gesture declarations and start-up read it there.
import { rearrangementFeatures, rearrangementDeclarations } from './rule.js';
import { installRearrangement } from './install.js';
export const bundle = Object.freeze({
  id: 'rearrangement', install: installRearrangement,
  features: rearrangementFeatures, declarations: rearrangementDeclarations
});
