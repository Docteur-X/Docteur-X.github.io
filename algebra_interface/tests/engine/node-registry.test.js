// Engine stage E1: the node registry and the canonical text form.
// Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { NODE_TYPES, childEntries, isRelationNode, categoryOf } from '../../js/engine/nodeRegistry.js';
import { toCanonicalText, fromCanonicalText } from '../../js/engine/canonicalText.js';
import { parseExpression, expressionToInput } from '../../js/engine/parser.js';
import { structurallyEqual } from '../../js/engine/structuralEquality.js';
import { assertAstInvariants } from '../../js/documents/documentInvariants.js';
import { createApply, createSymbol, cloneExpression } from '../../js/engine/nodeFactory.js';
import { walkExpression, findNodeLocation, replaceNodeAtLocation } from '../../js/engine/treeUtils.js';
import { NODE_SPECS } from '../../js/view/rendering/nodeSpecs.js';
import { operatorMetadata } from '../../js/engine/operatorMetadata.js';
import { toMathJSON } from '../../js/engine/mathJson.js';

const withoutIds = node => JSON.parse(JSON.stringify(node, (key, value) => key === 'id' ? undefined : value));

const CORPUS = ['a', '3', '-3', '0.1+0.2', 'a+b', 'a-b', '2x-3=y', 'a÷b', 'a÷b×c', '6÷2 x', '-(a+b)',
  '[a+b]c', '{a}', '3.5a·b', 'a×b×c', '1/3', 'x=-2', 'a·(b+c)', '-a·-b', '2(a+b)=c-d', 'a÷(b+c)', '_alpha+β'];

test('every expression node type has a renderer spec and operator metadata, and nothing else does', () => {
  const expressionTypes = Object.keys(NODE_TYPES).filter(type => NODE_TYPES[type].category === 'expression').sort();
  assert.deepEqual(Object.keys(NODE_SPECS).sort(), expressionTypes);
  assert.deepEqual(Object.keys(operatorMetadata()).sort(), expressionTypes);
});

test('the canonical text form writes the meaning only, by default', () => {
  assert.equal(toCanonicalText(parseExpression('a÷b')), 'Multiply(a, Invert(b))');
  assert.equal(toCanonicalText(parseExpression('2x-3=y')), 'Equal(Add(Multiply(2, x), Negate(3)), y)');
  assert.equal(toCanonicalText(parseExpression('a×b')), toCanonicalText(parseExpression('a·b')));
  assert.equal(toCanonicalText(parseExpression('a·b'), { notation: true }), 'Multiply[displayStyle=dot](a, b)');
  assert.equal(toCanonicalText(createApply('sin', [createSymbol('x')])), 'Apply[operator=sin](x)');
  assert.equal(toCanonicalText(createSymbol('x y')), '"x y"');
});

test('canonical text with notation round-trips every corpus expression exactly (apart from IDs)', () => {
  for (const input of CORPUS) {
    const tree = parseExpression(input);
    const text = toCanonicalText(tree, { notation: true });
    const back = fromCanonicalText(text);
    assertAstInvariants(back);
    assert.deepEqual(withoutIds(back), withoutIds(tree), input);
    assert.equal(expressionToInput(back), expressionToInput(tree), input);
    // Meaning-only text reads back to a structurally equal tree.
    assert.ok(structurallyEqual(fromCanonicalText(toCanonicalText(tree)), tree), input);
  }
});

test('canonical text refuses what the registry would not accept', () => {
  assert.throws(() => fromCanonicalText('Wobble(a)'), /unknown node type Wobble/);
  assert.throws(() => fromCanonicalText('Negate(a, b)'), /takes one child/);
  assert.throws(() => fromCanonicalText('Equal(a)'), /takes 2 children/);
  assert.throws(() => fromCanonicalText('Add()'), /at least 1/);
  assert.throws(() => fromCanonicalText('Multiply[displayStyle=wavy](a, b)'), /no field displayStyle=wavy/);
  assert.throws(() => fromCanonicalText('Apply(x)'), /valid operator/);
  assert.throws(() => fromCanonicalText('Add(a, b) c'), /unexpected text/);
  // A relation inside an expression is caught by the document invariants.
  assert.throws(() => assertAstInvariants(fromCanonicalText('Add(Equal(a, b), c)')), /statement can only be the whole object/);
});

test('generic helpers reach every child slot: relation sides, operands, operand and Apply arguments', () => {
  const tree = fromCanonicalText('Equal(Apply[operator=f](Negate(x), Group(y)), Multiply(2, Invert(z)))');
  const seen = [];
  walkExpression(tree, (node, parent, index) => seen.push(`${node.type === 'Symbol' ? node.name : node.type}@${index}`));
  assert.deepEqual(seen, ['Equal@null', 'Apply@left', 'Negate@0', 'x@operand', 'Group@1', 'y@operand',
    'Multiply@right', 'Number@0', 'Invert@1', 'z@operand']);
  assert.deepEqual(childEntries(tree).map(entry => entry.index), ['left', 'right']);
  const y = tree.left.arguments[1].operand;
  assert.ok(replaceNodeAtLocation(findNodeLocation(tree, y.id), createSymbol('w')));
  assert.equal(toCanonicalText(tree), 'Equal(Apply[operator=f](Negate(x), Group(w)), Multiply(2, Invert(z)))');
  assert.deepEqual(toMathJSON(tree), ['Equal', ['f', ['Negate', 'x'], 'w'], ['Multiply', 2, ['Power', 'z', -1]]]);
});

test('relations are recognised through the registry and compare structurally', () => {
  const a = parseExpression('2x=y'), b = parseExpression('2·x=y');
  assert.ok(isRelationNode(a));
  assert.equal(categoryOf(a), 'statement');
  assert.ok(!isRelationNode(a.left));
  assert.ok(structurallyEqual(a, b));
  assert.ok(!structurallyEqual(a, parseExpression('y=2x')));
  assert.ok(structurallyEqual(cloneExpression(a), a));
});

// Prevention (E1): code outside the =-specific places must ask the registry
// (isRelationNode, categoryOf, childEntries), never compare with 'Equal', and
// FunctionCall must not come back. A new relation then needs no edit here.
function jsFiles(dir) {
  return readdirSync(new URL(`../../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? jsFiles(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []);
}
const EQUAL_ALLOWED = [/^js\/engine\/relations\//, /^js\/definitions\/relations\//, /^js\/rules\/equality\//,
  /^js\/rules\/both-sides\//, /^js\/engine\/mathJson\.js$/, /^js\/engine\/parser\.js$/, /^js\/engine\/nodeRegistry\.js$/];

test('no module outside the = rules compares a node type with Equal, and FunctionCall is gone', () => {
  const offenders = [];
  for (const file of jsFiles('js')) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    if (/FunctionCall/.test(source.replace(/^\s*(\/\/|\*).*$/gm, ''))) offenders.push(`${file}: FunctionCall`);
    if (!EQUAL_ALLOWED.some(pattern => pattern.test(file)) && /[=!]==\s*['"]Equal['"]|case\s+['"]Equal['"]/.test(source)) {
      offenders.push(`${file}: compares with 'Equal' (use isRelationNode)`);
    }
  }
  assert.deepEqual(offenders, []);
});
