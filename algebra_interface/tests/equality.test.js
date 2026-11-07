import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../js/core/parser.js';
import { createEqual, swapEqualitySides, evaluateEquality } from '../js/relations/equality.js';
import { createMathematicalDocument, updateDocumentRoot } from '../js/core/mathematicalDocument.js';
import { categoryOf, isScalarExpression } from '../js/core/nodeCategories.js';
import { getUniqueSymbolNames, findNodeLocation } from '../js/core/treeUtils.js';
import { normaliseWithRules } from '../js/core/normalization.js';
import { toMathJSON } from '../js/core/mathJson.js';

test('one top-level equality parses to two independent scalar expressions', () => {
  const root = parseExpression('a+b=c+d');
  assert.equal(root.type, 'Equal');
  assert.equal(root.left.type, 'Add');
  assert.equal(root.right.type, 'Add');
  assert.notEqual(root.left.id, root.right.id);
  assert.equal(expressionToInput(root), 'a+b=c+d');
  assert.equal(expressionToDisplayString(root), 'a + b = c + d');
  assert.deepEqual(toMathJSON(root), ['Equal', ['Add','a','b'], ['Add','c','d']]);
});
test('invalid equality syntax is rejected before tree construction', () => {
  for (const input of ['a=b=c','a==b','a=','=b','a=(b=c)','(a=b)+c'])
    assert.throws(() => parseExpression(input), undefined, input);
});
test('expression parser remains backward compatible', () => {
  assert.equal(parseExpression('a+b').type, 'Add');
  assert.equal(parseExpression('2*(a+b)').type, 'Add');
});
test('equality cannot compare a relation or statement to an arithmetic expression', () => {
  assert.throws(() => createEqual(parseExpression('a=b'), parseExpression('c')));
  assert.equal(isScalarExpression(parseExpression('a+b')), true);
  assert.equal(categoryOf(parseExpression('a=b')), 'statement');
});
test('symmetry preserves both side IDs and can be undone by a snapshot', () => {
  const equal = parseExpression('a+b=c');
  const before = structuredClone(equal);
  const oldLeft = equal.left.id, oldRight = equal.right.id;
  const event = swapEqualitySides(equal);
  assert.equal(equal.left.id, oldRight);
  assert.equal(equal.right.id, oldLeft);
  assert.equal(event.rule, 'equality.symmetry');
  assert.equal(expressionToInput(before), 'a+b=c');
});
test('tree traversal finds symbols and node locations on both sides', () => {
  const equal = parseExpression('a+b=c+d');
  assert.deepEqual(getUniqueSymbolNames(equal), ['a','b','c','d']);
  assert.equal(findNodeLocation(equal, equal.left.id).index, 'left');
  assert.equal(findNodeLocation(equal, equal.right.id).index, 'right');
  assert.equal(normaliseWithRules(equal).type, 'Equal');
});
test('directly comparable literals give true and false', () => {
  assert.equal(evaluateEquality(parseExpression('3=3')).status, 'true');
  assert.equal(evaluateEquality(parseExpression('2=3')).status, 'false');
});
test('symbolic equality is unknown without assignment and reflexive when identical', () => {
  assert.equal(evaluateEquality(parseExpression('x=3')).status, 'unknown');
  assert.equal(evaluateEquality(parseExpression('x+x=x+x')).reason, 'reflexivity');
  assert.equal(evaluateEquality(parseExpression('x=3'), {x:3}).status, 'true');
  assert.equal(evaluateEquality(parseExpression('x=3'), {x:4}).status, 'false');
});
test('truth checking does not silently evaluate both arithmetic sides', () => {
  assert.equal(evaluateEquality(parseExpression('1+2=3')).status, 'unknown');
});
test('mathematical document stores an expression or statement and updates kind', () => {
  const doc = createMathematicalDocument(parseExpression('a+b'));
  assert.equal(doc.kind, 'expression');
  assert.equal(doc.schemaVersion, 1);
  updateDocumentRoot(doc, parseExpression('a=b'));
  assert.equal(doc.kind, 'statement');
  assert.equal(doc.root.type, 'Equal');
  assert.deepEqual(doc.history.nodes, []);
});
