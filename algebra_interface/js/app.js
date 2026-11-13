import { mountEquationPresentation } from './view/equationPresentationMount.js';
import { createEquationLayoutTransition } from './view/equationLayoutTransition.js';
import { createWorkspaceSession } from './app/workspace/workspaceSession.js';
import { createClipboardPanelController } from './view/clipboardPanelController.js';
import { queryApplicationDom } from './app/ui/domBindings.js';
import { normaliseMultiplicationMode, readSavedTheme, applyThemePreference, PRESENTATION_CHOICES, readSavedChoice, applyChoice } from './app/ui/presentationPreferences.js';
import { createApplicationTransformationFeatures } from './app/transformationFeatureAssembly.js';
/* ========================================================================== *
 * Algebra Workspace — application controller
 * ========================================================================== *
 * This file connects the browser interface to the mathematical model.
 * It deliberately does NOT contain the constructors for expression nodes,
 * the parser grammar, MathJSON conversion, or algebraic operation rules.
 * Those responsibilities live in their own modules:
 *
 *   core/nodeFactory.js       creates Number, Symbol, Add, Multiply, ... nodes
 *   core/parser.js            converts typed input into an expression tree
 *   core/treeUtils.js         traverses, looks up and normalises the tree
 *   core/mathJson.js          converts the tree into MathJSON-style data
 *   operations/addition.js    addition-specific rules
 *   operations/multiplication.js multiplication-specific rules
 *   rendering/domRenderer.js  turns the tree into interactive DOM elements
 *   interaction/hitTesting.js  converts stable rectangles into pointer targets
 *   interaction/dragFeedback.js paints hover/insert state without re-rendering
 *   interaction/rearrangementPreview.js draws inert visual proposed orderings
 *
 * The controller owns application state, user interactions, history, theme,
 * variable substitutions and the drag-and-drop lifecycle.
 * ========================================================================== */

import { toExactString } from "./engine/rational.js";
import { activeClipboardEntry } from "./documents/clipboardLibrary.js";
import { captureMathematicalClipboard } from "./documents/mathematicalClipboard.js";
import { createClipboardLibrary, appendClipboardEntry } from "./documents/clipboardLibrary.js";
import { detachHistorySnapshot } from "./documents/historySnapshotBoundary.js";
import { addObject, duplicateDocument } from "./documents/workspaceDocuments.js";
import { documentRepository } from "./documents/documentRepository.js";
import { findHistoryState, appendHistoryState } from "./documents/documentHistory.js";
import { parseExpression, expressionToInput, expressionToDisplayString } from "./engine/parser.js";
import { mathJSONToString } from "./engine/mathJson.js";
import { findNodeById, getUniqueSymbolNames } from "./engine/treeUtils.js";
import { renderExpression } from "./view/rendering/domRenderer.js";
import { createRendererInspector } from "./view/rendering/rendererInspector.js";
import { createSemanticTargetResolver } from "./view/rendering/semanticTargetResolver.js";
import { createEquationSemanticRefresh } from "./view/equationSemanticRefresh.js";
import { createStructureNavigator } from "./view/structureNavigator.js";
import { createDragFeedback } from "./view/drag/dragFeedback.js";
import { createTransformationSourceStamp } from "./steps/transformationSourceStamp.js";
import { shouldCompleteTouchTap, classifyOccurrenceKey } from "./view/selectionCommandRouting.js";
import { arbitrateIntents as arbitrateOrdinaryDropArbiter } from "./view/drag/intentArbitration.js";
import { createDocumentState, createViewState, createPreferences } from "./app/applicationState.js";
import { createRuleExtensions } from "./app/ruleExtensions.js";
import { createOrdinaryDragView } from "./view/drag/ordinaryDragView.js";
import { bindPanelControls } from "./app/ui/panelControls.js";
import { bindWorkspaceControls } from "./app/workspace/workspaceControls.js";
import { createHitboxVisibility } from "./view/hitboxVisibility.js";
import { createPreviewSessionHost } from "./steps/previewSessionHost.js";
import { createViewMode } from "./view/viewMode.js";
import { createInputRouter } from "./view/inputRouter.js";
import { markSelectedOccurrence } from "./view/selectionDecoration.js";
import { applyActionWording } from "./view/actionWording.js";
// Rule bundles (stage 4). app.js installs them; it knows nothing else about them.
import { partFromElement } from "./view/partFromElement.js";
import { GESTURE_DECLARATIONS } from "./app/gestureDeclarations.js";
import { createVisualFeedbackController } from "./view/visualFeedbackController.js";
import { createTransformationCoordinator } from "./steps/transformationCoordinator.js";
import { prepareAtomicTransformationCommit } from "./steps/atomicTransformationCommit.js";
import { publishPreparedTransformation } from "./steps/transformationPublication.js";
import { createHistoryView } from "./view/historyView.js";
import { createSymbolPanel } from "./app/ui/symbolPanel.js";
import { createSelectionView } from "./view/selectionView.js";
import { createEquationSelectionRoutes } from "./view/equationSelectionRoutes.js";
import { createEquationRoutes } from "./view/equationRoutes.js";
import { createEquationView } from "./view/equationView.js";
import { createRuleContext } from "./app/ruleContext.js";
import { RULE_BUNDLES } from "./rules/bundles.js";
// These adapters are used by live pointer/drop handlers as well as by the
// feature registry. Keep direct imports until those handlers are fully routed
// through the registry; removing them silently breaks all drag confirmations.

(function initialiseAlgebraWorkspace() {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * 1. DOM references
   * ---------------------------------------------------------------------- *
   * Cache frequently-used elements once. Dynamic equation terms are generated
   * by the renderer and use event delegation from the equation container.
   * ---------------------------------------------------------------------- */

  const dom = queryApplicationDom(document);
  // Developer-only semantic inspection; no effect without the URL opt-in.
  // One view-scoped semantic index serves both inspection and keyboard navigation.
  // The object ID is taken from the active document, not from AST node IDs.
  const semanticTargetResolver = createSemanticTargetResolver({
    view: dom.equation,
    getRoot: () => documentState.expressionRoot,
    getMathematicalObjectId: () => activeDocument()?.activeObjectId ?? null,
  });
  const rendererInspector = createRendererInspector(dom.equation, () => documentState.expressionRoot, semanticTargetResolver);

  /* ---------------------------------------------------------------------- *
   * 2. Application state
   * ---------------------------------------------------------------------- *
   * `expressionRoot` is now the source of truth for the mathematics. It is a
   * tree whose root may be an expression or equality node. There is no longer a flat `terms`
   * array. Any addend or factor may itself be a Group, Add or Multiply node,
   * allowing nesting to arbitrary depth. The Group preserves explicit user
   * brackets; mathematical operation precedence is handled separately.
   *
   * Substitutions remain a separate symbol-name -> numeric-value map. Drag
   * details and visual target information are temporary interaction state;
   * they are not mathematical nodes and are not copied into history.
   * ---------------------------------------------------------------------- */

  // Stage 6: state is split by owner (js/app/applicationState.js).
  const documentState = createDocumentState();
  const viewState = createViewState();
  const preferences = createPreferences();

  // The navigator is a separate interaction access point, not another AST
  // wrapper. Its visual focus is independent of ordinary drag/selection state.
  const structureNavigator = createStructureNavigator({
    view: dom.equation,
    semanticTargetResolver,
    mount: document.getElementById('structureNavigatorMount'),
    getRoot: () => documentState.expressionRoot,
    onSelect(nodeId) {
      // Decision 1.2: nothing new starts unless the view is idle.
      if (!viewMode.isIdle()) return;
      viewState.selectedNodeId = nodeId;
      viewState.lastClick = null;
      renderApplication(false);
    }
  });


  // The resolver is refreshed before its consumers after every DOM replacement.
  // This single view-local seam is also used for empty Mathematical Objects.
  // Source invalidation and feature-specific overlays stay with app.js.
  const equationSemanticRefresh = createEquationSemanticRefresh({
    view: dom.equation,
    resolver: semanticTargetResolver,
    inspector: rendererInspector,
    navigator: structureNavigator
  });

  // Hover is ephemeral presentation state. It never changes selection, AST,
  // history or cached drag geometry; the existing hitbox elements remain live.
  // The view mode is created below; this callback only runs on later pointer events.
  const hitboxVisibility = createHitboxVisibility(dom.equation, dom.html, { isIdle: () => viewMode.isIdle() });
  const HITBOX_STORAGE_KEY = 'algebra-hitbox-visibility';
  function saveHitboxPreference(value) {
    try { window.localStorage.setItem(HITBOX_STORAGE_KEY, value); } catch { /* Storage can be unavailable. */ }
  }
  function readHitboxPreference() {
    try { return window.localStorage.getItem(HITBOX_STORAGE_KEY); } catch { return null; }
  }
  // A presentation choice (fonts, boxes, spacing, subtraction): written to
  // <html> for the stylesheets. The printed box style shows boxes only on
  // hover, so it turns the hover outline mode on while it is chosen.
  function applyPresentation(name, value) {
    dom[name].value = applyChoice(dom.html, name, value, window.localStorage);
    if (name !== 'boxStyle') return;
    const printed = dom.boxStyle.value === 'printed';
    dom.hitboxVisibilityMode.disabled = printed;
    dom.hitboxVisibilityMode.value = hitboxVisibility.setMode(printed ? 'hover' : readHitboxPreference());
  }

  // Drag feedback can be updated independently of the expression renderer.
  // The overlay is created once, so pointer movement never inserts layout
  // elements into the equation or forces its hitboxes to be reconstructed.
  const dragFeedback = createDragFeedback(document, () => {
    // A preview animation has finished. Re-evaluate the LAST pointer target,
    // even when the student stopped moving while the animation played.
    // The synthetic event is marked so it cannot reinterpret a stationary
    // pointer using a shifted preview and accidentally start a second move.
    const drag = ordinaryDrag();
    if (drag?.moved) updateDragTarget({
      pointerId: drag.pointerId,
      clientX: drag.lastClientX,
      clientY: drag.lastClientY,
      previewJustSettled: true
    });
  });



  /* ---------------------------------------------------------------------- *
   * Workspace management. Only one Manipulator is mounted in v1. Its state
   * is transient; the active Document Controller owns committed math/history.
   * Cross-document selection will be a separate future workspace concern.
   * ---------------------------------------------------------------------- */
  // Transient in-app clipboard: no AST or history is modified by copying.
  // It deliberately survives object switches, but not a browser reload in v1.
  let mathematicalClipboard = createClipboardLibrary();

  // Clipboard storage remains session-owned. Equality arming and preview DOM
  // belong to the equality presentation controller; the shared Preview Host
  // owns the exclusive lease and single-use mathematical proposal lifecycle.
  const equationViewId = 'main-equation-view';
  // Standard 1: the one answer to "what is this view doing right now?"
  // Previews hold it through `viewMode.preview` (a lease), drags through
  // beginDrag/endDrag. Nothing new may start unless `viewMode.isIdle()`.
  const viewMode = createViewMode(equationViewId, {
    // CSS follows the mode, e.g. a nested sum's hover glow only when idle.
    onChange: kind => { dom.equation.dataset.viewMode = kind; }
  });
  dom.equation.dataset.viewMode = viewMode.current().kind;
  // Standard 2: every pointer and key route of the equation view, in order.
  // Each place below gets ONE native listener; see js/view/inputRouter.js.
  const inputRouter = createInputRouter({ viewMode, places: {
    'document-capture': document, view: dom.equation,
    'view-parent': dom.equation.parentElement, document, window
  } });
  // Decision 2.2: "what can I do here?" The declarations are data; the
  // routes below still hold the behaviour until rules become bundles.
  for (const declaration of GESTURE_DECLARATIONS) inputRouter.declare(declaration);
  // For an element in the equation: the gestures that may start there now.
  // (Empty while a preview or drag holds the view.) Used by tests today, and
  // later by screen-reader descriptions and guided teaching.
  function gesturesAt(element) {
    const part = partFromElement(element, {
      findNode: id => findNodeById(documentState.expressionRoot, id),
      isSelected: id => viewState.selectedNodeId === id || viewState.multiSelection.has(id)
    });
    return part ? inputRouter.gesturesFor(part) : [];
  }
  // Read-only diagnostics, like the renderer inspector: lets tests (and a
  // teacher's console) ask what a part offers. Returns plain data.
  window.manipulatorDiagnostics = Object.freeze({
    gesturesAt: element => gesturesAt(element).map(({ ruleId, kind, key, description }) => ({ ruleId, kind, key, description })),
    routes: () => inputRouter.describeRoutes(),
    mode: () => viewMode.current().kind
  });

  // Preview standard: a click outside a preview CANCELS it, and that same
  // click must not also do what was clicked (decision 1.2). Cancelling on
  // pointerdown is not enough, because the browser still sends a click
  // afterwards; this flag swallows that one click (route
  // 'suppress-click-after-outside-cancel').
  // Context changes are the exception: navigating the workspace, building a
  // new expression, restoring history, duplicating or importing a document.
  // Each dismisses previews itself (dismissPreviewsForContextChange) and
  // never commits them, so its click must arrive.
  const outsideClick = { suppress: false }; // see consumeOutsidePreviewClick
  const CONTEXT_CHANGE_CONTROLS = [
    '#objectNew', '#workspaceNew', '#objectList [data-object-id]', '#workspaceList [data-document-id]',
    '#expressionForm button[type="submit"]', '#historyTree [data-history-id]',
    '#historyGraphTree [data-history-id]', '#workspaceDuplicate', 'label[for="workspaceImport"]'
  ].join(', ');
  const isContextChangeControl = event => Boolean(event.target.closest?.(CONTEXT_CHANGE_CONTROLS));
  function consumeOutsidePreviewClick(event) {
    outsideClick.suppress = true;
    window.setTimeout(() => { outsideClick.suppress = false; }, 700);
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // The drag in progress, if any. An ordinary drag moves one occurrence; a
  // factor drag moves an already selected factor towards the extraction zone.
  // Each record is the feature's own data (ghost, geometry, session) and may
  // be updated in place; the view mode only says which drag holds the view.
  // Extension points that rule bundles register into
  // (js/app/ruleExtensions.js, stage 6).
  const extensions = createRuleExtensions();
  // Created early: history, the workspace and the drag view all use it.
  // (js/view/selectionView.js, stage 6)
  const selectionView = createSelectionView({
    documentState, dom, extensions, setStatus, viewMode, viewState
  });
  const { paintRangeSelection, clearSelectionDecorations, resetRangeSelection, toggleRangeSelection, paintRangeSelectionSafely, updateSelectionToolbars } = selectionView;
  const ordinaryDrag = () => viewMode.drag('ordinary');
  const factorDrag = () => viewMode.drag('factor');

  // Both equality and identity transformations use the same source-state contract.
  const transformationSourceStamp = () => createTransformationSourceStamp({
    documentId: workspaceSession.activeId(),
    objectId: activeDocument()?.activeObjectId ?? null,
    revision: documentState.history.currentNodeId,
    rootId: documentState.expressionRoot?.id ?? null,
    fingerprint: JSON.stringify(documentState.expressionRoot)
  });

  // The clipboard panel and pointer gesture adapter are presentation-only.
  // Their callbacks resolve a session entry, never an IndexedDB document.
  const clipboardUI = createClipboardPanelController({
    document, window, dom, equation: dom.equation,
    getLibrary: () => mathematicalClipboard,
    setLibrary: next => { mathematicalClipboard = next; },
    // Equality's arming and "apply this clipboard entry" come from its bundle.
    getArming: () => extensions.commands.get('clipboard.arming')?.() ?? null,
    onApply: entry => extensions.commands.get('clipboard.apply')?.(entry),
    onStatus: message => setStatus(message)
  });
  const renderClipboard = () => clipboardUI.render();
  renderClipboard();
  // Stage 6: documents, saving, import and export (js/app/workspace/workspaceSession.js).
  // It owns document state only; what the view must do around a change is
  // given here as hooks.
  const workspaceSession = createWorkspaceSession({ dom, documentState, documentRepository, view: {
    dismissPreviews: () => dismissPreviewsForContextChange(),
    cancelInteraction: () => cancelWorkspaceInteraction(),
    beforeObjectLoad: () => extensions.emit('beforeObjectLoad'),
    afterObjectLoad() {
      viewState.variableDrafts = Object.fromEntries(Object.entries(documentState.substitutions)
        .map(([key, value]) => [key, String(value)]));
      viewState.selectedNodeId = null;
      // Rule bundles that need to (e.g. distribution) close their previews.
      for (const onObjectLoad of extensions.objectLoads) onObjectLoad();
      resetRangeSelection();
      dom.expressionInput.value = documentState.expressionRoot ? expressionToInput(documentState.expressionRoot) : '';
      // Populated and empty objects are published through the same semantic
      // DOM boundary (the old hitbox index is invalidated either way).
      renderApplication(false);
    },
    setStatus: message => setStatus(message),
    confirm: question => window.confirm(question)
  } });
  const activeDocument = () => workspaceSession.activeDocument();
  const workspaceMessage = message => workspaceSession.message(message);
  const captureActive = () => workspaceSession.captureActive();
  const scheduleSave = () => workspaceSession.scheduleSave();

  /**
   * Context navigation is not a competing mathematical operation. Dismiss any
   * uncommitted proposal before changing the AST, document or active object.
   * The modal registry remains authoritative: if cleanup leaves a lease held,
   * the caller must not replace the source beneath the pending proposal.
   *
   * This intentionally does not reset selection or pointer state; callers own
   * that non-modal cleanup after this function reports success.
   */
  /**
   * One inventory of deliberate preview transactions. Feature-specific cancel
   * adapters remain responsible for their educational visuals and selection;
   * the shared hosts own leases and single-use mathematical proposals.
   *
   * The order is intentional and stable. A context change attempts every
   * dismissal; Escape dismisses only the first active transaction. This is
   * a view-local composition policy, not a second preview-state registry.
   */

  function dismissPreviewsForContextChange() {
    // Continue attempting other feature cleanup if one adapter throws. The
    // modal gate remains the final authority: context changes fail closed if
    // any lease survives, even if presentation cleanup was unsuccessful.
    let failed = false;
    for (const preview of extensions.previewDismissals) {
      try {
        if (preview.active()) preview.dismiss();
      } catch (error) {
        failed = true;
        console.error('Could not dismiss preview before changing context', error);
      }
    }
    return !failed && !viewMode.isPreview();
  }

  function cancelWorkspaceInteraction() {
    if (!dismissPreviewsForContextChange()) return false;
    cancelDrag(false);
    extensions.emit('abandonDrags');
    viewState.selectedNodeId = null;
    viewState.lastClick = null;
    resetRangeSelection();
    hitboxVisibility.clearHover();
    return true;
  }
  const DEFAULT_EXPRESSION = "a+b+c";
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  /* ---------------------------------------------------------------------- *
   * 3. Small application helpers
   * ---------------------------------------------------------------------- */

  /** Update the main accessible status line. */
  function setStatus(message) {
    dom.statusMessage.textContent = message;
  }

  /** Update the variable-panel status line. */
  function setVariableStatus(message) {
    dom.variableStatus.textContent = message;
  }

  /** Convert the current tree into the editable form-input syntax. */
  function syncExpressionInput() {
    if (documentState.expressionRoot) {
      dom.expressionInput.value = expressionToInput(documentState.expressionRoot);
    }
  }

  /**
   * Return an independent snapshot of all mathematical state that belongs to
   * a history point. The tree clone includes node types, operands, display
   * metadata and stable node IDs; substitutions are copied separately.
   *
   * Theme, panel visibility, pointer positions and hover targets are excluded
   * because they are interface state rather than mathematical history.
   */
  function createStateSnapshot() {
    return detachHistorySnapshot(documentState.expressionRoot, documentState.substitutions);
  }

  // (js/view/historyView.js, stage 6)
  const historyView = createHistoryView({
    cancelDrag: (...args) => cancelDrag(...args), captureActive, clearSelectionDecorations, createStateSnapshot, dismissPreviewsForContextChange, documentState, dom, extensions, renderApplication, resetRangeSelection, scheduleSave, setStatus, syncExpressionInput, viewState, workspaceSession
  });
  const { addHistoryNode, restoreHistoryNode, renderHistoryTreeInto, renderHistory } = historyView;

  // (js/view/equationView.js, stage 6)
  const equationView = createEquationView({
    REDUCED_MOTION_QUERY, activeDocument, clipboardUI, documentState, dom, equationSemanticRefresh, extensions, hitboxVisibility, paintRangeSelection, renderHistory,
    renderVariables: () => renderVariables(), // the symbol panel is created below
    semanticTargetResolver, updateSelectionToolbars, viewState
  });
  const { renderMath, createEquationElement } = equationView;
  // Hoisted forwarders: modules created above this point (history, the
  // workspace) call these later, at run time.
  function renderEquation(animate = true) { return equationView.renderEquation(animate); }
  function renderApplication(animate = true) { return equationView.renderApplication(animate); }

  // (js/app/ui/symbolPanel.js, stage 6)
  const symbolPanel = createSymbolPanel({
    addHistoryNode, documentState, dom, renderApplication, setVariableStatus, viewMode, viewState
  });
  const { renderVariables, handleVariableDraftInput, applyVariableValues, clearVariableValues } = symbolPanel;

  /* ---------------------------------------------------------------------- *
   * 7. Expression editing and tree-based operations
   * ---------------------------------------------------------------------- */

  /** Parse a fresh expression and establish it as a new history state. */
  function buildExpression(rawExpression) {
    try {
      if (workspaceSession.hasController() && !workspaceSession.activeObject()) {
        setStatus("Create a mathematical object before entering an expression.");
        return;
      }
      const nextExpression = parseExpression(rawExpression);
      // Parsing happens first: invalid input must not discard a valid preview.
      // A successful replacement is a deliberate context change and dismisses
      // every preview family before publishing the new AST.
      if (!dismissPreviewsForContextChange()) {
        setStatus('Dismiss the active preview before replacing the expression.');
        return false;
      }
      // The shared context-dismissal boundary above owns all modal preview
      // cancellation. Do not repeat feature-specific cancellation here.
      cancelDrag(false);
      extensions.emit('abandonDrags');
      clearSelectionDecorations();
      documentState.expressionRoot = nextExpression;
      viewState.selectedNodeId = null;
      resetRangeSelection();

      // Preserve substitutions only for symbols that still occur in the tree.
      const activeVariables = new Set(getUniqueSymbolNames(documentState.expressionRoot));
      documentState.substitutions = Object.fromEntries(
        Object.entries(documentState.substitutions).filter(([name]) => activeVariables.has(name))
      );
      viewState.variableDrafts = Object.fromEntries(
        Object.entries(documentState.substitutions).map(([name, value]) => [name, String(value)])
      );

      syncExpressionInput();
      addHistoryNode(`Built mathematical object: ${expressionToDisplayString(documentState.expressionRoot)}`, null, "free-edit");
      renderApplication();
      setStatus("Nested expression built. Drag siblings within the same sum or product; click a hitbox to add/remove explicit brackets.");
      return true;
    } catch (error) {
      setStatus(error.message);
      return false;
    }
  }



  /* ---------------------------------------------------------------------- *
   * 8. Pointer-driven drag and drop — NON-MUTATING DRAG SESSION
   * ---------------------------------------------------------------------- *
   * During the gesture, the mathematical tree remains completely untouched:
   *   - a floating DOM clone follows the cursor;
   *   - the original operand retains its position, size and node ID;
   *   - hitTesting.js compares the pointer to cached hitbox rectangles;
   *   - dragFeedback.js changes only existing CSS classes and a fixed overlay.
   * Only finishDrag() may call the mathematical operation modules to commit.
   * Cancelling a drag therefore requires no inverse operation or reparse.
   *
   * This distinction becomes crucial for fractions, powers and matrix cells:
   * hover geometry is not a mathematical rewrite. The future rule-specific
   * target regions can use the same snapshot/feedback API.
   * ---------------------------------------------------------------------- */

  /**
   * The nested sum or product a pointer target belongs to, when the target is
   * one of its own gaps or operators (its closest occurrence box is the
   * R1 `.nested-operation` box itself), else null.
   */
  function gapOwner(target) {
    const owner = target?.closest?.('[data-hitbox-role="occurrence"]');
    return owner?.classList.contains('nested-operation') && dom.equation.contains(owner) ? owner : null;
  }

  // Ordinary drag of one occurrence (js/view/drag/ordinaryDragView.js).
  const ordinaryDragView = createOrdinaryDragView({
    dom, documentState, viewState, viewMode, extensions, semanticTargetResolver, equationViewId, transformationSourceStamp, activeDocument, dragFeedback, setStatus,
    // Created later, with the selection routes: passed lazily.
    selectTouchNode: (...args) => selectTouchNode(...args), clearSelectionDecorations, renderApplication
  });
  const ordinaryDragController = ordinaryDragView.controller;
  const startDrag = (event, hitbox) => ordinaryDragView.pickup(event, hitbox);
  const cancelDrag = (showMessage = true) => ordinaryDragView.cancel(showMessage);
  const refreshDragGeometry = () => ordinaryDragView.refreshGeometry();
  const updateDragTarget = event => ordinaryDragView.updateTarget(event);

  /* ---------------------------------------------------------------------- *
   * 10. Multiplication display preference
   * ---------------------------------------------------------------------- *
   * This setting affects only rendering. Each Multiply node retains the style
   * with which it was entered, so choosing "As entered" can restore the
   * original per-product appearance at any time.
   * ---------------------------------------------------------------------- */

  function applyMultiplicationDisplayMode(mode) {
    viewState.multiplicationDisplayOverride = normaliseMultiplicationMode(mode);
    renderEquation();
  }
  function applyTheme(theme) {
    applyThemePreference(dom, preferences, theme, window.localStorage);
  }

  // (js/view/equationSelectionRoutes.js, stage 6)
  const equationSelectionRoutes = createEquationSelectionRoutes({
    documentState, dom, extensions, gapOwner, inputRouter, isContextChangeControl, outsideClick, paintRangeSelection, renderApplication, resetRangeSelection, setStatus, toggleRangeSelection, updateSelectionToolbars, viewMode, viewState
  });
  const { touch, selectTouchNode, toggleTouchMultiSelect } = equationSelectionRoutes;

  // The transformation registry and coordinator (rules propose through it).
  const transformationFeatures = createApplicationTransformationFeatures();
  const transformationCoordinator = createTransformationCoordinator(transformationFeatures);

  // (js/app/ruleContext.js, stage 6)
  const ruleContext = createRuleContext({
    activeDocument, addHistoryNode, cancelDrag, captureActive, consumeOutsidePreviewClick, createEquationElement, documentState, dom, equationViewId, extensions, inputRouter, isContextChangeControl, getClipboard: () => mathematicalClipboard, paintRangeSelectionSafely, renderApplication, renderEquation, renderHistory, renderMath, scheduleSave, semanticTargetResolver, setStatus, syncExpressionInput, transformationCoordinator, transformationSourceStamp, updateSelectionToolbars, viewMode, viewState, workspaceMessage, workspaceSession
  });

  // Every rule bundle, in the order of js/rules/bundles.js (order is behaviour).
  for (const bundle of RULE_BUNDLES) bundle.install(ruleContext);

  // (js/view/equationRoutes.js, stage 6)
  createEquationRoutes({
    cancelDrag, dom, extensions, gapOwner, hitboxVisibility, inputRouter, ordinaryDrag, ordinaryDragController, refreshDragGeometry, renderApplication, renderEquation, resetRangeSelection, selectTouchNode, startDrag, toggleRangeSelection, touch, viewMode, viewState
  });

  // Stage 6: the controls around the equation and the workspace buttons are
  // wired in js/app/ui/panelControls.js and js/app/workspace/workspaceControls.js.
  // Here is only what each one does.
  function copySelection() {
    // Clipboard capture is a new mathematical interaction, not a preview action.
    // Do not capture an ambiguous selection while a candidate owns this view.
    if (viewMode.isPreview()) return;
    if (!documentState.expressionRoot) return;
    const ids = viewState.multiSelection.ids();
    if (ids.length > 1) {
      setStatus('Copy one mathematical subtree at a time; select one node or clear the selection to copy the whole object.');
      return;
    }
    try {
      const captured = captureMathematicalClipboard(
        documentState.expressionRoot, ids[0] ?? viewState.selectedNodeId ?? null,
        { documentId: workspaceSession.activeId(), objectId: activeDocument()?.activeObjectId ?? null }
      );
      mathematicalClipboard = appendClipboardEntry(mathematicalClipboard, captured);
      renderClipboard();
      setStatus('Selection remembered in the session clipboard.');
    } catch (error) { setStatus(`Copy failed: ${error.message}`); }
  }



  bindPanelControls(dom, {
    buildExpression,
    resetExpression() {
      dom.expressionInput.value = DEFAULT_EXPRESSION;
      buildExpression(DEFAULT_EXPRESSION);
    },
    variableDraftInput: handleVariableDraftInput,
    applyVariableValues,
    clearVariableValues,
    setMultiplicationDisplay: applyMultiplicationDisplayMode,
    setHitboxVisibility: value => saveHitboxPreference(hitboxVisibility.setMode(value)),
    setPresentation: (name, value) => applyPresentation(name, value),
    toggleTheme: () => applyTheme(preferences.theme === "light" ? "dark" : "light"),
    copySelection,
    toggleTouchMultiSelect,
    restoreHistoryNode,
    renderHistoryGraph: () => renderHistoryTreeInto(dom.historyGraphTree, "history-tree--graph")
  });

  bindWorkspaceControls(dom, {
    nextObjectTitle: () => `Object ${(activeDocument()?.objectOrder.length ?? 0) + 1}`,
    addObject: title => workspaceSession.changeObject(controller => controller.addObject(title)),
    switchObject: id => workspaceSession.switchObject(id),
    activeObject: () => workspaceSession.activeObject(),
    renameObject: (id, title) => workspaceSession.changeObject(controller => controller.renameObject(id, title)),
    removeObject: id => workspaceSession.changeObject(controller => controller.removeObject(id)),
    createDocument: title => void workspaceSession.createDocument(title),
    activateDocument: id => workspaceSession.activateDocument(id),
    saveDocument: () => { workspaceSession.cancelPendingSaves(); void workspaceSession.saveDocument(activeDocument()); },
    activeDocumentTitle: () => activeDocument()?.title ?? null,
    renameDocument: title => workspaceSession.renameDocument(title),
    duplicateDocument: () => workspaceSession.duplicateActiveDocument(),
    closeDocument: () => workspaceSession.closeActiveDocument(),
    deleteDocument: () => void workspaceSession.deleteActiveDocument(),
    exportDocument: () => workspaceSession.exportActiveDocument(),
    importDocument: file => void workspaceSession.importWorkspaceDocument(file)
  });

  /* ---------------------------------------------------------------------- *
   * 14. Initialisation
   * ---------------------------------------------------------------------- */

  function startApplication() {
    applyTheme(readSavedTheme(window.localStorage));
    dom.hitboxVisibilityMode.value = hitboxVisibility.setMode(readHitboxPreference());
    for (const name of Object.keys(PRESENTATION_CHOICES)) applyPresentation(name, readSavedChoice(name, window.localStorage));
    workspaceSession.updateWorkspaceUI();
    void workspaceSession.loadWorkspace(); // Starts empty; saved documents are listed, not auto-opened.
  }

  startApplication();
})();
