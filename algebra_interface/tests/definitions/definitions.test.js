// Engine stage E3: types, operators and relations as definition objects;
// rules declare what they need, and the coordinator checks it.
// Design: Developer Documentation/06_Historical_Records/Superseded_2026-11-12/Engine_Standard_Design_Draft.md (decisions: 00_Current/Decisions.md)
import test from 'node:test';
import assert from 'node:assert/strict';
import { defineType, defineOperator, defineRelation, defineRegistry } from '../../js/definitions/define.js';
import { TYPES } from '../../js/definitions/types/types.js';
import { OPERATORS } from '../../js/definitions/operators/operators.js';
import { RELATIONS } from '../../js/definitions/relations/relations.js';
import { NODE_TYPES, allNodeTypes } from '../../js/engine/nodeRegistry.js';
import { INFIX_LEVELS, PRINT } from '../../js/engine/notation.js';
import { hasProperty, setPropertyOverride, requirementsMet, typeOf } from '../../js/engine/structures.js';
import { RULE_BUNDLES } from '../../js/rules/bundles.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';
import { parseExpression } from '../../js/engine/parser.js';

test('definition helpers refuse a mistaken definition with a clear message', () => {
  assert.throws(() => defineType({ id: 'bad', operations: { Add: { properties: ['commutativ'] } } }), /unknown property commutativ/);
  assert.throws(() => defineType({ id: 'bad', operations: { Add: { properties: ['identity'] } } }), /does not name it/);
  assert.throws(() => defineType({ id: 'bad', operations: { Add: { properties: ['inverses'] } } }), /inverse operator/);
  assert.throws(() => defineOperator({ id: 'Wobble', arity: -1 }), /arity/);
  assert.throws(() => defineOperator({ id: 'Wobble', arity: 2, definedAs: { sequentially: 'X', direction: 'up' } }), /definedAs/);
  assert.throws(() => defineRelation({ id: 'less', bothSides: { multiply: 'maybe' } }), /bothSides.multiply/);
  assert.throws(() => defineRegistry('Type', [{ id: 'a' }, { id: 'a' }]), /listed twice/);
  const group = defineType({ id: 'group-element', operations: { Multiply: { properties: ['associative', 'identity', 'inverses'],
    identity: 'e', inverse: 'Invert' } } });
  assert.ok(Object.isFrozen(group.operations.Multiply.properties));
});

test('scalars form a field, and every property is read from the scalar type', () => {
  assert.equal(typeOf(parseExpression('a+b')), 'scalar');
  for (const operation of ['Add', 'Multiply']) {
    for (const property of ['associative', 'commutative', 'identity', 'inverses']) assert.ok(hasProperty(operation, property), `${operation} ${property}`);
  }
  assert.ok(hasProperty('Multiply', 'distributive'));
  assert.ok(!hasProperty('Add', 'distributive'));
  assert.deepEqual(TYPES.get('scalar').operations.Multiply.distributesOver, ['Add']);
  // A lesson override switches one property off and back on.
  setPropertyOverride('Multiply', 'commutative', false);
  try { assert.ok(!hasProperty('Multiply', 'commutative')); }
  finally { setPropertyOverride('Multiply', 'commutative', true); }
  assert.ok(hasProperty('Multiply', 'commutative'));
});

test('every stored operator node has an operator definition, and the notation table is assembled from them', () => {
  const operatorNodes = OPERATORS.list.filter(operator => operator.node).map(operator => operator.node).sort();
  const atoms = ['Apply', 'Number', 'Symbol'];
  const expressionTypes = Object.keys(NODE_TYPES).filter(type => NODE_TYPES[type].category === 'expression').sort();
  assert.deepEqual([...operatorNodes, ...atoms].sort(), expressionTypes);
  assert.deepEqual(INFIX_LEVELS.map(level => level.node), ['Add', 'Multiply']);
  assert.deepEqual(Object.keys(PRINT).sort(), allNodeTypes().sort());
  // Natural forms are defined from axioms (owner decisions), not stored as them.
  assert.deepEqual(OPERATORS.get('Add').definedAs, { sequentially: 'BinaryAdd', direction: 'left' });
  assert.equal(OPERATORS.get('BinaryAdd').node, null);
  assert.deepEqual(RELATIONS.get('equal').properties, ['reflexive', 'symmetric', 'transitive']);
  assert.equal(RELATIONS.get('equal').node, 'Equal');
});

// Rules whose operation is chosen per action (+ or ×) ask the type inside
// their Engine function instead; numeric combination works on numbers.
const ASKS_INSIDE_ITS_ENGINE = new Set(['identity.introduce', 'grouping.range',
  'addition.combine-numeric', 'multiplication.combine-numeric']);
const FEATURES = RULE_BUNDLES.flatMap(bundle => bundle.features);

test('every rule declares what it requires, or is a named exception', () => {
  const silent = FEATURES.filter(feature => !feature.requires && !ASKS_INSIDE_ITS_ENGINE.has(feature.id)).map(feature => feature.id);
  assert.deepEqual(silent, []);
  for (const feature of FEATURES.filter(feature => feature.requires)) {
    // A rule about a relation is checked on one (stage E4c: 'acted-on' reads the statement).
    const root = feature.requires.some(clause => clause.relation) ? parseExpression('a+b=c') : null;
    assert.ok(requirementsMet(feature.requires, root).met, `${feature.id} must be available for scalars`);
  }
});

test('a rule is refused when its type lacks a property it requires (lesson override)', () => {
  const coordinator = createTransformationCoordinator(Object.fromEntries(FEATURES.map(feature =>
    [feature.id, { ...feature, propose: () => ({ root: parseExpression('a') }) }])));
  const expression = parseExpression('a+b'), statement = parseExpression('a+b=c');
  for (const feature of FEATURES.filter(feature => feature.requires)) {
    const root = feature.requires.some(clause => clause.relation) ? statement : expression;
    assert.ok(coordinator.propose(root, { ruleId: feature.id, parameters: {} }), `${feature.id} is offered`);
    for (const clause of feature.requires.filter(clause => clause.operation)) {
      for (const property of clause.properties) {
        setPropertyOverride(clause.operation, property, false);
        try { assert.equal(coordinator.propose(root, { ruleId: feature.id, parameters: {} }), null, `${feature.id} without ${clause.operation} ${property}`); }
        finally { setPropertyOverride(clause.operation, property, true); }
      }
    }
  }
  const root = expression;
  assert.deepEqual(requirementsMet([{ operation: 'Add', properties: ['distributive'] }], root).missing,
    [{ operation: 'Add', property: 'distributive', type: 'scalar' }]);
  assert.deepEqual(requirementsMet([{ relation: 'equal', bothSides: 'teleport' }], root).missing,
    [{ relation: 'equal', bothSides: 'teleport' }]);
});
