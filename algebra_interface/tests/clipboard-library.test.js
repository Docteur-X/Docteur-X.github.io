/** Clipboard-library contracts, independent of any browser presentation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression } from '../js/core/parser.js';
import { captureMathematicalClipboard } from '../js/core/mathematicalClipboard.js';
import { createClipboardLibrary, appendClipboardEntry, selectClipboardEntry, removeClipboardEntry, clearClipboardLibrary, activeClipboardEntry } from '../js/core/clipboardLibrary.js';

test('session library retains multiple immutable selections from different documents', () => {
  const sourceA = parseExpression('F=m*a');
  const sourceB = parseExpression('x+3');
  const original = captureMathematicalClipboard(sourceA, null, {documentId:'lesson-A'});
  let library = appendClipboardEntry(createClipboardLibrary(), original);
  library = appendClipboardEntry(library, captureMathematicalClipboard(sourceB, null, {documentId:'lesson-B'}));
  assert.equal(library.entries.length, 2);
  assert.equal(library.entries[0].source.documentId, 'lesson-A');
  assert.equal(library.entries[1].source.documentId, 'lesson-B');
  assert.equal(activeClipboardEntry(library).source.documentId, 'lesson-B');
  sourceA.left.operands[0].name = 'changed';
  assert.equal(library.entries[0].root.left.operands[0].name, 'F');
  library = selectClipboardEntry(library, library.entries[0].clipboardId);
  assert.equal(activeClipboardEntry(library).root.type, 'Equal');
});

test('removing entries and clearing the session never modify source mathematics', () => {
  const source = parseExpression('a+b');
  const snapshot = JSON.stringify(source);
  const first = appendClipboardEntry(createClipboardLibrary(), captureMathematicalClipboard(source, null));
  const second = appendClipboardEntry(first, captureMathematicalClipboard(source, source.operands[0].id));
  const removed = removeClipboardEntry(second, second.activeId);
  assert.equal(removed.entries.length, 1);
  assert.equal(removed.activeId, first.activeId);
  assert.equal(clearClipboardLibrary().entries.length, 0);
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(first.entries.length, 1);
  assert.throws(() => selectClipboardEntry(removed, 'missing'));
});
