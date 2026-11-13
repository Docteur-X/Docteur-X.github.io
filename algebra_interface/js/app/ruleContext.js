/**
 * The rule context (standard 3, stage 6): the same generic services for every
 * rule bundle. A bundle's install(ctx) registers its routes, previews, drop
 * targets, decorations and commands through it, and reaches the document and
 * the view only through these services. Nothing here is named after a rule.
 * See js/rules/negation/install.js for a bundle that uses most of them.
 *
 * WHY: until stage 6 this object literal was written in app.js. It is
 * unchanged; what it needs is passed in by name (the parameters below).
 */
import { activeClipboardEntry } from '../documents/clipboardLibrary.js';
import { arbitrateIntents as arbitrateOrdinaryDropArbiter } from '../view/drag/intentArbitration.js';
import { createPreviewSessionHost } from '../steps/previewSessionHost.js';
import { createVisualFeedbackController } from '../view/visualFeedbackController.js';
import { prepareAtomicTransformationCommit } from '../steps/atomicTransformationCommit.js';
import { publishPreparedTransformation } from '../steps/transformationPublication.js';

import { restoreLeadingOne } from '../engine/divisionInvariant.js';
export function createRuleContext({
  activeDocument,
  addHistoryNode,
  cancelDrag,
  captureActive,
  consumeOutsidePreviewClick,
  createEquationElement,
  documentState,
  dom,
  equationViewId,
  extensions,
  inputRouter,
  isContextChangeControl,
  getClipboard, // the session clipboard is replaced on every copy: read it live
  paintRangeSelectionSafely,
  renderApplication,
  renderEquation,
  renderHistory,
  renderMath,
  scheduleSave,
  semanticTargetResolver,
  setStatus,
  syncExpressionInput,
  transformationCoordinator,
  transformationSourceStamp,
  updateSelectionToolbars,
  viewMode,
  viewState,
  workspaceMessage,
  workspaceSession
}) {
  // --- Rule bundles (stage 4) ---------------------------------------------
  // The rule context: the same generic services for every rule. A rule
  // registers its own routes, previews and drop targets through it.
  const ruleContext = Object.freeze({
    view: dom.equation, viewId: equationViewId, viewMode, router: inputRouter,
    resolver: semanticTargetResolver,
    getRoot: () => documentState.expressionRoot,
    activeObjectId: () => activeDocument()?.activeObjectId,
    propose: request => transformationCoordinator.propose(documentState.expressionRoot, request),
    sourceStamp: transformationSourceStamp,
    isSourceCurrent: stamp => stamp.documentId === workspaceSession.activeId() &&
      stamp.objectId === activeDocument()?.activeObjectId &&
      stamp.fingerprint === JSON.stringify(documentState.expressionRoot),
    intentArbiter: arbitrateOrdinaryDropArbiter,
    renderCandidate: (root, options = {}) => renderMath(root, {
      displayStyleOverride: viewState.multiplicationDisplayOverride,
      substitutions: documentState.substitutions,
      ...options
    }),
    describe: candidate => transformationCoordinator.describe(candidate),
    activeClipboardEntry: () => activeClipboardEntry(getClipboard()),
    displayStyleOverride: () => viewState.multiplicationDisplayOverride,
    addHistoryNode: (...args) => addHistoryNode(...args),
    cancelDrags: () => cancelDrag(false),
    createPreviewHost: ({ owner, presentation }) => createPreviewSessionHost({
      ownership: viewMode.preview, viewId: equationViewId, owner, presentation
    }),
    createFeedback: () => createVisualFeedbackController(dom.equation),
    // One atomic history step, published and saved.
    // `assumptions` (optional): conditions the step relies on, e.g.
    // [{ kind: 'nonzero', text: 'b ≠ 0' }]; kept with the history step and shown there.
    commitTransformation({ resultRoot, actionLabel, operation, transformation, kind, assumptions }) {
      const staged = prepareAtomicTransformationCommit({
        // The division invariant holds for every commit, even from a rule
        // that commits without the coordinator (e.g. explicit brackets).
        history: documentState.history, resultRoot: restoreLeadingOne(resultRoot).root, substitutions: documentState.substitutions,
        actionLabel, operation,
        ...(transformation ? { transformation } : {}), ...(kind ? { kind } : {}),
        ...(assumptions?.length ? { assumptions } : {})
      });
      publishPreparedTransformation({ state: documentState, staged });
      if (workspaceSession.hasController()) {
        try { captureActive(); scheduleSave(); }
        catch (error) { workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`); }
      }
    },
    afterCommit() { syncExpressionInput(); renderApplication(false); },
    substitutions: () => documentState.substitutions,
    setSelectedNode: id => { viewState.selectedNodeId = id; },
    renderHistory,
    syncInput: syncExpressionInput,
    render: (animate = true) => renderApplication(animate),
    // A rule's own controls outside the equation (e.g. the identity toolbar).
    ui: name => dom[name],
    createEquationElement,
    isContextChangeControl,
    consumeOutsidePreviewClick,
    setStatus,
    // The shared multi-selection (owned here, because factorisation uses it too).
    selectedIds: () => viewState.multiSelection.ids(),
    clearMultiSelection() {
      viewState.multiSelection.clear();
      viewState.touchMultiSelectMode = false;
      viewState.lastClick = null;
    },
    updateSelectionToolbar: () => updateSelectionToolbars(),
    selectedNodeId: () => viewState.selectedNodeId,
    paintSelection: () => paintRangeSelectionSafely(),
    renderEquation: (animate = true) => renderEquation(animate),
    ...extensions.registrations,
  });

  return ruleContext;
}
