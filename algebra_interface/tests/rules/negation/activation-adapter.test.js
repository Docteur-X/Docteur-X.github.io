import test from 'node:test';
import assert from 'node:assert/strict';
import { negationRequestFromEvent } from '../../../js/rules/negation/activation.js';

const control = { parentElement: null, closest: selector => selector.split(',').map(s => s.trim()).includes('.negate-operator-hitbox') ? control : null };
const view = { contains: element => element === control };
const resolver = { addressFromElement: (_element, { mathematicalObjectId }) =>
  mathematicalObjectId === 'obj' ? { mathematicalObjectId, nodeId: 'neg', role: 'operator' } : null };
const args = { view, resolver, viewId: 'view', objectId: 'obj' };
const event = (type, key) => ({ type, key, target: control });

test('live adapter gives pointer and keyboard identical rule requests', () => {
  const click = negationRequestFromEvent({ ...args, event: event('click') });
  assert.deepEqual(click, { ruleId: 'negation.expand', parameters: { negateNodeId: 'neg' } });
  assert.deepEqual(click, negationRequestFromEvent({ ...args, event: event('keydown', 'Enter') }));
  assert.deepEqual(click, negationRequestFromEvent({ ...args, event: event('keydown', ' ') }));
});
test('adapter rejects stale, foreign, or nonoperator targets', () => {
  assert.equal(negationRequestFromEvent({ ...args, objectId: 'other', event: event('click') }), null);
  assert.equal(negationRequestFromEvent({ ...args, view: { contains: () => false }, event: event('click') }), null);
  assert.equal(negationRequestFromEvent({ ...args, event: event('keydown', 'Escape') }), null);
  assert.equal(negationRequestFromEvent({ ...args, resolver: { addressFromElement: () => ({ mathematicalObjectId: 'obj', nodeId: 'neg', role: 'content' }) }, event: event('click') }), null);
  assert.equal(negationRequestFromEvent({ ...args, resolver: { addressFromElement: () => ({ mathematicalObjectId: 'obj', nodeId: 'neg', role: 'operator', operatorPosition: 1 }) }, event: event('click') }), null);
});

test('the boxed − of a − b activates the hidden minus of the term after it', () => {
  const minus = { matches: () => false };
  const boxed = { matches: selector => selector === '.plus', closest: () => boxed,
    nextElementSibling: { querySelector: selector => selector === '.negate-operator-hitbox[data-leading-sign]' ? minus : null } };
  const seen = [];
  const request = negationRequestFromEvent({ ...args, view: { contains: element => element === minus },
    resolver: { addressFromElement: (element, options) => { seen.push(element); return resolver.addressFromElement(element, options); } },
    event: { type: 'click', target: boxed } });
  assert.deepEqual(request, { ruleId: 'negation.expand', parameters: { negateNodeId: 'neg' } });
  assert.deepEqual(seen, [minus], 'the resolver reads the minus itself, never the +');
});
