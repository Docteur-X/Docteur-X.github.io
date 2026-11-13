/* ========================================================================== *
 * Algebraic structure queries (Engine stage E3)
 * ========================================================================== *
 * Rules ask for properties; types provide them (design: Engine standard).
 * This module answers "does + commute here?" from the type definitions in
 * js/definitions/types/, so no rule writes a property into its own code.
 *
 *   typeOf(node)                     the type of an expression ('scalar' for
 *                                    everything until declarations exist)
 *   hasProperty('Add', 'commutative') read from the type, or a lesson override
 *   requirementsMet(rule.requires, root)  every clause a rule declares
 *
 * A lesson override switches a property off (or back on) for a lesson, as the
 * axiomatic mode will. Tests use it through the older setters in
 * js/engine/operations/addition.js and multiplication.js.
 * ========================================================================== */
import { TYPES, DEFAULT_TYPE } from '../definitions/types/types.js';
import { RELATIONS } from '../definitions/relations/relations.js';

const overrides = new Map();
const key = (typeId, operation, property) => `${typeId}\u0000${operation}\u0000${property}`;

/** The type of an expression. Undeclared means scalar (owner decision). */
export function typeOf(_node) { return DEFAULT_TYPE; }

/** What `operation` forms on a type: { properties, identity, inverse, … } or null. */
function structureOf(operation, typeId = DEFAULT_TYPE) {
  return TYPES.get(typeId)?.operations?.[operation] ?? null;
}

function definedProperty(operation, property, typeId) {
  return Boolean(structureOf(operation, typeId)?.properties.includes(property));
}

export function hasProperty(operation, property, typeId = DEFAULT_TYPE) {
  const overridden = overrides.get(key(typeId, operation, property));
  return overridden ?? definedProperty(operation, property, typeId);
}

/** A lesson setting: turn one property off (or on). Setting it back to what the type says removes the override. */
export function setPropertyOverride(operation, property, value, typeId = DEFAULT_TYPE) {
  const k = key(typeId, operation, property);
  if (Boolean(value) === definedProperty(operation, property, typeId)) overrides.delete(k);
  else overrides.set(k, Boolean(value));
}

/**
 * Check the clauses a rule declares in `requires`:
 *   { operation: 'Add', properties: ['commutative'] }   the type of `root` provides them
 *   { relation: 'equal', bothSides: 'add' }              the relation allows it on both sides
 *   { relation: 'acted-on', bothSides: 'add' }           the same, for whichever relation `root` states
 * Returns { met, missing }, where each missing entry says what is missing,
 * ready for a refusal message ("+ is not commutative here").
 */
export function requirementsMet(requires, root) {
  const missing = [];
  const typeId = typeOf(root);
  for (const clause of requires ?? []) {
    if (clause.operation) {
      for (const property of clause.properties ?? []) {
        if (!hasProperty(clause.operation, property, typeId)) missing.push({ operation: clause.operation, property, type: typeId });
      }
    } else if (clause.relation) {
      // 'acted-on': the relation the statement itself states (stage E4c), so
      // one rule serves =, < and >.
      const relation = clause.relation === 'acted-on'
        ? RELATIONS.list.find(candidate => candidate.node === root?.type) ?? null
        : RELATIONS.get(clause.relation);
      const effect = relation?.bothSides?.[clause.bothSides];
      if (!effect || effect.refuse) missing.push({ relation: clause.relation, bothSides: clause.bothSides });
    }
  }
  return { met: missing.length === 0, missing };
}
