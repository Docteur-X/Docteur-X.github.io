/**
 * Rearrangement rule bundle: its interaction.
 *
 * - Pointer: an ordinary drag that ends in a gap between siblings (drop
 *   target kind 'insert'). The shared drag geometry SUGGESTS the gap; this
 *   rule decides whether that reorder is allowed (`accepts`) and commits it.
 * - Keyboard: Left/Right arrow on a focused term or factor.
 * Both are immediate (no preview) but go through a single-use,
 * source-stamped commit gate, so a stale or repeated drop can't commit twice.
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list)
 * plus these services: substitutions(), renderHistory(), syncInput(),
 * render(animate), registerOccurrenceKey(action, handler).
 */
import { rearrangementActionRequest } from './gesture.js';
import { describeRearrangementFeedback } from './visual.js';
import { prepareRearrangementCommitCandidate } from './commitCandidate.js';
import { completePointerRearrangement } from './pointerExit.js';
import { resolveDragInsertionBoundary } from '../../view/drag/insertionBoundary.js';
import { createTransformationCommitLifecycle } from '../../steps/transformationCommitLifecycle.js';
import { findNodeById, findNodeLocation } from '../../engine/treeUtils.js';
import { expressionToDisplayString } from '../../engine/parser.js';

export function installRearrangement(ctx) {
  const lifecycle = createTransformationCommitLifecycle();

  function candidateFor(parentId, parentType, draggedNodeId, destinationIndex) {
    const action = rearrangementActionRequest({ parentId, parentType, draggedNodeId, destinationIndex });
    return action ? ctx.propose(action) : null;
  }
  // A hover insertion is only a geometric proposal: resolve it against the
  // live mathematical object.
  function candidateForDrop(drag, target) {
    const root = ctx.getRoot();
    const parent = findNodeById(root, drag.parentId);
    const boundary = resolveDragInsertionBoundary({
      root, parentId: drag.parentId, sourceId: drag.item.id, target, findNodeById
    });
    return boundary ? candidateFor(boundary.parentId, parent?.type, drag.item.id, boundary.index) : null;
  }

  /**
   * Prepare a detached candidate only on drop or key press, then consume the
   * single-use gate. Never mutate the live tree to test a reorder. This does
   * not render: a pointer drop must not replay its already-settled animation.
   */
  function commit(candidate, { normalise = false } = {}) {
    if (!candidate?.result?.changed || lifecycle.isOpen()) return false;
    const parameters = candidate.action.parameters;
    const proposal = prepareRearrangementCommitCandidate(ctx.getRoot(), candidate, { normalise });
    if (!proposal) return false;
    if (!lifecycle.open(proposal, ctx.sourceStamp())) return false;
    let outcome;
    try {
      outcome = lifecycle.confirm(ctx.sourceStamp(), selected => {
        const parentType = parameters.parentType;
        const moved = findNodeById(ctx.getRoot(), parameters.draggedNodeId);
        ctx.commitTransformation({
          resultRoot: selected.result.root,
          actionLabel: `${parentType === 'Add' ? 'Reordered addend' : 'Reordered factor'} ${expressionToDisplayString(moved)}`,
          operation: {
            ruleId: selected.action.ruleId, ruleVersion: 1,
            inputs: { parentId: parameters.parentId, destinationIndex: parameters.destinationIndex },
            affectedNodeIds: [parameters.draggedNodeId, parameters.parentId]
          }
        });
        ctx.renderHistory();
      });
    } catch (error) {
      ctx.setStatus(`Rearrangement could not be committed: ${error.message}`);
      return false;
    }
    if (outcome?.status !== 'committed') {
      ctx.setStatus('Rearrangement was rejected because its source changed.');
      return false;
    }
    ctx.syncInput();
    return true;
  }

  // --- Pointer: the 'insert' drop target ----------------------------------
  ctx.registerDropTarget({
    kind: 'insert',
    // The geometry modules can suggest an insertion, but the rule must
    // authorise it, including for noncommutative products.
    accepts({ drag, target }) {
      if (target.index === drag.startIndex) return true;
      return Boolean(describeRearrangementFeedback(candidateForDrop(drag, target)));
    },
    validate({ drag, target }) {
      return Boolean(candidateForDrop(drag, target)?.result?.changed);
    },
    drop({ drag, target, clearDrag }) {
      const candidate = candidateForDrop(drag, target);
      const committed = completePointerRearrangement({
        candidate,
        commitCandidate: value => commit(value, { normalise: true }),
        clearDrag,
        render: ctx.render
      });
      if (committed) ctx.setStatus('Rearrangement saved in history.');
      else if (candidate && !candidate.result.changed) ctx.setStatus('The expression stayed in its original order.');
      else ctx.setStatus('Reordering is not permitted or the source changed; nothing was committed.');
    }
  });

  // --- Keyboard: Left/Right arrow -----------------------------------------
  // A factor moves only among the factors of its own product, an addend only
  // among the addends of its own sum, at any nesting depth.
  ctx.registerOccurrenceKey('request-rearrangement', (event, hitbox) => {
    event.preventDefault();
    const nodeId = hitbox.dataset.nodeId;
    const location = findNodeLocation(ctx.getRoot(), nodeId);
    if (!location?.parent) return;
    const destinationIndex = location.index + (event.key === 'ArrowLeft' ? -1 : 1);
    if (destinationIndex < 0 || destinationIndex >= location.parent.operands.length) return;
    if (!commit(candidateFor(location.parent.id, location.parent.type, nodeId, destinationIndex))) return;
    ctx.render();
    // Keep keyboard focus on the moved occurrence (found by its stable ID).
    const moved = [...ctx.view.querySelectorAll('.add-operand[data-node-id], .factor-slot[data-node-id]')]
      .find(element => element.dataset.nodeId === nodeId);
    (moved ?? hitbox).focus();
  });
}
