// Renderer standard step 6: every node type is written by one specification.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NODE_SPECS, specFor, describeNode } from '../../../js/view/rendering/nodeSpecs.js';

test('every specification describes its node and draws its interior', () => {
  for (const [type, spec] of Object.entries(NODE_SPECS)) {
    assert.equal(typeof spec.describe, 'function', type);
    assert.equal(typeof spec.contents, 'function', type);
  }
});

test('operations drawn as a sequence also draw their operator', () => {
  for (const type of ['Add', 'Multiply']) assert.equal(typeof NODE_SPECS[type].operator, 'function', type);
});

test('an unknown node type falls back to a plain leaf', () => {
  assert.equal(describeNode({ type: 'Mystery' }), 'expression');
  assert.equal(specFor({ type: 'Mystery' }).compound, undefined);
});
