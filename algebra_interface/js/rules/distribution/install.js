/**
 * Distribution rule bundle: its interaction.
 *
 * - Pointer: drag a factor onto the + of a neighbouring bracketed sum (drop
 *   target kind 'distribution'). The shared drag snapshot finds the eligible
 *   + signs and their plans at pick-up (ordinaryDragGeometry.js); this rule
 *   checks the plan again on release and opens the preview.
 * - Keyboard: press D on a factor with exactly one neighbouring sum.
 * - Preview: amber copies of the factor appear on the committed expression,
 *   with curved arrows. Clicking any amber copy commits once; clicking
 *   elsewhere or Escape discards it without changing a single ID.
 *
 * Since stage 5 the amber copies are drawn by ./previewDecoration.js on the
 * rendered tree (registerTreeDecoration); the renderer knows nothing of them.
 *
 * Uses the rule context (see js/rules/negation/install.js) plus:
 * registerTreeDecoration, registerAfterMount, registerResize, registerObjectLoad,
 * renderEquation(animate), setSelectedNode, renderHistory, syncInput, render.
 */
import { findNodeById, findNodeLocation } from '../../engine/treeUtils.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { expressionToDisplayString } from '../../engine/parser.js';
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from '../../engine/operations/distribution.js';
import { distributionActionRequest } from './gesture.js';
import { describeDistributionPreview } from './visual.js';
import { renderDistributionCurves } from './arrows.js';
import { decorateDistributionPreview } from './previewDecoration.js';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function installDistribution(ctx) {
  // The plan the preview is DISPLAYING. Data for the renderer only: whether
  // distribution is previewing is ctx.viewMode.isPreview('distribution').
  let previewPlan = null;
  const paintCurves = () => renderDistributionCurves({ equation: ctx.view, preview: previewPlan });

  // The candidate is rendered as an amber overlay on the COMMITTED expression.
  const host = ctx.createPreviewHost({
    owner: 'distribution',
    presentation: {
      show(proposal) {
        const plan = proposal.result.plan;
        const source = findNodeById(ctx.getRoot(), plan.sourceFactorId);
        if (!source) throw new Error('Distribution source no longer exists');
        previewPlan = { ...plan, source, sourceText: expressionToDisplayString(source) };
        ctx.setSelectedNode(null);
        ctx.renderEquation(false);
      },
      clear() {
        previewPlan = null;
        ctx.renderEquation(false);
      }
    }
  });

  function cancel(showMessage = true) {
    if (!host.isOpen() && !ctx.viewMode.isPreview('distribution')) return;
    host.cancel();
    if (showMessage) ctx.setStatus('Distribution preview dismissed. The expression was not changed.');
  }

  function open(plan) {
    // A drag is not a preview. Only a valid candidate opens one.
    if (!ctx.viewMode.isIdle() || host.isOpen()) return;
    const action = distributionActionRequest(plan);
    const candidate = action ? ctx.propose(action) : null;
    if (!candidate) return;
    // Distribution rewrites its input tree in place; never hand it the live tree.
    const rewritten = applyDistribution(structuredClone(ctx.getRoot()), candidate.result.plan);
    if (!rewritten) return;
    const proposal = {
      result: { root: normaliseWithRules(rewritten.root), provenance: rewritten.provenance,
        plan: candidate.result.plan },
      action
    };
    const visual = describeDistributionPreview(candidate);
    try {
      if (!host.open({ candidate: proposal, stamp: ctx.sourceStamp() })) return;
      ctx.setStatus(`Amber preview: ${visual.direction} distribution. Click any highlighted factor copy to expand, or click elsewhere / press Escape to cancel.`);
    } catch (error) {
      ctx.setStatus(`Distribution preview unavailable: ${error.message}`);
    }
  }

  /** Commit once through the shared host, as one atomic history step. */
  function commit() {
    const plan = previewPlan;
    if (!plan || !host.isOpen()) return;
    const original = [...ctx.view.querySelectorAll('[data-node-id]')]
      .find(element => element.dataset.nodeId === plan.sourceFactorId);
    const originalRect = original?.getBoundingClientRect();
    let committedProvenance = null;
    let outcome;
    try {
      outcome = host.confirm(ctx.sourceStamp(), proposal => {
        const result = proposal.result;
        ctx.commitTransformation({
          resultRoot: result.root,
          actionLabel: `Applied ${plan.direction} distribution`,
          transformation: result.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: `distribution.${plan.direction}`, ruleVersion: 1,
            inputs: { direction: plan.direction, sumId: plan.sumId ?? null },
            affectedNodeIds: [plan.sourceFactorId, plan.sumId].filter(Boolean)
          }
        });
        committedProvenance = result.provenance;
        ctx.renderHistory();
      });
    } catch (error) {
      // The host has consumed the candidate and released the preview even if
      // the commit or visual cleanup threw. Re-rendering is best-effort.
      try { ctx.renderEquation(false); }
      catch (cleanupError) { console.error('Distribution render recovery failed', cleanupError); }
      ctx.setStatus(`Could not commit distribution: ${error.message}`);
      return;
    }
    if (outcome.status !== 'committed') {
      ctx.setStatus('The proposed expansion is no longer available; nothing changed.');
      return;
    }
    ctx.setSelectedNode(null);
    ctx.syncInput();
    ctx.render();
    animateCopies(originalRect, committedProvenance);
    ctx.setStatus(`Applied ${plan.direction} distribution. Newly copied factors and their source IDs are recorded in history.`);
  }

  /**
   * Animate only the freshly created factor copies, from where the source
   * factor was. Without the Web Animations API the rewrite is instant. This
   * never affects the mathematical result or its history entry.
   */
  function animateCopies(from, provenance) {
    if (!from || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const ids = new Set(provenance.copiesBySourceId[provenance.sourceFactorId] || []);
    const fromX = from.left + from.width / 2;
    const fromY = from.top + from.height / 2;
    for (const element of ctx.view.querySelectorAll('[data-node-id]')) {
      if (!ids.has(element.dataset.nodeId) || typeof element.animate !== 'function') continue;
      const to = element.getBoundingClientRect();
      element.animate([
        { transform: `translate(${fromX - to.left - to.width / 2}px, ${fromY - to.top - to.height / 2}px) scale(.85)`, opacity: .3 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ], { duration: 450, easing: 'cubic-bezier(.2,.7,.1,1)' });
    }
  }

  // --- Pointer: the 'distribution' drop target ----------------------------
  ctx.registerDropTarget({
    kind: 'distribution',
    enterStatus: drag => `Release on + to preview ${drag.distributionPlan?.direction} distribution. Yellow means a rule, not numeric evaluation.`,
    validate({ drag, target }) {
      const parent = findNodeById(ctx.getRoot(), drag.parentId);
      return Boolean(drag.distributionPlan && getDistributionPlan(parent, drag.item.id, target.id));
    },
    drop({ drag, clearDrag }) {
      const plan = drag.distributionPlan;
      clearDrag();
      open(plan);
    }
  });

  // --- Keyboard: D on a factor --------------------------------------------
  // The keyboard alternative to a precise drop: only when exactly one
  // neighbouring factor contains a sum.
  ctx.registerOccurrenceKey('request-distribution', (event, hitbox) => {
    const location = findNodeLocation(ctx.getRoot(), hitbox.dataset.nodeId);
    if (location?.parent?.type !== 'Multiply') return;
    const candidates = [location.index - 1, location.index + 1]
      .filter(index => index >= 0 && index < location.parent.operands.length)
      .map(index => unwrapGroupedSum(location.parent.operands[index]))
      .filter(Boolean)
      .map(sum => getDistributionPlan(location.parent, location.node.id, sum.id))
      .filter(Boolean);
    if (candidates.length === 1) {
      event.preventDefault();
      open(candidates[0]);
    } else if (candidates.length > 1) {
      ctx.setStatus('Two neighbouring sums are available; drag the factor to the + sign of the intended sum.');
    }
  });

  // --- Preview routes ------------------------------------------------------
  // A click on any amber copy commits once. A pointerdown anywhere else
  // cancels with no history entry, and that click does nothing else.
  ctx.router.route({ name: 'distribution-outside-cancel', on: 'pointerdown', at: 'document', modes: 'preview:distribution',
    handle: event => {
      if (ctx.isContextChangeControl(event)) return;
      if (event.target.closest('[data-preview-confirm]')) return;
      cancel();
      ctx.consumeOutsidePreviewClick(event);
    } });
  ctx.router.route({ name: 'distribution-confirm-click', on: 'click', at: 'view', modes: 'preview:distribution',
    handle: event => {
      if (!event.target.closest('[data-preview-confirm]')) return;
      event.preventDefault();
      commit();
    } });

  ctx.registerTreeDecoration(tree => {
    if (!previewPlan) return;
    const sum = findNodeById(ctx.getRoot(), previewPlan.sumId);
    decorateDistributionPreview(tree, previewPlan, sum?.operands ?? []);
  });
  ctx.registerAfterMount(paintCurves);
  ctx.registerResize(() => { if (ctx.viewMode.isPreview('distribution')) paintCurves(); });
  ctx.registerObjectLoad(() => cancel(false));
  ctx.registerPreviewDismissal({ active: () => host.isOpen() || ctx.viewMode.isPreview('distribution'), dismiss: () => cancel(false) });
  ctx.registerEscape(() => { if (!ctx.viewMode.isPreview('distribution')) return false; cancel(); return true; });

  return Object.freeze({ open, cancel, commit });
}
