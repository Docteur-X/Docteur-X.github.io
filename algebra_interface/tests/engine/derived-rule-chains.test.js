/**
 * Derived rules, checked by machine: a shortcut rule must give the same
 * result as the chain of basic rules that justifies it (owner's idea, 12
 * November 2026; see Future Features, "Derived rules and their proofs").
 *
 * Cancel-opposites (b + −b → 0) is justified by six steps of EXISTING rules,
 * each applied here through the real transformation coordinator, exactly as
 * the program would apply them:
 *   b + −b
 *   → b + −1b          negation.expand            (the − is a hidden −1)
 *   → 1b + −1b         identity.introduce ×1      (b = 1b)
 *   → (1b + −1b)       grouping.range             (the teaching policy asks
 *                                                  for a visible scope first)
 *   → (1 + −1)b        factorisation.right        (common factor b)
 *   → (0)b             addition.combine-numeric   (1 + −1 = 0)
 *   → 0                multiplication.combine-numeric (0·x = 0)
 * If any of these rules changes so the chain no longer reaches the shortcut's
 * result, this test fails, so the shortcut can never drift from its proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExpression, expressionToInput } from '../../js/engine/parser.js';
import { createApplicationTransformationFeatures } from '../../js/app/transformationFeatureAssembly.js';
import { createTransformationCoordinator } from '../../js/steps/transformationCoordinator.js';
import { getFactorisationPlan } from '../../js/engine/operations/factorisation.js';
import { getRangeGroupingPlan } from '../../js/engine/operations/grouping.js';
import { findNodeById } from '../../js/engine/treeUtils.js';
import { cancelOpposites } from '../../js/rules/cancel-opposites/engine.js';

const coordinator = createTransformationCoordinator(createApplicationTransformationFeatures());

/** Apply one rule through the coordinator; record the step; fail loudly if refused. */
function apply(chain, ruleId, parameters) {
  const candidate = coordinator.propose(chain.root, { ruleId, parameters });
  assert.ok(candidate, `${ruleId} refused on ${expressionToInput(chain.root)}`);
  chain.root = candidate.result.root;
  chain.steps.push(`${ruleId}: ${expressionToInput(chain.root)}`);
}

/**
 * The long proof that b + (−b) = 0, applied to the pair inside `root`.
 * `sumId` is the sum holding the pair; `bId` and `negId` are b and −b.
 */
function provePairIsZero(root, sumId, bId, negId) {
  const chain = { root, steps: [] };
  const innerB = findNodeById(root, negId).operand.id;
  apply(chain, 'negation.expand', { negateNodeId: negId });
  apply(chain, 'identity.introduce', { operation: 'Multiply', targetNodeId: bId, side: 'left' });
  // Group exactly the two products (1·b and −1·b).
  const sum = findNodeById(chain.root, sumId);
  const pair = sum.operands.filter(o => o.type === 'Multiply' &&
    o.operands.some(f => f.id === bId || f.id === innerB)).map(o => o.id);
  const grouping = getRangeGroupingPlan(chain.root, pair);
  apply(chain, 'grouping.range', { parentId: grouping.parentId, parentType: grouping.parentType,
    operandIds: grouping.operandIds, bracketStyle: 'round' });
  const factor = getFactorisationPlan(chain.root, [bId, innerB]);
  apply(chain, `factorisation.${factor.direction}`, { direction: factor.direction, sumId: factor.sumId,
    groupId: factor.groupId, sourceFactorIds: factor.sourceFactorIds, productIds: factor.productIds });
  // (1 + −1)·b: add the two numbers inside the brackets.
  const product = findNodeById(chain.root, factor.groupId)?.operand ?? null;
  const productNode = product?.type === 'Multiply' ? product : chain.root.type === 'Multiply' ? chain.root
    : [...(chain.root.operands ?? [])].map(o => o.type === 'Group' ? o.operand : o).find(o => o.type === 'Multiply');
  const numbers = productNode.operands[0].operand;
  apply(chain, 'addition.combine-numeric', { parentId: numbers.id,
    movingNodeId: numbers.operands[1].id, targetNodeId: numbers.operands[0].id });
  // (0)·b: zero times anything is zero.
  const zeroProduct = findNodeById(chain.root, productNode.id);
  apply(chain, 'multiplication.combine-numeric', { parentId: zeroProduct.id,
    movingNodeId: zeroProduct.operands[0].id, targetNodeId: zeroProduct.operands[1].id });
  return chain;
}

test('b + −b: the six-step proof and the shortcut both give 0', () => {
  const root = parseExpression('b+-b');
  const [b, negB] = root.operands;
  const proof = provePairIsZero(root, root.id, b.id, negB.id);
  assert.deepEqual(proof.steps.map(step => step.split(': ')[0]), [
    'negation.expand', 'identity.introduce', 'grouping.range',
    'factorisation.right', 'addition.combine-numeric', 'multiplication.combine-numeric']);
  const shortcut = cancelOpposites(root, b.id, negB.id);
  assert.equal(expressionToInput(proof.root), '0');
  assert.equal(expressionToInput(shortcut.root), expressionToInput(proof.root));
});

test('inside a longer sum, a + b + −b, the proof and the shortcut both give a + 0', () => {
  const root = parseExpression('a+b+-b');
  const [, b, negB] = root.operands;
  const proof = provePairIsZero(root, root.id, b.id, negB.id);
  const shortcut = cancelOpposites(root, b.id, negB.id);
  // The zero product replaces the whole bracketed product, so no brackets are
  // left over: the two routes agree exactly.
  assert.equal(expressionToInput(shortcut.root), 'a+0');
  assert.equal(expressionToInput(proof.root), expressionToInput(shortcut.root));
});
