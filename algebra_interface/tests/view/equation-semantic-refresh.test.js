import test from 'node:test';
import assert from 'node:assert/strict';
import { createEquationSemanticRefresh } from '../../js/view/equationSemanticRefresh.js';

function fixture() {
  const events = [];
  const attrs = new Map();
  const window = { setAttribute(name, value) { attrs.set(name, value); events.push(name); } };
  const view = { closest(selector) { assert.equal(selector, '[data-testid="mathematical-window"]'); return window; } };
  const consumer = name => ({ refresh() { events.push(name); } });
  const sync = createEquationSemanticRefresh({ view, resolver: consumer('resolver'), inspector: consumer('inspector'), navigator: consumer('navigator') });
  return { sync, events, attrs };
}

test('semantic refresh stamps the view then updates resolver before dependent consumers', () => {
  const { sync, events, attrs } = fixture();
  sync.refresh({ documentId: 'document-A', objectId: 'object-1' });
  assert.deepEqual(events, ['data-object-id', 'data-document-id', 'resolver', 'inspector', 'navigator']);
  assert.equal(attrs.get('data-document-id'), 'document-A');
  assert.equal(attrs.get('data-object-id'), 'object-1');
});

test('empty-object transition clears previous identity and refreshes all consumers', () => {
  const { sync, events, attrs } = fixture();
  sync.refresh({ documentId: 'document-A', objectId: 'object-1' });
  events.length = 0;
  sync.refresh({ documentId: 'document-A', objectId: null });
  assert.equal(attrs.get('data-object-id'), '');
  assert.deepEqual(events.slice(2), ['resolver', 'inspector', 'navigator']);
});

test('missing enclosing window is allowed for embedded views', () => {
  const names = [];
  const sync = createEquationSemanticRefresh({
    view: { closest: () => null },
    resolver: { refresh: () => names.push('resolver') },
    inspector: { refresh: () => names.push('inspector') },
    navigator: { refresh: () => names.push('navigator') }
  });
  sync.refresh();
  assert.deepEqual(names, ['resolver', 'inspector', 'navigator']);
});

test('malformed composition fails early instead of silently skipping a consumer', () => {
  assert.throws(() => createEquationSemanticRefresh({ view: { closest: () => null }, resolver: { refresh() {} } }), TypeError);
});
