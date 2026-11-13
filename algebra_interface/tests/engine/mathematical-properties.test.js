/**
 * Independent, reproducible semantic checks for algebraic rewrites.
 *
 * These tests deliberately compute expected values from ordinary JavaScript
 * arithmetic, NOT from the expression evaluator or the transformation code.
 * Exact AST/provenance tests live in distribution.test.js and factorisation.test.js;
 * these checks complement them by detecting meaning-changing rewrites.
 *
 * Scope: finite scalar arithmetic only. In particular, this does not grant
 * commutativity to future matrix/vector operations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../helpers/legacyRootParser.js';
import { evaluateNumericNode } from '../../js/engine/treeUtils.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../../js/engine/operations/distribution.js';
import { getFactorisationPlan, applyFactorisation } from '../../js/engine/operations/factorisation.js';
import { toExactString } from '../../js/engine/rational.js';
// Exact numbers compare as their exact text, such as '24' or '-0.5'.
const exact = value => value === null ? null : toExactString(value);

/** A fixed-seed generator ensures every failure is reproducible. */
function seeded(seed = 0x1a2b3c4d) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const expression = root => root.type === 'Add' && root.operands.length === 1 ? root.operands[0] : root;

/** Test both distribution directions, including factor-order preservation. */
test('seeded scalar distribution preserves independently calculated values', () => {
  const random = seeded();
  for (let trial = 0; trial < 40; trial++) {
    const a = integer(random, 1, 9);
    const b = integer(random, 1, 9);
    const c = integer(random, 1, 9);
    const right = trial % 2 === 1;
    const root = parseExpression(right ? `(${b}+${c})*${a}` : `${a}*(${b}+${c})`);
    const product = root.operands[0];
    const factorIndex = right ? 1 : 0;
    const sumIndex = right ? 0 : 1;
    const sum = unwrapGroupedSum(product.operands[sumIndex]);
    const plan = getDistributionPlan(product, product.operands[factorIndex].id, sum.id);
    assert.ok(plan, `trial ${trial}: eligible distribution`);
    const expected = a * b + a * c; // Independent arithmetic oracle.
    assert.equal(exact(evaluateNumericNode(expression(root))), String(expected), `trial ${trial}: input`);
    assert.ok(applyDistribution(root, plan), `trial ${trial}: commit`);
    assert.equal(exact(evaluateNumericNode(expression(root))), String(expected), `trial ${trial}: output`);
  }
});

test('seeded scalar factorisation preserves independently calculated values', () => {
  const random = seeded(0x726f6f74);
  for (let trial = 0; trial < 40; trial++) {
    const a = integer(random, 1, 9);
    const b = integer(random, 1, 9);
    const c = integer(random, 1, 9);
    const right = trial % 2 === 1;
    const root = parseExpression(right ? `(${b}*${a}+${c}*${a})` : `(${a}*${b}+${a}*${c})`);
    const sum = root.operands[0].operand;
    const ids = sum.operands.map(p => p.operands[right ? p.operands.length - 1 : 0].id);
    const expected = a * b + a * c;
    assert.equal(exact(evaluateNumericNode(expression(root))), String(expected), `trial ${trial}: input`);
    const plan = getFactorisationPlan(root, ids);
    assert.ok(plan, `trial ${trial}: eligible extraction`);
    const result = applyFactorisation(root, plan);
    assert.ok(result, `trial ${trial}: commit`);
    assert.equal(exact(evaluateNumericNode(expression(result.root))), String(expected), `trial ${trial}: output`);
  }
});
