import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationCommitLifecycle } from '../../js/steps/transformationCommitLifecycle.js';

const source = () => ({ documentId: 'd1', objectId: 'o1', revision: 3,
  rootId: 'eq1', fingerprint: '{"id":"eq1"}' });
const proposal = () => ({ action: { ruleId: 'equality.apply-function' },
  result: { root: { id: 'eq2' } } });

test('a valid proposal commits once and cannot be replayed by a second confirmation', () => {
  const gate = createTransformationCommitLifecycle();
  let commits = 0;
  assert.equal(gate.open(proposal(), source()), true);
  assert.equal(gate.open(proposal(), source()), false);
  assert.equal(gate.confirm(source(), () => { commits++; }).status, 'committed');
  assert.equal(gate.confirm(source(), () => { commits++; }).status, 'absent');
  assert.equal(commits, 1);
});

test('stale document, object, revision, root or AST fingerprint rejects without commit', () => {
  for (const [field, value] of Object.entries({ documentId: 'd2', objectId: 'o2',
    revision: 4, rootId: 'eq-other', fingerprint: 'changed' })) {
    const gate = createTransformationCommitLifecycle();
    gate.open(proposal(), source());
    let committed = false;
    assert.equal(gate.confirm({ ...source(), [field]: value }, () => { committed = true; }).status, 'stale', field);
    assert.equal(committed, false, field);
    assert.equal(gate.isOpen(), false);
  }
});

test('cancellation, invalid proposals, source mutation and thrown commits are safe', () => {
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open(null, source()), false);
  const stamp = source();
  assert.equal(gate.open(proposal(), stamp), true);
  stamp.fingerprint = 'tampered';
  assert.equal(gate.confirm(source(), () => {}).status, 'committed');
  gate.open(proposal(), source());
  gate.cancel();
  assert.equal(gate.confirm(source(), () => {}).status, 'absent');
  gate.open(proposal(), source());
  assert.throws(() => gate.confirm(source(), () => { throw Error('storage failure'); }), /storage failure/);
  assert.equal(gate.isOpen(), false);
});

test('reentrant confirmation is refused while first commit callback is running', () => {
  const gate = createTransformationCommitLifecycle();
  gate.open(proposal(), source());
  let inner;
  assert.equal(gate.confirm(source(), () => {
    inner = gate.confirm(source(), () => { throw Error('must not execute'); });
  }).status, 'committed');
  assert.deepEqual(inner, { status: 'absent' });
});
