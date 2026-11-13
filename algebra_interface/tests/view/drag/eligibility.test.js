import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrdinaryDragTarget as validate } from '../../../js/view/drag/ordinaryDragEligibility.js';

test('dispatches only the matching mathematical rule', () => {
  for (const [kind, name] of Object.entries({combine:'ruleTarget',distribution:'ruleTarget','negation-compress':'ruleTarget',insert:'ruleTarget'})) {
    const called = [];
    const rules = Object.fromEntries(['ruleTarget'].map(key => [key, () => {called.push(key);return true;} ]));
    assert.equal(validate({target:{kind},rules}),true);
    assert.deepEqual(called,[name]);
  }
});
test('unknown targets and missing rule adapters fail closed', () => {
  assert.equal(validate({target:{kind:'invalid'},rules:{ruleTarget:()=>false}}),false);
  assert.equal(validate({target:{kind:'combine'},rules:{}}),false);
  assert.equal(validate({target:null,rules:{ruleTarget:()=>true}}),false);
});
test('non-boolean permission does not count as eligibility', () => {
  assert.equal(validate({target:{kind:'combine'},rules:{ruleTarget:()=>1}}),false);
  assert.equal(validate({target:{kind:'combine'},rules:{ruleTarget:()=>false}}),false);
});
test('rule exceptions fail closed without leaking into input handling', () => {
  assert.equal(validate({target:{kind:'insert'},rules:{ruleTarget:()=>{throw Error('stale source');}}}),false);
});
