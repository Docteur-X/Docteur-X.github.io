// Row chunks (D14): an operator and the term after it share a chunk, so a
// long row breaks only before an operator; rowItems sees through the chunks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeDocument } from '../../helpers/fakeDom.js';
import { chunkItems, rowItems, rowNeighbours } from '../../../js/view/rendering/rowChunks.js';

const doc = fakeDocument();
const item = (className, text = '') => { const el = doc.createElement('span'); el.className = className; el.textContent = text; return el; };
const names = chunk => chunk.children.map(el => el.textContent);

test('each operator is chunked with the term after it; brackets stay with their terms', () => {
  const items = [item('expression-bracket', '('), item('term', 'a'), item('plus', '+'), item('term', 'b'),
    item('term', '÷c'), item('plus', '+'), item('term', 'd'), item('expression-bracket', ')')];
  const chunks = chunkItems(items, doc);
  assert.deepEqual(chunks.map(names), [['(', 'a'], ['+', 'b'], ['÷c'], ['+', 'd', ')']]);
  assert.ok(chunks.every(chunk => chunk.classList.contains('row-chunk')));
  const row = item('drag-container'); row.append(...chunks);
  assert.deepEqual(rowItems(row), items);
});

test('rowNeighbours finds the operators either side across chunks', () => {
  const [a, plus, b, plus2, c] = [item('term', 'a'), item('plus', '+'), item('term', 'b'), item('plus', '+'), item('term', 'c')];
  const row = item('drag-container'); row.append(...chunkItems([a, plus, b, plus2, c], doc));
  for (const chunk of row.children) { chunk.parentElement = row; for (const child of chunk.children) child.parentElement = chunk; }
  assert.deepEqual(rowNeighbours(b), { previous: plus, next: plus2 });
  assert.deepEqual(rowNeighbours(a), { previous: null, next: plus });
});
