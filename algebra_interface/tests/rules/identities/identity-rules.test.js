// Stage E4b: identity rules written as data (owner decision), matched and
// rebuilt by js/engine/patterns.js, applied by one bundle (js/rules/identities/).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../../js/engine/parser.js';
import { matchPattern, instantiate } from '../../../js/engine/patterns.js';
import { toCanonicalText } from '../../../js/engine/canonicalText.js';
import { structurallyEqual } from '../../../js/engine/structuralEquality.js';
import { assertAstInvariants } from '../../../js/documents/documentInvariants.js';
import { walkExpression } from '../../../js/engine/treeUtils.js';
import { evaluateNumericNode } from '../../../js/engine/treeUtils.js';
import { defineIdentity } from '../../../js/definitions/define.js';
import { IDENTITIES } from '../../../js/rules/identities/identities.js';
import { applyIdentity, identitiesAt } from '../../../js/rules/identities/engine.js';
import { identityRuleDeclarations } from '../../../js/rules/identities/rule.js';

const parse = String.raw;
const idsOf = root => { const ids = []; walkExpression(root, node => ids.push(node.id)); return ids; };

test('a pattern binds its variables, and a repeated variable must match the same expression', () => {
  const pattern = parseExpression(parse`\sin(a+b)`);
  const bindings = matchPattern(pattern, parseExpression(parse`\sin(2x+y)`), ['a', 'b']);
  assert.equal(toCanonicalText(bindings.a), 'Multiply(2, x)');
  assert.equal(toCanonicalText(bindings.b), 'y');
  assert.equal(matchPattern(pattern, parseExpression(parse`\cos(x+y)`), ['a', 'b']), null);
  assert.equal(matchPattern(pattern, parseExpression(parse`\sin(x+y+z)`), ['a', 'b']), null, 'no hidden regrouping');
  const square = parseExpression('a·a');
  assert.ok(matchPattern(square, parseExpression('(x+1)·(x+1)'), ['a']));
  assert.equal(matchPattern(square, parseExpression('x·y'), ['a']), null);
  // A non-variable symbol must match itself.
  assert.equal(matchPattern(parseExpression('a+c'), parseExpression('x+y'), ['a']), null);
});

test('instantiating keeps the first use of each bound expression and copies the rest with fresh IDs', () => {
  const target = parseExpression('x+y');
  const bindings = { a: target.operands[0] };
  const built = instantiate(parseExpression('a·a'), bindings, ['a']);
  assert.equal(built.operands[0].id, target.operands[0].id);
  assert.notEqual(built.operands[1].id, target.operands[0].id);
  assert.ok(structurallyEqual(built.operands[0], built.operands[1]));
});

test('sin and cos addition expand and collapse, keep the value, and the tree stays valid', () => {
  const root = parseExpression(parse`2\sin(x+y)`);
  const apply = root.operands[1];
  assert.deepEqual(identitiesAt(root, apply.id), [{ identityId: 'sin.addition', direction: 'expand' }]);
  const expanded = applyIdentity(root, { identityId: 'sin.addition', nodeId: apply.id, direction: 'expand' });
  assertAstInvariants(expanded.root);
  assert.equal(expressionToInput(expanded.root), parse`2 (\sin(x) \cos(y)+\cos(x) \sin(y))`);
  assert.equal(new Set(idsOf(expanded.root)).size, idsOf(expanded.root).length, 'no repeated IDs');
  assert.ok(idsOf(expanded.root).includes(apply.arguments[0].operands[0].id), 'x keeps its occurrence');
  const sum = expanded.root.operands[1];
  const collapsed = applyIdentity(expanded.root, { identityId: 'sin.addition', nodeId: sum.id, direction: 'collapse' });
  assert.ok(structurallyEqual(collapsed.root, root));
  const cos = parseExpression(parse`\cos(a+b)`);
  assert.equal(expressionToInput(applyIdentity(cos, { identityId: 'cos.addition', nodeId: cos.id, direction: 'expand' }).root),
    parse`\cos(a) \cos(b)+-(\sin(a) \sin(b))`);
  // Not applicable: refused with null, the tree untouched.
  const plain = parseExpression(parse`\sin(x)`);
  assert.equal(applyIdentity(plain, { identityId: 'sin.addition', nodeId: plain.id, direction: 'expand' }), null);
  assert.equal(evaluateNumericNode(plain), null);
});

test('identities are data: checked definitions, one folder each, and a declaration per direction', () => {
  assert.throws(() => defineIdentity({ id: 'x', lhs: 'a', rhs: 'b', variables: ['a'] }), /label/);
  assert.throws(() => defineIdentity({ id: 'x', label: 'l', lhs: 'a', rhs: 'b', variables: 'a' }), /variables/);
  assert.throws(() => defineIdentity({ id: 'x', label: 'l', lhs: 'a', rhs: 'b', variables: ['a'], directions: ['sideways'] }), /directions/);
  assert.deepEqual(IDENTITIES.list.map(identity => identity.id), ['sin.addition', 'cos.addition']);
  for (const identity of IDENTITIES.list) {
    assert.doesNotThrow(() => parseExpression(identity.lhs), identity.id);
    assert.doesNotThrow(() => parseExpression(identity.rhs), identity.id);
  }
  assert.deepEqual(identityRuleDeclarations.map(d => `${d.ruleId} ${d.kind} ${d.on.ownerType}`),
    ['sin.addition activate Apply', 'sin.addition activate Add', 'cos.addition activate Apply', 'cos.addition activate Add']);
});

// The visual suite found this (E4b): reading the patterns used up document
// node IDs, so every document's IDs shifted. Patterns now take pattern-n IDs.
import { createNodeId } from '../../../js/engine/nodeFactory.js';
import { sidesOf } from '../../../js/rules/identities/engine.js';
test('reading identity patterns does not use up document node IDs', () => {
  const before = Number(createNodeId().slice(5));
  for (const identity of IDENTITIES.list) {
    const { lhs, rhs } = sidesOf(identity);
    assert.ok(idsOf(lhs).concat(idsOf(rhs)).every(id => id.startsWith('pattern-')), identity.id);
  }
  assert.equal(Number(createNodeId().slice(5)), before + 1);
});
