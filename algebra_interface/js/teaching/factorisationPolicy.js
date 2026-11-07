/* ========================================================================== *
 * FACTORISATION TEACHING POLICY — intentionally NOT a mathematical rule
 * ========================================================================== *
 * The distributive law is valid whether or not students typed brackets.
 * The teaching interface nevertheless asks them to establish a visible scope
 * before factorising. Keeping this separate lets teachers later choose a
 * different level of scaffolding without rewriting factorisation.js.
 *
 * Default "visible-brackets":
 *   - Explicit Group(Add(...)) qualifies.
 *   - Add directly inside Multiply qualifies because parentheses are
 *     REQUIRED by precedence and already show its boundary.
 *   - An unbracketed standalone Add does NOT qualify; students should group
 *     their chosen addends first. A selection covering only some addends is
 *     already rejected by the mathematical planner.
 *
 * The module is PURE: no DOM, no history, no changes to the tree.
 * ========================================================================== */
import { findNodeLocation } from "../core/treeUtils.js";
import { needsAutomaticBrackets } from "../core/operatorMetadata.js";

export const DEFAULT_FACTORISATION_SCOPE_POLICY = "visible-brackets";
export const FACTORISATION_SCOPE_POLICIES = Object.freeze([
  "explicit-group", "visible-brackets", "any-add"
]);

/** Return an explanation suitable for both toolbar eligibility and hints. */
export function checkFactorisationTeachingPolicy(root, mathematicalPlan,
    policy = DEFAULT_FACTORISATION_SCOPE_POLICY) {
  if (!FACTORISATION_SCOPE_POLICIES.includes(policy)) {
    throw new RangeError(`Unknown factorisation scope policy: ${policy}`);
  }
  if (!mathematicalPlan) return { allowed: false, reason: "not-mathematically-applicable" };
  if (policy === "any-add") return { allowed: true, reason: "unrestricted" };
  if (mathematicalPlan.groupId) return { allowed: true, reason: "explicit-group" };
  if (policy === "explicit-group") return { allowed: false, reason: "explicit-group-required" };

  const location = findNodeLocation(root, mathematicalPlan.sumId);
  const parent = location?.parent;
  if (parent && needsAutomaticBrackets(parent, location.node, location.index)) {
    return { allowed: true, reason: "mandatory-parentheses" };
  }
  return { allowed: false, reason: "visible-grouping-required" };
}
