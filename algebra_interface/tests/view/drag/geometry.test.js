import test from 'node:test';
import assert from 'node:assert/strict';
import { planOrdinaryDragDistributionTargets, captureOrdinaryDragSnapshot } from '../../../js/view/drag/ordinaryDragGeometry.js';

const sym = id => ({ type: 'Symbol', id, name: id });
const sum = { type: 'Add', id: 'sum', operands: [sym('a'), sym('b')] };
const group = { type: 'Group', id: 'group', operand: sum };
const product = { type: 'Multiply', id: 'product', operands: [sym('x'), group, sym('y')] };
const drag = (id, parentType = 'Multiply') => ({ parentId: 'product', parentType, item: sym(id) });
const rect = () => ({ left: 0, right: 100, top: 0, bottom: 30, width: 100, height: 30 });
function el(classes, dataset = {}, children = []) {
  return { dataset, children, classList: { contains: name => classes.includes(name) }, getBoundingClientRect: rect };
}
function equation() {
  const siblings = [el(['factor-slot'], {nodeId:'x'}), el(['factor-slot'], {nodeId:'group'}), el(['factor-slot'], {nodeId:'y'})];
  const container = el(['drag-container'], {parentId:'product'}, siblings);
  const plus = el(['plus'], {sumId:'sum'});
  return { getBoundingClientRect:rect, querySelectorAll(selector) {
    return selector === '.drag-container' ? [container] : selector === '.plus[data-sum-id]' ? [plus] : [];
  } };
}
test('distribution planner preserves factor order and only allows adjacent targets', () => {
  assert.equal(planOrdinaryDragDistributionTargets(product, drag('x')).get('sum')?.direction, 'left');
  assert.equal(planOrdinaryDragDistributionTargets(product, drag('y')).get('sum')?.direction, 'right');
  const distant = { ...product, operands: [sym('x'), sym('z'), group] };
  assert.equal(planOrdinaryDragDistributionTargets(distant, drag('x')).size, 0);
});
test('non-multiplicative and missing parents do not yield distribution plans', () => {
  assert.equal(planOrdinaryDragDistributionTargets({ ...product, type:'Add' }, drag('x')).size, 0);
  assert.equal(planOrdinaryDragDistributionTargets(product, { ...drag('x'), parentId:'missing' }).size, 0);
});
test('geometry snapshot contains only eligible plus signs and preserves source hitbox', () => {
  const result = captureOrdinaryDragSnapshot(equation(), product, drag('x'));
  assert.equal(result.plansBySumId.size, 1);
  assert.deepEqual(result.geometry.plusSigns.map(item => item.sumId), ['sum']);
  assert.deepEqual(result.geometry.siblings.map(item => item.nodeId), ['x','group','y']);
  assert.equal(result.geometry.sourceNodeId, 'x');
});
test('geometry recapture returns a new plan map without mutating the previous snapshot', () => {
  const first = captureOrdinaryDragSnapshot(equation(), product, drag('x'));
  const second = captureOrdinaryDragSnapshot(equation(), product, drag('y'));
  assert.notEqual(first.plansBySumId, second.plansBySumId);
  assert.equal(first.plansBySumId.get('sum').direction, 'left');
  assert.equal(second.plansBySumId.get('sum').direction, 'right');
});
