import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationSourceStamp as create } from '../../js/steps/transformationSourceStamp.js';
import { sameOrdinaryDragSourceStamp as same } from '../../js/view/drag/ordinaryDragSourceStamp.js';

const source = { documentId: 'doc', objectId: 'obj', revision: 7, rootId: 'root', fingerprint: '{"id":"root"}' };

test('canonical source stamp is immutable and includes exactly the declared fields', () => {
  const stamp = create(source);
  assert.ok(Object.isFrozen(stamp));
  assert.deepEqual(Object.keys(stamp), ['documentId', 'objectId', 'revision', 'rootId', 'fingerprint']);
  assert.deepEqual(stamp, source);
});

test('canonical stamps compare equal until an identity, revision or AST fingerprint changes', () => {
  const stamp = create(source);
  assert.equal(same(stamp, create({ ...source })), true);
  for (const key of Object.keys(source)) {
    assert.equal(same(stamp, create({ ...source, [key]: key === 'revision' ? 8 : 'changed' })), false);
  }
});

test('missing fields and non-primitive identity values are rejected', () => {
  assert.throws(() => create({ ...source, fingerprint: undefined }), TypeError);
  assert.throws(() => create({ ...source, revision: {} }), TypeError);
  assert.throws(() => create({ ...source, revision: Infinity }), TypeError);
  assert.throws(() => create({ ...source, objectId: undefined }), TypeError);
});

test('null active object and root are represented explicitly, not omitted', () => {
  const stamp = create({ ...source, objectId: null, rootId: null });
  assert.equal(stamp.objectId, null);
  assert.equal(stamp.rootId, null);
  assert.equal(same(stamp, create({ ...source, objectId: 'obj', rootId: null })), false);
});
