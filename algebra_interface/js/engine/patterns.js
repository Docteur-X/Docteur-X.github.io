/* ========================================================================== *
 * Pattern matching for identity rules (stage E4b)
 * ========================================================================== *
 * An identity rule is written as data: two patterns, such as
 *   \sin(a+b)   and   \sin(a)\cos(b)+\cos(a)\sin(b)
 * where some symbols are VARIABLES (a, b): each stands for any expression.
 *
 * matchPattern(pattern, node, variables)
 *   Does `node` have the shape of `pattern`? Returns the bindings
 *   { a: <subtree>, b: <subtree> }, or null. A variable used twice must be
 *   bound to structurally equal expressions. Any other node must have the
 *   same type and meaning fields and matching children, in order (no
 *   commutativity: a+b does not match b+a; the student rearranges first).
 *   Brackets the student wrote around a matched part are looked through.
 *
 * instantiate(pattern, bindings, variables)
 *   Build the other side with the bindings put in. The first use of a bound
 *   expression keeps its node IDs (the same occurrences move); every further
 *   copy, and every new node, gets fresh IDs.
 * ========================================================================== */
import { childEntries, meaningFieldsOf, nodeTypeInfo, mapChildrenInPlace } from './nodeRegistry.js';
import { structurallyEqual } from './structuralEquality.js';
import { cloneExpression, copyWithFreshIds, createNodeId } from './nodeFactory.js';
import { equals, isExactNumberInput } from './rational.js';

const isVariable = (pattern, variables) => pattern?.type === 'Symbol' && variables.includes(pattern.name);
const ungroup = node => { while (node?.type === 'Group') node = node.operand; return node; };

export function matchPattern(pattern, node, variables) {
  const bindings = {};
  const match = (p, n) => {
    if (isVariable(p, variables)) {
      if (Object.hasOwn(bindings, p.name)) return structurallyEqual(bindings[p.name], n);
      bindings[p.name] = n;
      return true;
    }
    n = ungroup(n);
    if (!n || p.type !== n.type) return false;
    for (const key of Object.keys(meaningFieldsOf(nodeTypeInfo(p)))) {
      const same = key === 'value' && isExactNumberInput(p[key]) && isExactNumberInput(n[key])
        ? equals(p[key], n[key]) : p[key] === n[key];
      if (!same) return false;
    }
    const pc = childEntries(p), nc = childEntries(n);
    return pc.length === nc.length && pc.every((entry, i) => entry.index === nc[i].index && match(entry.child, nc[i].child));
  };
  return match(pattern, node) ? bindings : null;
}


export function instantiate(pattern, bindings, variables) {
  const used = new Set();
  const build = p => {
    if (isVariable(p, variables)) {
      const bound = bindings[p.name];
      if (!bound) throw new TypeError(`Identity: the variable ${p.name} is not bound.`);
      if (used.has(p.name)) return copyWithFreshIds(bound);
      used.add(p.name);
      return cloneExpression(bound);
    }
    return mapChildrenInPlace({ ...p, id: createNodeId() }, build);
  };
  return build(pattern);
}
