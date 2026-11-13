/**
 * The rule bundles (stage 7): the ONE place a rule is added to the program.
 *
 * Each bundle's index.js exports `bundle = { id, install, features,
 * declarations }`. From this list:
 *   - js/app/transformationFeatureAssembly.js registers the features;
 *   - js/app/gestureDeclarations.js collects the declarations;
 *   - js/app.js installs each bundle into the rule context.
 *
 * ORDER IS BEHAVIOUR: bundles are installed in this order, and the input
 * router runs routes in the order they were added, so moving a line changes
 * which route sees an event first (e2e/view/route-order.spec.js will say so).
 * Earlier bundles' drop targets are also asked first.
 *
 * Adding a rule: a new folder in js/rules/ (rule.js, install.js, index.js
 * exporting `bundle`), its CSS section, and one line here.
 */
import { bundle as negation } from './negation/index.js';
import { bundle as equality } from './equality/index.js';
import { bundle as identity } from './identity-element/index.js';
import { bundle as grouping } from './grouping/index.js';
import { bundle as distribution } from './distribution/index.js';
import { bundle as factorisation } from './factorisation/index.js';
import { bundle as rearrangement } from './rearrangement/index.js';
import { bundle as numericCombination } from './numeric-combination/index.js';
import { bundle as bothSides } from './both-sides/index.js';
import { bundle as cancelOpposites } from './cancel-opposites/index.js';
import { bundle as cancelInverses } from './cancel-inverses/index.js';
import { bundle as identities } from './identities/index.js';

export const RULE_BUNDLES = Object.freeze([negation, equality, identity, grouping, distribution, factorisation, rearrangement, numericCombination, bothSides, cancelOpposites, cancelInverses, identities]);
