/**
 * Identity rules bundle (stage E4b): every identity written as data, served by
 * one engine and one interaction (owner decision: identities as data).
 *
 *   identities.js     the registry; each identity is a folder with defineIdentity
 *   engine.js         pure: match one side, rebuild the other (js/engine/patterns.js)
 *   rule.js           pure: one registry entry per identity, wording, declarations
 *   install.js        tap an operator to preview; Escape and outside-click routes
 */
export { IDENTITY_RULE_IDS, identityRuleFeatures, identityRuleDeclarations } from './rule.js';
export { installIdentityRules } from './install.js';

import { identityRuleFeatures, identityRuleDeclarations } from './rule.js';
import { installIdentityRules } from './install.js';
export const bundle = Object.freeze({
  id: 'identities', install: installIdentityRules,
  features: identityRuleFeatures, declarations: identityRuleDeclarations
});
