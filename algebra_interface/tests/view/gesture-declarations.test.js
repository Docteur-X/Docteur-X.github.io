/**
 * Gesture declarations (standard 2, decision 2.2) stay complete and valid:
 * every registered rule declares at least one gesture, every declaration
 * names a registered rule, and parts read from labels match them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GESTURE_DECLARATIONS } from '../../js/app/gestureDeclarations.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { createInputRouter, GESTURE_KINDS, partMatches } from '../../js/view/inputRouter.js';
import { createViewMode } from '../../js/view/viewMode.js';
import { partFromElement } from '../../js/view/partFromElement.js';

const ruleIds = createApplicationTransformationFeatures().list().map(feature => feature.id);

test('every registered rule declares at least one gesture', () => {
  const declared = new Set(GESTURE_DECLARATIONS.map(d => d.ruleId));
  assert.deepEqual(ruleIds.filter(id => !declared.has(id)), []);
});

test('every declaration names a registered rule and a known gesture kind', () => {
  for (const d of GESTURE_DECLARATIONS) {
    assert.ok(ruleIds.includes(d.ruleId), d.ruleId);
    assert.ok(GESTURE_KINDS.includes(d.kind), `${d.ruleId}: ${d.kind}`);
    assert.equal(typeof d.description, 'string', d.ruleId);
  }
});

// A minimal stand-in for a labelled element: closest() finds itself.
const element = dataset => ({ dataset, closest: () => ({ dataset }) });
const tree = {
  'add-1': { id: 'add-1', type: 'Add' },
  'neg-1': { id: 'neg-1', type: 'Negate' },
  'mul-1': { id: 'mul-1', type: 'Multiply' },
  'n-1': { id: 'n-1', type: 'Number', value: '-1' },
  'x': { id: 'x', type: 'Symbol' }
};
const findNode = id => tree[id] ?? null;

test('parts are read from the labels and the tree, never from CSS classes', () => {
  assert.deepEqual(partFromElement(element({ hitboxRole: 'operator', operatorOwnerId: 'neg-1' }), { findNode }),
    { role: 'operator', ownerId: 'neg-1', ownerType: 'Negate' });
  assert.deepEqual(partFromElement(element({ hitboxRole: 'occurrence', nodeId: 'n-1', parentId: 'mul-1' }), { findNode }),
    { role: 'occurrence', nodeId: 'n-1', nodeType: 'Number', value: '-1', parentType: 'Multiply', selected: false });
});

test('"what can I do here?" for a minus sign and a −1 factor', () => {
  const router = createInputRouter({ viewMode: createViewMode('v'), places: Object.fromEntries(
    ['document-capture', 'view', 'view-parent', 'document', 'window'].map(at => [at, { addEventListener() {} }])) });
  for (const d of GESTURE_DECLARATIONS) router.declare(d);
  const minus = partFromElement(element({ hitboxRole: 'operator', operatorOwnerId: 'neg-1' }), { findNode });
  assert.deepEqual(router.gesturesFor(minus).map(d => d.ruleId), ['negation.expand']);
  const minusOne = partFromElement(element({ hitboxRole: 'occurrence', nodeId: 'n-1', parentId: 'mul-1' }), { findNode });
  assert.deepEqual(router.gesturesFor(minusOne).map(d => d.ruleId).sort(), [
    'identity.introduce', 'multiplication.combine-numeric', 'multiplication.distribute',
    'multiplication.distribute', 'multiplication.rearrange', 'multiplication.rearrange', 'negation.compress'
  ].sort());
  assert.equal(partMatches({ selected: true }, minusOne), false);
});
