/**
 * Division safety (stage D1): every action the existing rules offer on
 * expressions with ÷ must keep the value, and must never leave a bare ÷.
 *
 * Rather than trusting a reading of each rule, this applies EVERY action of
 * seven rules (all reorderings, all numeric combinations, every distribution,
 * factorisation, identity insertion, negation expansion and range grouping)
 * to a set of division expressions, through the real coordinator and each
 * rule's own commit builder, with the division invariant applied as the
 * commit applies it. Then, with numbers substituted, the value must be the
 * same, no product may start with ÷, and the printed result must reparse to
 * the same value. A rule that mishandles Invert fails here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../js/engine/parser.js';
import { evaluateNumericNode, findNodeById, walkExpression } from '../../js/engine/treeUtils.js';
import { equals, toExactString } from '../../js/engine/rational.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';
import { restoreLeadingOne, hasBareDivision } from '../../js/engine/divisionInvariant.js';
import { prepareRearrangementCommitCandidate } from '../../js/rules/rearrangement/commitCandidate.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../../js/engine/operations/distribution.js';
import { getFactorisationPlan } from '../../js/engine/operations/factorisation.js';

const coordinator = createTransformationCoordinator(createApplicationTransformationFeatures());
const VALUES = { a: '2', b: '3', c: '5', d: '7', x: '11', y: '13' };
const EXPRESSIONS = ['a÷b×c', '6÷4', '(a+b)÷c', 'a(b+c)÷d', '(a÷c+b÷c)', '2x÷3+y', 'a÷b÷c',
  '-(a÷b)', '1÷b×a', 'x÷(y+1)=a÷b', '(a÷b)(c+d)',
  // D3: inverses and zero products (values substituted are nonzero).
  'a×b÷b', '(a+b)÷(a+b)', '0a÷b', 'x=y÷y'];

/** The value of an expression, or [left, right] for an equation, as exact strings. */
function value(root) {
  const one = node => { const v = evaluateNumericNode(node, VALUES); return v === null ? null : toExactString(v); };
  return root.type === 'Equal' ? [one(root.left), one(root.right)] : one(root);
}
function nodes(root) {
  const all = [];
  walkExpression(root, node => all.push(node));
  if (root.type === 'Equal') { walkExpression(root.left, n => all.push(n)); walkExpression(root.right, n => all.push(n)); }
  return [...new Map(all.map(n => [n.id, n])).values()];
}
const propose = (root, ruleId, parameters) => coordinator.propose(root, { ruleId, parameters });

/** Every action of the seven rules on `root`: [description, resultRoot]. */
function* actions(root) {
  for (const node of nodes(root)) {
    if (node.type === 'Add' || node.type === 'Multiply') {
      const ids = node.operands.map(o => o.id);
      for (const id of ids) for (let to = 0; to < ids.length; to += 1) {
        const candidate = propose(root, node.type === 'Add' ? 'addition.rearrange' : 'multiplication.rearrange',
          { parentId: node.id, parentType: node.type, draggedNodeId: id, destinationIndex: to });
        const committed = candidate && prepareRearrangementCommitCandidate(root, candidate, { normalise: true });
        if (committed) yield [`rearrange ${id}→${to}`, committed.result.root];
      }
      for (const moving of ids) for (const target of ids) if (moving !== target) {
        const candidate = propose(root, node.type === 'Add' ? 'addition.combine-numeric' : 'multiplication.combine-numeric',
          { parentId: node.id, movingNodeId: moving, targetNodeId: target });
        if (candidate) yield [`combine ${moving}→${target}`, candidate.result.root];
      }
      for (let at = 1; at < ids.length; at += 1) {
        const candidate = propose(root, 'identity.introduce', { operation: node.type, parentNodeId: node.id, insertionIndex: at });
        if (candidate) yield [`identity at ${at}`, candidate.result.root];
      }
      for (let start = 0; start < ids.length; start += 1) for (let end = start + 2; end <= ids.length; end += 1) {
        const operandIds = ids.slice(start, end);
        const candidate = propose(root, 'grouping.range', { parentId: node.id, parentType: node.type, operandIds, bracketStyle: 'round' });
        if (candidate) yield [`group ${start}-${end}`, candidate.result.root];
      }
    }
    if (node.type === 'Multiply') {
      // D3: a factor with its inverse (b with ÷b) makes 1, assuming b ≠ 0.
      for (const first of node.operands) for (const second of node.operands) if (first !== second) {
        const candidate = propose(root, 'multiplication.cancel-inverses', { sourceId: first.id, targetId: second.id });
        if (candidate) yield [`cancel ${first.id} with ${second.id}`, candidate.result.root];
      }
      for (const factor of node.operands) for (const other of node.operands) {
        const sum = factor !== other && unwrapGroupedSum(other);
        const plan = sum && getDistributionPlan(node, factor.id, sum.id);
        const applied = plan && applyDistribution(structuredClone(root), plan);
        if (applied?.root) yield [`distribute ${factor.id}`, applied.root];
      }
    }
    if (node.type === 'Negate') {
      const candidate = propose(root, 'negation.expand', { negateNodeId: node.id });
      if (candidate) yield ['negation.expand', candidate.result.root];
    }
    for (const side of ['left', 'right']) for (const operation of ['Add', 'Multiply']) {
      const candidate = propose(root, 'identity.introduce', { operation, targetNodeId: node.id, side });
      if (candidate) yield [`identity ${operation} ${side} of ${node.id}`, candidate.result.root];
    }
  }
  // Factorisation: every pair of factors from two different products.
  const factors = nodes(root).filter(n => n.type === 'Multiply').flatMap(p => p.operands.map(f => [p.id, f.id]));
  for (const [p1, f1] of factors) for (const [p2, f2] of factors) if (p1 < p2) {
    const plan = getFactorisationPlan(root, [f1, f2]);
    if (!plan) continue;
    const candidate = propose(root, `factorisation.${plan.direction}`, { direction: plan.direction, sumId: plan.sumId,
      groupId: plan.groupId, sourceFactorIds: plan.sourceFactorIds, productIds: plan.productIds });
    if (candidate) yield [`factorise ${f1},${f2}`, candidate.result.root];
  }
}

for (const source of EXPRESSIONS) {
  test(`every rule keeps the value of ${source}, and no ÷ is left bare`, () => {
    const root = parseExpression(source);
    const before = value(root);
    let count = 0;
    for (const [action, result] of actions(root)) {
      // The commit applies the division invariant to every result.
      const committed = restoreLeadingOne(result).root;
      assert.equal(hasBareDivision(committed), false, `${source}: ${action} left a bare ÷`);
      assert.deepEqual(value(committed), before, `${source}: ${action} gave ${expressionToInput(committed)}`);
      const printed = expressionToInput(committed);
      let reread;
      try { reread = parseExpression(printed); }
      catch (error) { assert.fail(`${source}: ${action} printed as "${printed}", which does not read back: ${error.message} TREE ${JSON.stringify(committed)}`); }
      assert.deepEqual(value(reread), before, `${source}: ${action} printed as "${printed}", which reads back differently`);
      count += 1;
    }
    assert.ok(count > 0, `${source}: no rule offered any action (the test would prove nothing)`);
  });
}
