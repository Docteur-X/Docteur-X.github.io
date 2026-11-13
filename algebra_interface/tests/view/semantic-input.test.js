import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticInput, recognizeNegationExpansion, negationActivationFromDom } from '../../js/view/semanticInput.js';
const element = { dataset: { operatorOwnerId: 'neg-1' } };
const view = { contains: node => node === element };
const event = (type, key) => ({ type, key, target: { closest: selector => selector === '.negate-operator-hitbox' ? element : null } });
test('pointer and keyboard negation activations converge on one mathematical request', () => {
  const pointer = negationActivationFromDom({ event: event('click'), view, viewId: 'view-1', objectId: 'obj-1' });
  const keyboard = negationActivationFromDom({ event: event('keydown', 'Enter'), view, viewId: 'view-1', objectId: 'obj-1' });
  assert.equal(pointer.method, 'pointer');
  assert.equal(keyboard.method, 'keyboard');
  assert.deepEqual(recognizeNegationExpansion(pointer), recognizeNegationExpansion(keyboard));
  assert.deepEqual(recognizeNegationExpansion(pointer), { ruleId: 'negation.expand', parameters: { negateNodeId: 'neg-1' } });
});
test('unsupported key, detached element, and wrong role do not trigger transformation', () => {
  assert.equal(negationActivationFromDom({ event: event('keydown', 'Tab'), view, viewId: 'v', objectId: 'o' }), null);
  assert.equal(negationActivationFromDom({ event: event('click'), view: { contains: () => false }, viewId: 'v', objectId: 'o' }), null);
  assert.equal(recognizeNegationExpansion(semanticInput({ phase: 'activate', method: 'pointer', viewId: 'v', objectId: 'o', target: { nodeId: 'x', role: 'occurrence' } })), null);
});
test('semantic events validate identity, preserve operator address and are immutable', () => {
  assert.throws(() => semanticInput({ phase: 'activate', method: 'pointer', viewId: '', objectId: 'o', target: { nodeId: 'x', role: 'operator' } }), TypeError);
  const input = semanticInput({ phase: 'hover', method: 'pointer', viewId: 'v', objectId: 'o', target: { nodeId: 'x', role: 'operator', operatorPosition: 1 } });
  assert.equal(input.target.operatorPosition, 1);
  assert.equal(Object.isFrozen(input.target), true);
  assert.equal(recognizeNegationExpansion(input), null);
});
