// Division stage D3: b÷b = 1 assuming b ≠ 0, and how assumptions are kept
// with the history step (owner, 12 November 2026: shown in history and on the
// status line, no extra confirmation).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../js/engine/parser.js';
import { cancelInverses, inverseDivisor } from '../../js/rules/cancel-inverses/engine.js';
import { createDocumentHistory, appendHistoryState } from '../../js/documents/documentHistory.js';
import { assertHistoryInvariants } from '../../js/documents/documentInvariants.js';
import { newDocument, addObject } from '../../js/documents/workspaceDocuments.js';
import { serializeCompactDocument, deserializeCompactDocument } from '../../js/documents/documentSerialization.js';

const cancel = (source, i, j, substitutions) => {
  const root = parseExpression(source);
  const product = root.type === 'Equal' ? root.right : root;
  return cancelInverses(root, product.operands[i].id, product.operands[j].id, substitutions);
};

test('b and ÷b make 1, assuming b ≠ 0, either way round', () => {
  const result = cancel('a×b÷b', 1, 2);
  assert.equal(expressionToInput(result.root), 'a×1');
  assert.deepEqual(result.assumptions.map(a => a.text), ['b ≠ 0']);
  assert.equal(expressionToInput(cancel('a×b÷b', 2, 1).root), 'a×1');
  assert.equal(expressionToInput(cancel('b÷b', 0, 1).root), '1');
});

test('compound divisors match through brackets and notation; the assumption names them', () => {
  const result = cancel('(a+b)÷(a+b)', 0, 1);
  assert.equal(expressionToInput(result.root), '1');
  // The divisor is the bracketed (a + b), so the condition reads (a + b) ≠ 0.
  assert.deepEqual(result.assumptions.map(a => a.text), ['(a + b) ≠ 0']);
  assert.ok(inverseDivisor(parseExpression('2x'), { type: 'Invert', operand: parseExpression('2·x') }));
});

test('not inverses, or numeric (numeric combination multiplies those): refused', () => {
  assert.equal(cancel('a÷b', 0, 1), null);
  assert.equal(cancel('2÷2', 0, 1), null);
  assert.equal(cancel('b÷b', 0, 1, { b: '3' }), null);
});

test('assumptions are stored with the history step and survive saving', () => {
  const history = createDocumentHistory();
  appendHistoryState(history, { expression: parseExpression('b÷b'), substitutions: {} }, { actionLabel: 'Built' });
  const step = appendHistoryState(history, { expression: parseExpression('1'), substitutions: {} },
    { actionLabel: 'Cancelled b · ÷b to 1', assumptions: [{ kind: 'nonzero', text: 'b ≠ 0' }] });
  assert.deepEqual(step.event.assumptions, [{ kind: 'nonzero', text: 'b ≠ 0' }]);
  assert.equal(history.nodes[0].event.assumptions, undefined); // only written when present
  assertHistoryInvariants(history);
  // A malformed assumption is rejected by the history check.
  const broken = structuredClone(history);
  broken.nodes[1].event.assumptions = [{ kind: 'nonzero', text: '' }];
  assert.throws(() => assertHistoryInvariants(broken), /assumptions/);
  // Saved and reopened: the assumption is still there.
  const doc = addObject(newDocument('Assumptions'));
  const objectId = doc.objectOrder[0];
  doc.objects[objectId].history = history;
  doc.objects[objectId].root = history.nodes[1].snapshot.expression;
  doc.objects[objectId].kind = 'expression';
  const reopened = deserializeCompactDocument(JSON.parse(JSON.stringify(serializeCompactDocument(doc))));
  const steps = reopened.objects[objectId].history.nodes;
  assert.deepEqual(steps[1].event.assumptions, [{ kind: 'nonzero', text: 'b ≠ 0' }]);
});
