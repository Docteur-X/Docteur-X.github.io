import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceStatusGate } from '../../js/app/workspace/workspaceStatusGate.js';

test('a save completion cannot announce itself after import begins', () => {
  const gate = createWorkspaceStatusGate();
  const previousSave = gate.capture('original');
  gate.invalidate(); // import starts, before any asynchronous storage write
  assert.equal(gate.isCurrent(previousSave, 'original'), false);
});

test('switching active documents suppresses background save messages', () => {
  const gate = createWorkspaceStatusGate();
  const save = gate.capture('original');
  assert.equal(gate.isCurrent(save, 'imported'), false);
  gate.invalidate();
  assert.equal(gate.isCurrent(save, 'original'), false);
  assert.equal(gate.isCurrent(gate.capture('imported'), 'imported'), true);
});
