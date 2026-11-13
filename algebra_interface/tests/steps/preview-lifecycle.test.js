/**
 * Phase 4A: characterize the EXISTING single-use mathematical preview gate.
 * These tests intentionally do not assert cross-family exclusivity: each family
 * currently owns an independent instance, and Phase 4B must decide how to
 * coordinate them without creating a second mathematical commit authority.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransformationCommitLifecycle } from '../../js/steps/transformationCommitLifecycle.js';

const stamp = (changes = {}) => ({ documentId: 'doc', objectId: 'obj', revision: 3,
  rootId: 'root', fingerprint: 'tree-v1', ...changes });
const proposal = () => ({ result: { root: { type: 'Symbol', id: 'result' } } });

test('4A: confirmation consumes a modal proposal before invoking the commit callback', () => {
  const gate = createTransformationCommitLifecycle();
  let publications = 0;
  assert.equal(gate.open(proposal(), stamp()), true);
  assert.deepEqual(gate.confirm(stamp(), () => {
    publications++;
    assert.equal(gate.confirm(stamp(), () => publications++).status, 'absent');
  }), { status: 'committed' });
  assert.equal(publications, 1);
  assert.equal(gate.isOpen(), false);
});

test('4A: cancellation is idempotent and prevents later confirmation', () => {
  const gate = createTransformationCommitLifecycle();
  let publications = 0;
  assert.equal(gate.open(proposal(), stamp()), true);
  gate.cancel(); gate.cancel();
  assert.equal(gate.confirm(stamp(), () => publications++).status, 'absent');
  assert.equal(publications, 0);
});

test('4A: every source stamp field protects a preview from stale confirmation', () => {
  for (const [field, value] of Object.entries({ documentId: 'other', objectId: 'other',
    revision: 4, rootId: 'other', fingerprint: 'other' })) {
    const gate = createTransformationCommitLifecycle();
    let publications = 0;
    assert.equal(gate.open(proposal(), stamp()), true);
    assert.equal(gate.confirm(stamp({ [field]: value }), () => publications++).status,
      'stale', field);
    assert.equal(publications, 0, field);
    assert.equal(gate.isOpen(), false, field);
  }
});

test('4A: failed confirmation cannot be retried or silently publish', () => {
  const gate = createTransformationCommitLifecycle();
  assert.equal(gate.open(proposal(), stamp()), true);
  assert.equal(gate.confirm(stamp(), null).status, 'invalid-commit');
  assert.equal(gate.confirm(stamp(), () => {}).status, 'absent');
  assert.equal(gate.open(proposal(), stamp()), true);
  assert.throws(() => gate.confirm(stamp(), () => { throw new Error('publication failed'); }),
    /publication failed/);
  assert.equal(gate.isOpen(), false);
});

test('4A: individual lifecycle instances do not enforce cross-family exclusivity', () => {
  const equality = createTransformationCommitLifecycle();
  const grouping = createTransformationCommitLifecycle();
  assert.equal(equality.open(proposal(), stamp()), true);
  assert.equal(grouping.open(proposal(), stamp()), true);
  // Characterization, NOT a desired final behaviour: global preview exclusivity
  // is currently enforced, where present, by callers in app.js.
  equality.cancel(); grouping.cancel();
});

test('4A: opening a second proposal never overwrites the existing one', () => {
  const gate = createTransformationCommitLifecycle();
  const first = proposal();
  assert.equal(gate.open(first, stamp()), true);
  assert.equal(gate.open(proposal(), stamp()), false);
  assert.equal(gate.get(), first);
  gate.cancel();
  assert.equal(gate.open(proposal(), stamp()), true);
});
