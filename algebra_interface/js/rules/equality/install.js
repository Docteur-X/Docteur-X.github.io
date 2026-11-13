/**
 * Equality rule bundle: its interaction.
 *
 * - Clicking (or Enter on) the = sign opens a small menu that ARMS the
 *   equation with an operation. The armed state is transient and per view.
 * - "Use selected clipboard expression" in the menu, or dropping a clipboard
 *   entry on the equation (the clipboard panel calls the command
 *   'equality.apply-function'), proposes applying it to both sides. The
 *   preview shows only the two inserted operands in amber; selecting amber
 *   or Confirm commits, Cancel, Escape or a click elsewhere cancels.
 * - The Swap button applies symmetry immediately (a = b → b = a).
 *
 * The menu and preview DOM live in ./controller.js. Uses the rule context
 * (see js/rules/negation/install.js) plus: activeClipboardEntry(),
 * displayStyleOverride(), renderCandidate(root, options), addHistoryNode,
 * cancelDrags(), on('equationMounted'), registerCommand.
 */
import { swapEqualitySides, evaluateEquality } from '../../engine/relations/equality.js';
import { createEqualityInteractionController } from './controller.js';
import { equalityFunctionActionRequest } from './gesture.js';
import { isRelationNode } from '../../engine/nodeRegistry.js';
import { RELATIONS } from '../../definitions/relations/relations.js';

export function installEquality(ctx) {
  const controller = createEqualityInteractionController({
    document, window, equation: ctx.view, router: ctx.router,
    getRoot: ctx.getRoot,
    render: (root, options) => ctx.renderCandidate(root, options),
    onApplySelected: () => open(ctx.activeClipboardEntry()),
    onConfirm: () => confirm(),
    onCancel: () => cancel(),
    createFeedback: ctx.createFeedback,
    describe: () => 'Preview: amber terms are newly inserted.'
  });
  // The presentation adapts the controller's visuals; the host owns the
  // preview, the source stamp and the single-use commit gate.
  const host = ctx.createPreviewHost({
    owner: 'equality',
    presentation: {
      show: candidate => controller.showPreview(candidate),
      clear: () => controller.cancelPreview()
    }
  });
  const cancel = () => host.cancel();

  // The words for what a sign does to the relation (E4d): 'keeps <', 'flips to >', 'gives ='.
  function effectWords(relation, effect) {
    const signOf = id => RELATIONS.get(id)?.notation?.relation?.signs?.[0] ?? '';
    if (effect === 'same') return `keeps ${signOf(relation)}`;
    if (effect === 'converse') return `flips to ${signOf(RELATIONS.get(relation)?.converse)}`;
    return 'gives =';
  }

  function open(entry, sign = null) {
    const root = ctx.getRoot();
    if (!controller.arming || !isRelationNode(root) || controller.arming.relationId !== root.id) return false;
    if (!ctx.viewMode.isIdle()) return false;
    if (!entry || entry.category !== 'expression') {
      ctx.setStatus('Choose a copied expression (not a relation) as the operand.');
      return false;
    }
    const stamp = ctx.sourceStamp();
    const action = equalityFunctionActionRequest({
      relationId: root.id, context: controller.arming.context,
      clipboardId: entry.clipboardId, documentId: stamp.documentId,
      objectId: stamp.objectId, revision: stamp.revision, sign
    });
    if (!action) return false;
    try {
      // The clipboard operand is request data: the Engine never reads the
      // session clipboard.
      const candidate = ctx.propose({ ...action, parameters: { ...action.parameters, operandRoot: entry.root } });
      if (!candidate) {
        ctx.setStatus('This equality transformation is not mathematically eligible.');
        return false;
      }
      // The operand's sign decides what happens to an inequality, and it is
      // not known: ask the student (owner decision), then try again with it.
      if (candidate.result?.needsSign) {
        const { operandText, relation, effects } = candidate.result;
        const relationSign = RELATIONS.get(relation)?.notation?.relation?.signs?.[0] ?? '';
        const symbol = { positive: '> 0', zero: '= 0', negative: '< 0' };
        controller.ask({
          prompt: `Is ${operandText} positive, zero or negative? Multiplying changes ${relationSign} differently.`,
          choices: ['positive', 'zero', 'negative'].map(value => ({
            value, label: `${operandText} ${symbol[value]}: ${effectWords(relation, effects[value])}` })),
          onChoose: value => open(entry, value),
          onDismiss: () => ctx.setStatus('Cancelled: nothing was done to either side.')
        });
        ctx.setStatus(`Choose the sign of ${operandText}: it decides what happens to ${relationSign}.`);
        return true;
      }
      const visualDescription = ctx.describe(candidate);
      // Keep a snapshot of the exact operand used: the clipboard may change,
      // or its source document be edited, before confirmation.
      const proposal = { ...candidate, clipboardSource: structuredClone(entry.source) };
      if (!host.open({
        candidate: { ...proposal, equalityVisualDescription: visualDescription },
        stamp: ctx.sourceStamp()
      })) return false;
      ctx.setStatus('Preview: only the two copied operands are amber. Select amber to confirm, or Cancel.');
      return true;
    } catch (error) {
      cancel();
      ctx.setStatus(`Equality application unavailable: ${error.message}`);
      return false;
    }
  }

  function confirm() {
    // The shared single-use gate checks document, object, branch and the
    // whole source tree before the commit callback may touch anything.
    let outcome;
    let committed = null;
    try {
      outcome = host.confirm(ctx.sourceStamp(), proposal => {
        const { result, action, clipboardSource } = proposal;
        committed = result;
        ctx.commitTransformation({
          resultRoot: result.root,
          actionLabel: result.assumptions?.length
            ? `Applied function to both sides (assuming ${result.assumptions.map(a => a.text).join(', ')})`
            : 'Applied function to both sides of equality',
          ...(result.assumptions?.length ? { assumptions: result.assumptions } : {}),
          transformation: {
            ...result.provenance, source: clipboardSource,
            clipboardId: action.parameters.clipboardId
          },
          kind: 'rule-transform',
          operation: {
            ruleId: 'equality.apply-function', ruleVersion: 1,
            affectedNodeIds: [action.parameters.relationId]
          }
        });
        ctx.renderHistory();
      });
    } catch (error) {
      cancel();
      ctx.setStatus(`Could not commit equality application: ${error.message}`);
      return;
    }
    if (outcome.status === 'stale' || outcome.status === 'invalidated') {
      ctx.setStatus('The equation changed since preview; please try again.');
    } else if (outcome.status === 'committed') {
      ctx.syncInput();
      ctx.render(false);
      const flip = committed?.relationChange === 'converse' ? ' The inequality flipped.'
        : committed?.relationChange === 'equal' ? ' Multiplying by 0 gives an equality.' : '';
      const assumed = committed?.assumptions?.length ? ` Assuming ${committed.assumptions.map(a => a.text).join(', ')}.` : '';
      ctx.setStatus(`Applied the chosen function context to both sides.${flip}${assumed}`);
    }
  }

  // --- Symmetry: swap the sides (immediate) --------------------------------
  // A relation-level operation. Never implemented by dragging a term across
  // '=' (that would be a different rule).
  ctx.ui('swapEqualityButton').addEventListener('click', () => {
    if (ctx.viewMode.isPreview()) return; // immediate, but still obeys decision 1.2
    const root = ctx.getRoot();
    if (root?.type !== 'Equal') return;
    ctx.cancelDrags();
    const provenance = swapEqualitySides(root);
    ctx.addHistoryNode('Swapped equality sides (symmetry)', provenance, 'rule-transform', {
      ruleId: 'equality.symmetry', ruleVersion: 1, affectedNodeIds: [root.id]
    });
    ctx.syncInput();
    ctx.render();
    ctx.setStatus('Applied equality symmetry. Both sides retain their node IDs.');
  });

  ctx.on('equationMounted', () => {
    controller.mountOnRenderedEquation();
    showTruth();
  });

  // Truth is a derived view of the current relation and assigned values,
  // never a field on the Equal node or a history event. (Moved from app.js
  // in stage 6; shown after every mount of the equation.)
  function showTruth() {
    const root = ctx.getRoot();
    const isEqual = root?.type === 'Equal';
    ctx.ui('swapEqualityButton').hidden = !isEqual;
    const status = ctx.ui('equalityStatus');
    status.hidden = !isEqual;
    if (!isEqual) return;
    const result = evaluateEquality(root, ctx.substitutions());
    status.textContent = result.status.toUpperCase();
    status.dataset.truth = result.status;
    ctx.view.querySelector('.relation-sign')?.setAttribute('data-truth', result.status);
  }
  // The clipboard panel asks generically: what is armed, and apply an entry.
  ctx.registerCommand('clipboard.apply', entry => open(entry));
  ctx.registerCommand('clipboard.arming', () => controller.arming);
  ctx.registerPreviewDismissal({ active: () => host.isOpen(), dismiss: cancel });
  ctx.registerRerenderCancel(() => { if (host.isOpen()) cancel(); });

  return Object.freeze({ open, confirm, cancel, get arming() { return controller.arming; } });
}
