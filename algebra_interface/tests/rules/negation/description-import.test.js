/** Regression for Phase 4C hardening: the live preview status must use an imported descriptor.
 * Syntax checks do not catch an unresolved identifier inside an event handler.
 * Keep this wiring test alongside browser tests of the actual preview opening.
 * Since stage 4 the live preview lives in the negation rule bundle.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describeNegationCandidate } from '../../../js/rules/negation/visual.js';

test('live negation preview imports its status descriptor', () => {
  const source = readFileSync(new URL('../../../js/rules/negation/install.js', import.meta.url), 'utf8');
  assert.match(source, /import\s*\{\s*describeNegationCandidate\s*\}\s*from\s*["']\.\/visual\.js["']/);
  assert.match(source, /setStatus\(describeNegationCandidate\(candidate\)\.status\)/);
  assert.match(describeNegationCandidate({action:{ruleId:'negation.expand'},result:{}}).status, /Preview:/);
});
