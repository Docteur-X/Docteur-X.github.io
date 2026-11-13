/**
 * Numeric combination rule bundle: its interaction.
 *
 * Pointer only: an ordinary drag that ends on a number in the same sum or
 * product (drop target kind 'combine'). The shared drag geometry finds the
 * candidate sibling and asks `canTarget` whether it glows green; on release
 * the rule checks again and commits immediately (no preview), through a
 * single-use, source-stamped gate. The live tree is never edited first.
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list)
 * plus substitutions(), renderHistory(), syncInput(), render(animate) and
 * setSelectedNode(id).
 */
import { canCombineAddends } from '../../engine/operations/addition.js';
import { canCombineFactorsIn } from '../../engine/operations/multiplication.js';
import { createTransformationCommitLifecycle } from '../../steps/transformationCommitLifecycle.js';
import { findNodeById } from '../../engine/treeUtils.js';

export function installNumericCombination(ctx) {
  const lifecycle = createTransformationCommitLifecycle();

  // Hover and drop consult exactly the same canCombine*() functions the
  // operations use. Hit testing knows nothing about 0, 1 or matrices.
  function canCombine(drag, targetId) {
    if (!drag) return false;
    const parent = findNodeById(ctx.getRoot(), drag.parentId);
    const target = parent?.operands.find(child => child.id === targetId);
    if (!target) return false;
    return parent.type === 'Add' ? canCombineAddends(target, drag.item, ctx.substitutions())
      : parent.type === 'Multiply' ? canCombineFactorsIn(parent, target, drag.item, ctx.substitutions())
        : false;
  }

  function commit(targetId, drag) {
    if (lifecycle.isOpen()) return false;
    const parent = findNodeById(ctx.getRoot(), drag.parentId);
    const proposal = ctx.propose({
      ruleId: parent?.type === 'Add' ? 'addition.combine-numeric' :
        parent?.type === 'Multiply' ? 'multiplication.combine-numeric' : '',
      parameters: { parentId: drag.parentId, movingNodeId: drag.item.id,
        targetNodeId: targetId, substitutions: ctx.substitutions() }
    });
    if (proposal) proposal.actionLabel = proposal.result.actionLabel;
    if (!proposal || !lifecycle.open(proposal, ctx.sourceStamp())) return false;
    let outcome;
    try {
      outcome = lifecycle.confirm(ctx.sourceStamp(), selected => {
        const { parentId, movingNodeId, targetNodeId } = selected.action.parameters;
        // Publish only after history preparation succeeds. An autosave failure
        // must not undo mathematically valid work already committed in memory.
        ctx.commitTransformation({
          resultRoot: selected.result.root, actionLabel: selected.actionLabel,
          // e.g. 0·a÷b = 0 relies on b ≠ 0 (division stage D3).
          assumptions: selected.result.assumptions ?? [],
          operation: { ruleId: selected.action.ruleId, ruleVersion: 1,
            inputs: { parentId, movingNodeId, targetNodeId },
            affectedNodeIds: [parentId, movingNodeId, targetNodeId] }
        });
        ctx.setSelectedNode(null);
        ctx.renderHistory();
        ctx.syncInput();
        const assumed = (selected.result.assumptions ?? []).map(a => a.text).join(', ');
        ctx.setStatus(assumed ? `${selected.actionLabel}, assuming ${assumed}. Saved in history with the assumption.`
          : `${selected.actionLabel}. Saved in history.`);
      });
    } catch (error) {
      ctx.setStatus(`Numerical combination could not be committed: ${error.message}`);
      return false;
    }
    return outcome?.status === 'committed';
  }

  ctx.registerDropTarget({
    kind: 'combine',
    canTarget: canCombine,
    validate: ({ drag, target }) => canCombine(drag, target.id),
    drop({ drag, target, clearDrag }) {
      // Revalidate the final target: the dragged operand must still be where
      // the drag started, and the pair must still combine.
      const parent = findNodeById(ctx.getRoot(), drag.parentId);
      const succeeded = Boolean(parent) && parent.operands[drag.startIndex]?.id === drag.item.id &&
        canCombine(drag, target.id) && commit(target.id, drag);
      clearDrag();
      if (!succeeded) ctx.setStatus('That combination is no longer valid; nothing changed.');
      ctx.render();
    }
  });
}
