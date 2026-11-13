/**
 * Identity rule bundle: its interaction.
 *
 * The student drags +0 or ×1 from the identity toolbar onto the left or right
 * half of a term, or onto a matching operator. While dragging, the target is
 * highlighted and the Engine's proposal is computed (as data only; nothing is
 * rendered, so the equation never jumps under the pointer). On release a
 * preview opens through the shared preview host: click the amber identity or
 * Confirm to insert; Escape, Cancel or a click elsewhere leaves it unchanged.
 *
 * The drag is held by the view mode (owner 'identity-tool'); the preview is
 * owner 'identity'. Uses the rule context (see js/rules/negation/install.js),
 * plus: ui(name), createEquationElement(root), renderHistory, render(animate),
 * registerEscape(handler), registerActivity(isActive).
 */
import { arbitrateIdentityDrop } from './dropArbitration.js';
import { createIdentityToolPreview } from './toolPreview.js';
import { createIdentityDragFeedback, describeIdentityTarget } from './dragFeedback.js';
import { interpretIdentityPointer } from './gesture.js';
import { describeIdentityPreview } from './visual.js';

const SAME_SOURCE_FIELDS = ['documentId', 'objectId', 'revision', 'rootId', 'fingerprint'];

export function installIdentity(ctx) {
  const toolbar = ctx.ui('identityToolbar');
  const previewActions = ctx.ui('identityPreviewActions');
  const visual = createIdentityToolPreview(ctx.view, ctx.createEquationElement);
  const feedback = createIdentityDragFeedback(toolbar, ctx.view);
  const drag = () => ctx.viewMode.drag('identity-tool');
  const endDrag = () => ctx.viewMode.endDrag(ctx.viewMode.dragId('identity-tool'));
  const isActive = () => Boolean(drag()) || ctx.viewMode.isPreview('identity');
  let dragSequence = 0;
  let proposal = null;

  // Only the deliberate confirmation preview belongs to the shared host; the
  // toolbar drag and its target feedback are not a preview.
  const host = ctx.createPreviewHost({
    owner: 'identity',
    presentation: {
      show(candidate) {
        const description = describeIdentityPreview(candidate);
        visual.show({ ...candidate.result, identityNodeId: description.confirmationNodeId });
        visual.setModal();
        previewActions.hidden = false;
      },
      clear() {
        try { visual.clear(); }
        finally { previewActions.hidden = true; }
      }
    }
  });

  function cancel() {
    endDrag();
    proposal = null;
    // Release the preview even if presentation cleanup fails.
    try { host.cancel(); }
    finally { feedback.stop(); }
  }

  function updateTarget(event) {
    if (!drag() || ctx.viewMode.isPreview('identity')) return;
    feedback.move(event.clientX, event.clientY);
    const target = interpretIdentityPointer(ctx.view, document.elementFromPoint(event.clientX, event.clientY),
      event.clientX, drag().operation);
    const key = target?.action ? JSON.stringify(target.action) : null;
    // The candidate is mathematical data only. Rendering it while hovering
    // would make the equation jump and compete with stable hit testing.
    if (key !== drag().lastKey) {
      drag().lastKey = key;
      proposal = target?.action ? ctx.propose(target.action) : null;
      ctx.setStatus(describeIdentityTarget(proposal ? target.action.parameters : null));
    }
    feedback.highlight(proposal ? target.element : null);
  }

  function confirm() {
    if (!ctx.viewMode.isPreview('identity') || !host.isOpen()) return;
    let outcome;
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        const result = candidate.result;
        ctx.commitTransformation({
          resultRoot: result.root,
          actionLabel: `Introduced ${result.operation === 'Add' ? '+0' : '×1'}`,
          transformation: {
            sourceNodeIds: result.request.targetNodeId ? [result.request.targetNodeId] : [],
            createdNodeIds: [result.identityNodeId]
          },
          kind: 'rule-transform',
          operation: {
            ruleId: 'identity.introduce', ruleVersion: 1,
            inputs: result.request, generatedNodeIds: [result.identityNodeId]
          }
        });
        ctx.renderHistory();
      });
    } catch (error) {
      try { cancel(); } catch (cleanupError) {
        console.error('Identity insertion cleanup also failed:', cleanupError);
      }
      ctx.setStatus(`Could not commit identity insertion: ${error.message}`);
      return;
    }
    cancel();
    if (outcome.status === 'stale') {
      ctx.setStatus('Identity preview is stale; nothing changed.');
      return;
    }
    if (outcome.status !== 'committed') return;
    ctx.render(false);
    ctx.setStatus('Identity introduced. The original mathematical objects retain their IDs.');
  }

  // --- Picking up +0 or ×1 from the toolbar --------------------------------
  // The toolbar is identity's own control, outside the equation view.
  toolbar.addEventListener('pointerdown', event => {
    const tool = event.target.closest('[data-identity-operation]');
    if (!tool || !ctx.getRoot() || !ctx.viewMode.isIdle()) return;
    event.preventDefault();
    const sourceStamp = ctx.sourceStamp();
    const record = {
      operation: tool.dataset.identityOperation, pointerId: event.pointerId,
      lastKey: null, arbitrationViewId: ctx.viewId,
      arbitrationObjectId: sourceStamp.objectId ?? 'standalone-mathematical-object',
      arbitrationSessionToken: `identity-${++dragSequence}`,
      arbitrationSourceStamp: sourceStamp
    };
    if (ctx.viewMode.beginDrag('identity-tool', record) === null) return;
    feedback.start(record.operation, event.clientX, event.clientY);
    ctx.setStatus(`Drag ${record.operation === 'Add' ? '+0' : '×1'} onto the left or right half of a term, or onto a matching operator.`);
  });

  // --- Routes (standard 2) -------------------------------------------------
  ctx.router.route({ name: 'identity-tool-move', on: 'pointermove', at: 'window', modes: 'dragging:identity-tool',
    handle: event => { if (drag().pointerId === event.pointerId) updateTarget(event); } });
  ctx.router.route({ name: 'identity-tool-release', on: 'pointerup', at: 'window', modes: 'dragging:identity-tool',
    handle: event => {
      if (drag().pointerId !== event.pointerId) return;
      // Re-evaluate the release target with the original gesture operation.
      // A stale source must not reuse a hover candidate from another tree.
      const record = drag();
      const current = ctx.sourceStamp();
      const original = record.arbitrationSourceStamp;
      const sourceValid = Boolean(original) && SAME_SOURCE_FIELDS.every(field => original[field] === current[field]);
      if (sourceValid) updateTarget(event);
      const decision = arbitrateIdentityDrop({
        arbitrateIntents: ctx.intentArbiter,
        drag: record, sourceValid,
        modalBlocked: ctx.viewMode.isPreview(),
        actionValid: Boolean(proposal)
      });
      endDrag();
      feedback.stop();
      if (decision.status !== 'chosen') { cancel(); return; }
      // The host acquires the preview, opens the single-use proposal and
      // shows the candidate together; if it refuses, nothing else changes.
      try {
        const opened = host.open({ candidate: proposal, stamp: ctx.sourceStamp() });
        if (!opened) { cancel(); return; }
        ctx.setStatus('Identity preview: click the amber identity or Confirm to insert; Escape or click elsewhere to cancel.');
      } catch (error) {
        try { cancel(); } catch (cleanupError) {
          console.error('Identity preview cleanup also failed:', cleanupError);
        }
        ctx.setStatus(`Identity preview unavailable: ${error.message}`);
      }
    } });
  ctx.router.route({ name: 'identity-tool-cancel', on: 'pointercancel', at: 'window', modes: 'dragging:identity-tool',
    handle: event => { if (drag().pointerId === event.pointerId) cancel(); } });
  ctx.ui('confirmIdentityButton').addEventListener('click', confirm);
  ctx.ui('cancelIdentityButton').addEventListener('click', () => { cancel(); ctx.setStatus('Identity preview cancelled.'); });
  // A click on the amber mathematical occurrence is another way to confirm.
  ctx.router.route({ name: 'identity-confirm-click', on: 'click', at: 'view-parent', modes: 'preview:identity',
    handle: event => { if (event.target.closest('.identity-preview-new')) confirm(); } });
  ctx.router.route({ name: 'identity-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:identity',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest('#identityPreviewActions, .identity-preview-new')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });

  ctx.registerPreviewDismissal({ active: () => isActive() || host.isOpen(), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (isActive()) cancel(); });
  ctx.registerEscape(() => { if (!isActive()) return false; cancel(); return true; });
  ctx.registerActivity(isActive);

  return Object.freeze({ isActive, cancel });
}
