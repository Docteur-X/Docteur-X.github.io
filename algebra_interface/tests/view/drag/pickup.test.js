import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrdinaryDragPickup } from '../../../js/view/drag/ordinaryDragPickup.js';
function fixture({ address = { mathematicalObjectId: 'o', nodeId: 'n', role: 'occurrence' }, elements } = {}) {
  const hitbox = { dataset: { nodeId: 'n' } };
  const resolver = {
    addressFromElement: () => address,
    resolve: () => ({ outcome: 'found', elements: elements ?? [hitbox] })
  };
  return { hitbox, resolver, mathematicalObjectId: 'o' };
}
test('pickup yields immutable mathematical occurrence from current resolver', () => {
  const result = resolveOrdinaryDragPickup(fixture());
  assert.deepEqual(result, { mathematicalObjectId: 'o', nodeId: 'n', role: 'occurrence' });
  assert.ok(Object.isFrozen(result));
});
test('pickup refuses stale or foreign hitboxes and incorrect semantic roles', () => {
  assert.equal(resolveOrdinaryDragPickup(fixture({ address: null })), null);
  assert.equal(resolveOrdinaryDragPickup(fixture({ address: { mathematicalObjectId: 'other', nodeId: 'n', role: 'occurrence' } })), null);
  assert.equal(resolveOrdinaryDragPickup(fixture({ address: { mathematicalObjectId: 'o', nodeId: 'n', role: 'content' } })), null);
  assert.equal(resolveOrdinaryDragPickup(fixture({ elements: [] })), null);
});
test('pickup refuses mismatched nested identity and missing object', () => {
  const args = fixture({ address: { mathematicalObjectId: 'o', nodeId: 'outer', role: 'occurrence' } });
  assert.equal(resolveOrdinaryDragPickup(args), null);
  assert.equal(resolveOrdinaryDragPickup({ ...fixture(), mathematicalObjectId: null }), null);
});
