/**
 * Cancel-opposites rule bundle: drag a term onto its opposite in the same sum
 * and the pair becomes 0 (t + −t = 0). The second rule built only as a bundle.
 *
 *   engine.js   pure: finds the pair, checks they are opposites, writes the 0
 *   rule.js     pure: registry entry, gesture request, wording, declarations
 *   install.js  the drop target (glow, hint, immediate commit)
 *
 * Other code uses this rule only through this file (decision 3.1).
 */
export { CANCEL_OPPOSITES_RULE_IDS, cancelOppositesFeatures, cancelOppositesDeclarations } from './rule.js';
export { installCancelOpposites } from './install.js';

import { cancelOppositesFeatures, cancelOppositesDeclarations } from './rule.js';
import { installCancelOpposites } from './install.js';
export const bundle = Object.freeze({
  id: 'cancel-opposites', install: installCancelOpposites,
  features: cancelOppositesFeatures, declarations: cancelOppositesDeclarations
});
