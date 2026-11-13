// Stage E4c: < and > are relation definitions, one folder each; the
// both-sides rule serves every relation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parseExpression, expressionToInput, expressionToDisplayString } from '../../js/engine/parser.js';
import { toCanonicalText, fromCanonicalText } from '../../js/engine/canonicalText.js';
import { toMathJSON } from '../../js/engine/mathJson.js';
import { assertAstInvariants } from '../../js/documents/documentInvariants.js';
import { isRelationNode, categoryOf } from '../../js/engine/nodeRegistry.js';
import { structurallyEqual } from '../../js/engine/structuralEquality.js';
import { RELATIONS, relationForNode } from '../../js/definitions/relations/relations.js';
import { requirementsMet } from '../../js/engine/structures.js';
import { addOppositeToBothSides } from '../../js/rules/both-sides/engine.js';

test('< and > read, print, convert and check like =', () => {
  const less = parseExpression('x+2<5');
  assert.equal(toCanonicalText(less), 'Less(Add(x, 2), 5)');
  assert.ok(isRelationNode(less));
  assert.equal(categoryOf(less), 'statement');
  assertAstInvariants(less);
  assert.equal(expressionToInput(less), 'x+2<5');
  assert.equal(expressionToDisplayString(parseExpression('3>y')), '3 > y');
  assert.deepEqual(toMathJSON(less), ['Less', ['Add', 'x', 2], 5]);
  assert.ok(structurallyEqual(fromCanonicalText('Greater(3, y)'), parseExpression('3>y')));
  assert.ok(!structurallyEqual(parseExpression('a<b'), parseExpression('a>b')));
  assert.equal(relationForNode(less).spoken, 'is less than');
});

test('relation signs keep the old refusals: one per statement, never inside brackets', () => {
  assert.throws(() => parseExpression('a<b<c'), /Only one relation sign/);
  assert.throws(() => parseExpression('(a<b)'), /cannot appear inside arithmetic brackets/);
  assert.throws(() => parseExpression('<a'), /needs an expression on both sides/);
  assert.throws(() => parseExpression('|a|'), /reserved/);
  assert.throws(() => assertAstInvariants(fromCanonicalText('Add(Less(a, b), c)')), /statement can only be the whole object/);
});

test('each relation says what doing the same to both sides does', () => {
  assert.equal(RELATIONS.get('less').converse, 'greater');
  assert.equal(RELATIONS.get('greater').converse, 'less');
  assert.deepEqual(RELATIONS.get('less').bothSides.multiply, { bySign: { positive: 'same', zero: 'equal', negative: 'converse' } });
  assert.ok(RELATIONS.get('less').bothSides.invert.refuse);
  const clause = [{ relation: 'acted-on', bothSides: 'add' }];
  for (const input of ['a=b', 'a<b', 'a>b']) assert.ok(requirementsMet(clause, parseExpression(input)).met, input);
  assert.ok(!requirementsMet([{ relation: 'acted-on', bothSides: 'apply' }], parseExpression('a<b')).met);
  assert.ok(!requirementsMet(clause, parseExpression('a+b')).met, 'not a statement');
});

test('adding the opposite to both sides keeps an inequality, as it keeps an equation', () => {
  const less = parseExpression('x+2<5');
  const result = addOppositeToBothSides(less, less.left.operands[1].id);
  assert.equal(result.root.type, 'Less');
  assert.equal(expressionToDisplayString(result.root), 'x + 2 + −2 < 5 + −2');
  assertAstInvariants(result.root);
});

// The test of E4c: a new relation needs no edit outside its folder (apart
// from its line in js/definitions/relations/relations.js).
function jsFiles(dir) {
  return readdirSync(new URL(`../../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? jsFiles(`${dir}/${entry.name}`) : entry.name.endsWith('.js') ? [`${dir}/${entry.name}`] : []);
}
test('the Less and Greater node types are named only in their own folders', () => {
  for (const [type, folder] of [['Less', 'js/definitions/relations/less/'], ['Greater', 'js/definitions/relations/greater/']]) {
    const naming = jsFiles('js').filter(file => new RegExp(`['"]${type}['"]`).test(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')));
    assert.deepEqual(naming.filter(file => !file.startsWith(folder)), [], type);
  }
});

// Clean-up C1: the classes the renderer gives a relation are relation-neutral
// (relation-root, relation-sign), since they draw <, > and = alike.
test('no code or stylesheet uses an =-specific class for what every relation draws', () => {
  const stylesheets = readdirSync(new URL('../../css/', import.meta.url)).filter(name => name.endsWith('.css')).map(name => `css/${name}`);
  const sources = [...jsFiles('js'), ...stylesheets, 'styles.css', 'index.html']
    .filter(file => /equality-(root|sign)\b/.test(readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')));
  assert.deepEqual(sources, []);
});
