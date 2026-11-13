/**
 * Identity rules bundle: its interaction (stage E4b). One install serves every
 * identity in the registry.
 *
 * - Tap (or press Enter on) an operator: the name of a function, or a + sign.
 *   If an identity applies to the part it belongs to, a preview shows the
 *   rewritten expression, the new parts in amber. Otherwise nothing happens
 *   here and other rules may answer.
 * - Select an amber part or Confirm to commit one history step; Cancel,
 *   Escape or a click elsewhere cancels.
 *
 * Uses only the rule context (see js/rules/negation/install.js for the list).
 */
import { createCandidatePreview } from '../../view/preview/candidatePreview.js';
import { describeIdentityCandidate } from './rule.js';
import { identitiesAt } from './engine.js';

export function installIdentityRules(ctx) {
  const previewUI = createCandidatePreview({
    name: 'identity-rule', equation: ctx.view, renderCandidate: ctx.renderCandidate,
    feedback: ctx.createFeedback(), describe: candidate => describeIdentityCandidate(candidate).label,
    onConfirm: () => confirm(),
    onCancel: () => { cancel(); ctx.setStatus('Cancelled: the expression is unchanged.'); }
  });
  const host = ctx.createPreviewHost({ owner: 'identity-rules', presentation: previewUI });
  const cancel = () => host.cancel();

  function open(nodeId) {
    if (host.isOpen() || !ctx.viewMode.isIdle()) return false;
    const [found] = identitiesAt(ctx.getRoot(), nodeId);
    if (!found) return false;
    const candidate = ctx.propose({ ruleId: found.identityId, parameters: { nodeId, direction: found.direction, identityId: found.identityId } });
    if (!candidate?.result?.root) return false;
    try {
      host.open({ candidate, stamp: ctx.sourceStamp(),
        onShown: () => ctx.setStatus(describeIdentityCandidate(candidate).status) });
    } catch (error) {
      ctx.setStatus(`The preview could not be shown: ${error.message}`);
    }
    return true;
  }

  function confirm() {
    let outcome;
    let words = null;
    try {
      outcome = host.confirm(ctx.sourceStamp(), candidate => {
        words = describeIdentityCandidate(candidate);
        ctx.commitTransformation({
          resultRoot: candidate.result.root,
          actionLabel: words.committed,
          transformation: candidate.result.provenance,
          operation: {
            ruleId: candidate.action.ruleId, ruleVersion: 1,
            inputs: { direction: candidate.result.provenance.direction },
            affectedNodeIds: candidate.result.affectedNodeIds
          }
        });
      });
    } catch (error) {
      cancel();
      ctx.setStatus(`The identity could not be used: ${error.message}`);
      return;
    }
    cancel();
    if (outcome?.status === 'committed') {
      ctx.afterCommit();
      ctx.setStatus(words.committed);
    } else ctx.setStatus('The preview is no longer current; nothing changed.');
  }

  ctx.registerPreviewDismissal({ active: () => host.isOpen(), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (host.isOpen()) cancel(); });

  // --- Routes (standard 2) -----------------------------------------------------
  // A function's name is its operator, an activation target: pressing it must
  // not pick the function up as a drag (drag it by its brackets instead). The
  // same for any other operator where an identity applies, such as the + of
  // sin(a)cos(b)+cos(a)sin(b) inside a product: otherwise pressing it picks up
  // the whole bracketed factor and the tap never arrives. Elsewhere pressing
  // an operator behaves as before.
  ctx.router.route({ name: 'identity-rule-operator-shield', on: 'pointerdown', at: 'view', modes: 'any',
    handle: event => {
      const operator = event.target.closest?.('[data-hitbox-role="operator"][data-operator-owner-id]');
      if (!operator || !ctx.view.contains(operator)) return;
      if (operator.dataset.operatorKind === 'function' || identitiesAt(ctx.getRoot(), operator.dataset.operatorOwnerId).length) {
        event.stopImmediatePropagation();
      }
    } });
  function activateFromEvent(event) {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    const operator = event.target.closest?.('[data-hitbox-role="operator"][data-operator-owner-id]');
    if (!operator || !ctx.view.contains(operator)) return;
    if (!open(operator.dataset.operatorOwnerId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  ctx.router.route({ name: 'identity-rule-activate-click', on: 'click', at: 'view', modes: 'idle', handle: activateFromEvent });
  ctx.router.route({ name: 'identity-rule-activate-key', on: 'keydown', at: 'view', modes: 'idle', handle: activateFromEvent });
  ctx.router.route({ name: 'identity-rule-preview-escape', on: 'keydown', at: 'document', modes: 'preview:identity-rules',
    handle: event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      cancel();
      ctx.setStatus('Cancelled: the expression is unchanged.');
    } });
  ctx.router.route({ name: 'identity-rule-preview-outside', on: 'pointerdown', at: 'document-capture', modes: 'preview:identity-rules',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest('[data-candidate-preview-actions], [data-preview-confirm]')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });

  return Object.freeze({ isOpen: () => host.isOpen(), cancel });
}
