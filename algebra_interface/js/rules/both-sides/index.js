/**
 * "Same to both sides" rule bundle (stage 7: the first rule built only as a
 * bundle). Drag a term across = to add its opposite to both sides.
 *
 *   engine.js         pure: the new equation (adds the opposite, keeps IDs)
 *   rule.js           pure: registry entry, gesture request, wording, declarations
 *   install.js        the drop target, preview, Escape and outside-click routes
 *
 * Other code uses this rule only through this file (decision 3.1).
 */
export { BOTH_SIDES_RULE_IDS, bothSidesFeatures, bothSidesDeclarations } from './rule.js';
export { installBothSides } from './install.js';

import { bothSidesFeatures, bothSidesDeclarations } from './rule.js';
import { installBothSides } from './install.js';
export const bundle = Object.freeze({
  id: 'both-sides', install: installBothSides,
  features: bothSidesFeatures, declarations: bothSidesDeclarations
});
