/**
 * Cancel-inverses rule bundle (division stage D3): drag a factor onto its
 * inverse in the same product and the pair becomes 1, assuming the divisor is
 * not 0 (b · ÷b = 1, if b ≠ 0). The assumption is kept with the history step.
 *
 *   engine.js   pure: finds the pair, checks x and ÷x, writes the 1 and the assumption
 *   rule.js     pure: registry entry, gesture request, wording, declarations
 *   install.js  the drop target (glow, hint, immediate commit with the assumption)
 *
 * Other code uses this rule only through this file (decision 3.1).
 */
export { CANCEL_INVERSES_RULE_IDS, cancelInversesFeatures, cancelInversesDeclarations } from './rule.js';
export { installCancelInverses } from './install.js';

import { cancelInversesFeatures, cancelInversesDeclarations } from './rule.js';
import { installCancelInverses } from './install.js';
export const bundle = Object.freeze({
  id: 'cancel-inverses', install: installCancelInverses,
  features: cancelInversesFeatures, declarations: cancelInversesDeclarations
});
