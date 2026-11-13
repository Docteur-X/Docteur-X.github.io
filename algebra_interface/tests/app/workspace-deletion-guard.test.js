import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeletionContextCurrent } from '../../js/app/workspace/workspaceDeletionGuard.js';

test('pending deletion may proceed only for the still-active document', () => {
  assert.equal(isDeletionContextCurrent({ requestedId: 'a', activeId: 'a', currentDocumentId: 'a' }), true);
  assert.equal(isDeletionContextCurrent({ requestedId: 'a', activeId: 'b', currentDocumentId: 'b' }), false);
});

test('pending deletion rejects missing or inconsistent controller state', () => {
  assert.equal(isDeletionContextCurrent({ requestedId: 'a', activeId: 'a', currentDocumentId: null }), false);
  assert.equal(isDeletionContextCurrent({ requestedId: '', activeId: '', currentDocumentId: '' }), false);
  assert.equal(isDeletionContextCurrent({ requestedId: 'a', activeId: 'a', currentDocumentId: 'b' }), false);
});
