import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceSaveCoordinator } from '../../js/app/workspace/workspaceSaveCoordinator.js';

function fixture() {
  let active = 'a';
  let scheduled;
  const statuses = [], writes = [], clean = [];
  const docs = new Map([['a', {id:'a',title:'A'}], ['b',{id:'b',title:'B'}]]);
  const coordinator = createWorkspaceSaveCoordinator({
    save: async doc => { writes.push(doc.id); },
    getActiveDocument: () => docs.get(active),
    getActiveId: () => active,
    isLatestSnapshot: doc => docs.get(doc.id) === doc,
    markSaved: id => clean.push(id),
    refreshNavigation: () => {},
    showStatus: value => statuses.push(value),
    setTimer: callback => { scheduled = callback; return 1; },
    clearTimer: () => { scheduled = undefined; }
  });
  return { coordinator, statuses, writes, clean, docs,
    switchTo: id => {active=id;},
    fire: () => scheduled?.() };
}

test('5C scheduled autosave captures the document before switching', async () => {
  const f=fixture();
  f.coordinator.scheduleSave();
  const pending=f.fire;
  f.switchTo('b');
  pending();
  await f.coordinator.waitForWrites();
  assert.deepEqual(f.writes,['a']);
  assert.equal(f.statuses.some(s=>s==='Saved A locally.'),false);
});

test('5C invalidated asynchronous statuses cannot overwrite import feedback', async () => {
  const f=fixture();
  const pending=f.coordinator.saveDocument(f.docs.get('a'));
  f.coordinator.invalidateStatus();
  await pending;
  assert.equal(f.statuses.some(s=>s.startsWith('Saved')),false);
});

test('5C only the current document snapshot clears the dirty marker', async () => {
  const f=fixture();
  const old=f.docs.get('a');
  f.docs.set('a',{...old});
  await f.coordinator.saveDocument(old);
  assert.deepEqual(f.clean,[]);
});

test('5C cancellation discards pending timer without cancelling queued writes', async () => {
  const f=fixture();
  f.coordinator.scheduleSave();
  f.coordinator.cancelPending();
  f.fire();
  await f.coordinator.waitForWrites();
  assert.deepEqual(f.writes,[]);
  await f.coordinator.saveDocument(f.docs.get('a'));
  assert.deepEqual(f.writes,['a']);
});

test('5C failed writes do not poison subsequent queued saves', async () => {
  let calls=0;
  const coordinator=createWorkspaceSaveCoordinator({
    save: async () => {if (++calls===1) throw Error('disk');},
    getActiveDocument:()=>null,getActiveId:()=>null,
    isLatestSnapshot:()=>false,markSaved:()=>{},refreshNavigation:()=>{},showStatus:()=>{}
  });
  await assert.rejects(coordinator.queueSave({id:'a'}),/disk/);
  await coordinator.queueSave({id:'b'});
  assert.equal(calls,2);
});

// Queue ordering is a durability property, not merely call ordering: if the
// second write starts before the first settles, an older snapshot may finish
// last and overwrite newer saved work. Explicit promise gates avoid sleeps.
test('5C queued writes wait for earlier writes to settle', async () => {
  const calls = [];
  let signalFirstStarted;
  let releaseFirst;
  const firstStarted = new Promise(resolve => { signalFirstStarted = resolve; });
  const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
  const coordinator = createWorkspaceSaveCoordinator({
    save: async document => {
      calls.push(document.id);
      if (document.id === 'a') {
        signalFirstStarted();
        await firstBlocked;
      }
    },
    getActiveDocument: () => null, getActiveId: () => null,
    isLatestSnapshot: () => false, markSaved: () => {},
    refreshNavigation: () => {}, showStatus: () => {}
  });

  const first = coordinator.queueSave({id: 'a'});
  const second = coordinator.queueSave({id: 'b'});
  // Wait for the first write to enter storage; yield one event-loop turn so
  // an incorrectly concurrent second write has a chance to start. No sleeps.
  await firstStarted;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['a'], 'the second write must remain queued');

  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(calls, ['a', 'b'], 'both writes must eventually run in order');
});

// A rejected write must never clear the dirty marker, even if the document
// and its status token are still current. An error message alone is not enough.
test('5C failed save never clears the dirty marker', async () => {
  const f = fixture();
  const coordinator = createWorkspaceSaveCoordinator({
    save: async () => { throw new Error('disk'); },
    getActiveDocument: () => f.docs.get('a'), getActiveId: () => 'a',
    isLatestSnapshot: () => true,
    markSaved: id => f.clean.push(id),
    refreshNavigation: () => {},
    showStatus: status => f.statuses.push(status)
  });

  await coordinator.saveDocument(f.docs.get('a'));
  assert.deepEqual(f.clean, [], 'failed persistence must leave the document dirty');
  assert.match(f.statuses.at(-1), /^Save failed: disk/);
});

// Deterministic import/autosave race: import invalidates an older pending
// timer's status, but that timer must still persist the captured document.
test('5C pending autosave after import invalidation cannot overwrite import error', async () => {
  const f = fixture();
  f.coordinator.scheduleSave();
  f.coordinator.invalidateStatus();
  f.statuses.push('Import failed: unsupported format version.');
  f.fire();
  await f.coordinator.waitForWrites();
  assert.deepEqual(f.writes, ['a']);
  assert.deepEqual(f.clean, ['a']);
  assert.equal(f.statuses.at(-1), 'Import failed: unsupported format version.');
  await f.coordinator.saveDocument(f.docs.get('a'));
  assert.equal(f.statuses.at(-1), 'Saved A locally.');
});

test('5C pending failed autosave after import invalidation cannot replace error status', async () => {
  let callback;
  const statuses = [];
  const coordinator = createWorkspaceSaveCoordinator({
    save: async () => { throw new Error('storage offline'); },
    getActiveDocument: () => ({ id: 'a', title: 'A' }),
    getActiveId: () => 'a',
    isLatestSnapshot: () => true, markSaved: () => {},
    refreshNavigation: () => {}, showStatus: text => statuses.push(text),
    setTimer: fn => { callback = fn; return 1; }, clearTimer: () => {}
  });
  coordinator.scheduleSave();
  coordinator.invalidateStatus();
  statuses.push('Import failed: invalid JSON.');
  callback();
  await coordinator.waitForWrites();
  assert.equal(statuses.at(-1), 'Import failed: invalid JSON.');
});

// A caller that closes a document needs a reliable persistence outcome;
// status text is not a durability acknowledgement.
test('saveDocument reports successful persistence to close callers', async () => {
  const f = fixture();
  assert.equal(await f.coordinator.saveDocument(f.docs.get('a')), true);
  assert.deepEqual(f.clean, ['a']);
});

test('saveDocument reports failed persistence without clearing dirty state', async () => {
  const f = fixture();
  const coordinator = createWorkspaceSaveCoordinator({
    save: async () => { throw new Error('quota exceeded'); },
    getActiveDocument: () => f.docs.get('a'), getActiveId: () => 'a',
    isLatestSnapshot: () => true, markSaved: id => f.clean.push(id),
    refreshNavigation: () => {}, showStatus: value => f.statuses.push(value)
  });
  assert.equal(await coordinator.saveDocument(f.docs.get('a')), false);
  assert.deepEqual(f.clean, []);
});

// An older write may finish after the student has edited the same document.
// Its successful persistence must not acknowledge the newer snapshot.
test('pending save does not mark newer edits saved or claim full durability', async () => {
  let releaseOld, oldStarted;
  const started = new Promise(resolve => { oldStarted = resolve; });
  const blocked = new Promise(resolve => { releaseOld = resolve; });
  const docs = new Map([['a', {id:'a', title:'A', version:1}]]);
  const persisted = [], clean = [], statuses = [];
  const coordinator = createWorkspaceSaveCoordinator({
    save: async doc => {
      if (doc.version === 1) { oldStarted(); await blocked; }
      persisted.push(doc.version);
    },
    getActiveDocument: () => docs.get('a'), getActiveId: () => 'a',
    isLatestSnapshot: doc => docs.get(doc.id) === doc,
    markSaved: id => clean.push(id), refreshNavigation: () => {},
    showStatus: message => statuses.push(message)
  });
  const old = docs.get('a');
  const first = coordinator.saveDocument(old);
  await started;
  const newer = {...old, version:2};
  docs.set('a', newer);
  releaseOld();
  assert.equal(await first, true, 'the old write itself did succeed');
  assert.deepEqual(clean, [], 'newer edits remain dirty');
  assert.deepEqual(persisted, [1]);
  assert.match(statuses.at(-1), /still unsaved/);
  assert.equal(await coordinator.saveDocument(newer), true);
  assert.deepEqual(persisted, [1, 2]);
  assert.deepEqual(clean, ['a']);
  assert.equal(statuses.at(-1), 'Saved A locally.');
});

test('queued newer save cannot be overtaken by pending older write', async () => {
  let releaseOld, oldStarted;
  const started = new Promise(resolve => { oldStarted = resolve; });
  const blocked = new Promise(resolve => { releaseOld = resolve; });
  const docs = new Map([['a', {id:'a', title:'A', version:1}]]);
  const writes = [], clean = [];
  const coordinator = createWorkspaceSaveCoordinator({
    save: async doc => {
      if (doc.version === 1) { oldStarted(); await blocked; }
      writes.push(doc.version);
    },
    getActiveDocument: () => docs.get('a'), getActiveId: () => 'a',
    isLatestSnapshot: doc => docs.get(doc.id) === doc,
    markSaved: id => clean.push(id), refreshNavigation: () => {}, showStatus: () => {}
  });
  const first = coordinator.saveDocument(docs.get('a'));
  await started;
  const newer = {...docs.get('a'), version:2};
  docs.set('a', newer);
  const second = coordinator.saveDocument(newer);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes, [], 'the newer write waits for the older one');
  releaseOld();
  await Promise.all([first, second]);
  assert.deepEqual(writes, [1,2]);
  assert.deepEqual(clean, ['a']);
});
