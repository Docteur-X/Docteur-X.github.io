import { createWorkspaceStatusGate } from './workspace/workspaceStatusGate.js';
import { createEqualityInteractionController } from './interaction/equalityInteractionController.js';
import { createClipboardPanelController } from './interaction/clipboardPanelController.js';
import { queryApplicationDom } from './ui/domBindings.js';
import { renderWorkspaceNavigation, renderObjectNavigation } from './ui/workspaceNavigation.js';
import { normaliseMultiplicationMode, readSavedTheme, applyThemePreference } from './ui/presentationPreferences.js';
import { createApplicationTransformationFeatures } from './composition/transformationFeatureAssembly.js';
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

import { cloneExpression, reserveNodeIds } from "./core/nodeFactory.js";
import { equalityFunctionActionRequest } from "./manipulator/equalityFunctionGesture.js";
import { activeClipboardEntry } from "./core/clipboardLibrary.js";
import { captureMathematicalClipboard } from "./core/mathematicalClipboard.js";
import { createClipboardLibrary, appendClipboardEntry } from "./core/clipboardLibrary.js";
import { createDocumentController } from "./core/documentController.js";
import { newDocument, addObject, duplicateDocument, validateDocument, getActiveObject, reserveDocumentNodeIds } from "./core/workspaceDocuments.js";
import { documentRepository } from "./core/documentRepository.js";
import { serializeCompactDocument, deserializeCompactDocument } from "./core/documentSerialization.js";
import { createDocumentHistory, findHistoryState, appendHistoryState } from "./core/documentHistory.js";
import { createMathematicalDocument, updateDocumentRoot } from "./core/mathematicalDocument.js";
import { swapEqualitySides, evaluateEquality } from "./relations/equality.js";
import { parseExpression, expressionToInput, expressionToDisplayString } from "./core/parser.js";
import { mathJSONToString } from "./core/mathJson.js";
import {
  findNodeById,
  findNodeLocation,
  getUniqueSymbolNames
} from "./core/treeUtils.js";
import { normaliseWithRules } from "./core/normalization.js";
import { canCombineAddends, combineNumericAddends } from "./operations/addition.js";
import {
  canCombineFactors,
  combineNumericFactors,
  // Rearrangement rules are invoked through the shared coordinator.
} from "./operations/multiplication.js";
import { removeGroup, wrapNodeInGroup, getRangeGroupingPlan, groupOperandRange } from "./operations/grouping.js";
import { getDistributionPlan, applyDistribution, unwrapGroupedSum } from "./operations/distribution.js";
import { getFactorisationPlan, applyFactorisation } from "./operations/factorisation.js";
import { checkFactorisationTeachingPolicy } from "./teaching/factorisationPolicy.js";
import { renderExpression } from "./rendering/domRenderer.js";
import { captureDragGeometry, hitTestDrag, hitTestVisibleInsertion, retainInsertionDuringTransition } from "./interaction/hitTesting.js";
import { createDragFeedback } from "./interaction/dragFeedback.js";
import { createSelectionModel } from "./interaction/selection.js";
import { createHitboxVisibility } from "./interaction/hitboxVisibility.js";
import { createNegationInlinePreview } from "./interaction/negationInlinePreview.js";
import { createVisualFeedbackController } from "./interaction/visualFeedbackController.js";
import { resolveNegationCompressionTarget } from "./interaction/negationCompressionTarget.js";
import { createGroupingPreview } from "./interaction/groupingPreview.js";
import { createFactorisationPreview } from "./interaction/factorisationPreview.js";
import { createTransformationPreview } from "./interaction/transformationPreview.js";
import { createIdentityToolPreview } from "./interaction/identityTool.js";
import { createIdentityDragFeedback, describeIdentityTarget } from "./interaction/identityDragFeedback.js";
import { interpretIdentityPointer } from "./manipulator/identityGesture.js";
import { createTransformationCoordinator } from "./manipulator/transformationCoordinator.js";
import { createTransformationCommitLifecycle } from "./manipulator/transformationCommitLifecycle.js";
import { prepareAtomicTransformationCommit } from "./manipulator/atomicTransformationCommit.js";
import { publishPreparedTransformation } from "./manipulator/transformationPublication.js";
// These adapters are used by live pointer/drop handlers as well as by the
// feature registry. Keep direct imports until those handlers are fully routed
// through the registry; removing them silently breaks all drag confirmations.
import { describeIdentityPreview } from "./manipulator/identityVisual.js";
import { distributionActionRequest } from "./manipulator/distributionGesture.js";
import { describeDistributionPreview } from "./manipulator/distributionVisual.js";
import { groupingActionRequest } from "./manipulator/groupingGesture.js";
import { describeGroupingPreview } from "./manipulator/groupingVisual.js";
import { factorisationActionRequest } from "./manipulator/factorisationGesture.js";
import { describeFactorisationPreview } from "./manipulator/factorisationVisual.js";
import { describeRearrangementFeedback } from "./manipulator/rearrangementVisual.js";
import { rearrangementActionRequest } from "./manipulator/rearrangementGesture.js";
import { proposeRearrangement } from "./manipulator/rearrangementRule.js";
import { prepareRearrangementCommitCandidate } from "./manipulator/rearrangementCommitCandidate.js";

(function initialiseAlgebraWorkspace() {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * 1. DOM references
   * ---------------------------------------------------------------------- *
   * Cache frequently-used elements once. Dynamic equation terms are generated
   * by the renderer and use event delegation from the equation container.
   * ---------------------------------------------------------------------- */

  const dom = queryApplicationDom(document);

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

  const state = {
    expressionRoot: null,
    mathematicalDocument: null, // Document metadata/history, not pointer state.
    substitutions: {},
    variableDrafts: {},
    theme: "light",

    // "source" preserves the display style typed for each product. Other
    // values override the appearance of all Multiply nodes without changing
    // their mathematical meaning or their MathJSON representation.
    multiplicationDisplayOverride: "source",

    history: createDocumentHistory(),

    // Transient drag data. `parentId` identifies the Add/Multiply parent.
    // The actual child list stays unchanged until a successful drop.
    drag: null,

    // Yellow means a RULE is available, unlike green numeric evaluation.
    // distributionPreview exists AFTER release, but BEFORE confirmation:
    // absolutely no mathematical nodes or history are changed at that stage.
    distributionPreview: null,

    // Selection is interaction state, not mathematical state. A click selects
    // any node; an Alt+click selects its containing hitbox. The toolbar then
    // edits Group boundaries in an intentional, discoverable way.
    selectedNodeId: null,
    // Multiple selection is general-purpose: non-siblings remain selectable
    // for later factorisation, but only eligible ranges offer grouping.
    multiSelection: createSelectionModel(),
    touchMultiSelectMode: false, // Interaction mode only; never enters document history.
    groupingMode: "normal", // "normal" | "preview" (a lightweight modal mode)
    groupingPlan: null,
    // Factorisation uses the same general multi-selection, but has its own
    // lightweight modal preview. The tree is untouched until confirmation.
    factorisationMode: "normal", // "normal" | "preview"
    factorisationPlan: null,
    factorisationProposal: null, // independently built result; not committed until confirmation
    factorDrag: null, // separate from ordinary single-operand dragging
    lastClick: null
  };

  // Hover is ephemeral presentation state. It never changes selection, AST,
  // history or cached drag geometry; the existing hitbox elements remain live.
  const hitboxVisibility = createHitboxVisibility(dom.equation, dom.html);
  const HITBOX_STORAGE_KEY = 'algebra-hitbox-visibility';
  function saveHitboxPreference(value) {
    try { window.localStorage.setItem(HITBOX_STORAGE_KEY, value); } catch { /* Storage can be unavailable. */ }
  }
  function readHitboxPreference() {
    try { return window.localStorage.getItem(HITBOX_STORAGE_KEY); } catch { return null; }
  }

  // Drag feedback can be updated independently of the expression renderer.
  // The overlay is created once, so pointer movement never inserts layout
  // elements into the equation or forces its hitboxes to be reconstructed.
  const dragFeedback = createDragFeedback(document, () => {
    // A preview animation has finished. Re-evaluate the LAST pointer target,
    // even when the student stopped moving while the animation played.
    // The synthetic event is marked so it cannot reinterpret a stationary
    // pointer using a shifted preview and accidentally start a second move.
    const drag = state.drag;
    if (drag?.moved) updateDragTarget({
      pointerId: drag.pointerId,
      clientX: drag.lastClientX,
      clientY: drag.lastClientY,
      previewJustSettled: true
    });
  });

  // This overlay is OUTSIDE #equation. Its narrow activation borders cannot
  // affect layout or the stable drag hitboxes. Only the modal preview's whole
  // interior captures clicks, when ordinary dragging is intentionally locked.
  const groupingOverlay = createGroupingPreview(document, dom.equation, {
    onEnterPreview: () => enterRangeGroupingPreview(),
    onConfirm: () => commitRangeGrouping()
  });

  // A fixed-position amber overlay. It draws extraction zones and converging
  // arrows, but cannot edit the tree or disturb stable hitbox geometry.
  const factorisationOverlay = createFactorisationPreview(document, dom.equation, {
    onEnterPreview: () => enterFactorisationPreview()
  });

  // Generic modal result preview: uses the normal renderer, so any surrounding
  // multiplication factors, future fractions, powers and roots make room.
  // This controller does not know factorisation or edit the mathematical tree.
  const transformationPreview = createTransformationPreview(document, dom.equation, {
    onConfirm: () => commitFactorisationPreview()
  });

  /* ---------------------------------------------------------------------- *
   * Workspace management. Only one Manipulator is mounted in v1. Its state
   * is transient; the active Document Controller owns committed math/history.
   * Cross-document selection will be a separate future workspace concern.
   * ---------------------------------------------------------------------- */
  // Transient in-app clipboard: no AST or history is modified by copying.
  // It deliberately survives object switches, but not a browser reload in v1.
  let mathematicalClipboard = createClipboardLibrary();

  // The clipboard is session-owned, never document-owned. Rendering is deliberately
  // a projection of the stored snapshots: neither selection nor removal modifies
  // source mathematical objects, their histories, or any saved worksheet.
  // Equality interaction owns menu, arming, and preview DOM. The application
  // retains the mathematical proposal and history commit until the common
  // transformation lifecycle is consolidated in a later increment.
  // Shared, DOM-free, single-use commit gate. Equality is the first feature
  // migrated; other previews retain their existing lifecycles for this release.
  const equalityCommitLifecycle = createTransformationCommitLifecycle();
  // One independent, single-use proposal gate for explicit negation changes.
  // The preview is an ephemeral view; the authoritative AST is untouched.
  const negationCommitLifecycle = createTransformationCommitLifecycle();
  // One semantic feedback channel for compression eligibility. Geometry and
  // DOM targeting live in the interaction adapter; the engine owns validity.
  const negationDragFeedback = createVisualFeedbackController(dom.equation);
  const NEGATION_DRAG_OWNER = 'negation-compression-drop';
  // Candidate DOM is managed by a view-local presentation controller, not by
  // app.js or the Mathematical Engine. Its amber feedback uses the shared
  // semantic Visual Feedback Controller rather than feature-specific CSS.
  const negationPreviewUI = createNegationInlinePreview({
    equation: dom.equation,
    renderCandidate: root => renderExpression(root, {
      displayStyleOverride: state.multiplicationDisplayOverride,
      substitutions: state.substitutions
    }),
    onConfirm: () => confirmNegationPreview(),
    onCancel: () => { cancelNegationPreview(); setStatus('Negation preview cancelled.'); }
  });

  // Both equality and identity transformations use the same source-state contract.
  const transformationSourceStamp = () => ({
    documentId: workspace.activeId,
    objectId: activeDocument()?.activeObjectId ?? null,
    revision: state.history.currentNodeId,
    rootId: state.expressionRoot?.id ?? null,
    fingerprint: JSON.stringify(state.expressionRoot)
  });
  const equalityUI = createEqualityInteractionController({
    document, window, equation: dom.equation,
    getRoot: () => state.expressionRoot,
    onApplySelected: () => openEqualityApplication(activeClipboardEntry(mathematicalClipboard)),
    onConfirm: () => confirmEqualityApplication(),
    onCancel: () => cancelEqualityApplication()
  });
  const closeEqualityMenu = () => equalityUI.closeMenu();
  const paintEqualityArming = () => equalityUI.paintArming();
  const cancelEqualityApplication = () => {
    equalityUI.cancelPreview();
    equalityCommitLifecycle.cancel();
  };

  function openEqualityApplication(entry) {
    if (!equalityUI.arming || state.expressionRoot?.type !== 'Equal' ||
        equalityUI.arming.relationId !== state.expressionRoot.id) return false;
    if (state.groupingMode !== 'normal' || state.factorisationMode !== 'normal' ||
        state.distributionPreview || state.drag || state.factorDrag) return false;
    if (!entry || entry.category !== 'expression') {
      setStatus('Choose a copied expression (not a relation) as the operand.');
      return false;
    }
    const action = equalityFunctionActionRequest({
      relationId: state.expressionRoot.id, context: equalityUI.arming.context,
      clipboardId: entry.clipboardId, documentId: workspace.activeId,
      objectId: activeDocument()?.activeObjectId ?? null,
      revision: state.history.currentNodeId
    });
    if (!action) return false;
    try {
      // All mathematical proposals, including equality application, now
      // pass through the registered transformation coordinator. The clipboard
      // is a session-level service; pass a captured operand as request data
      // rather than making the Engine depend on UI or clipboard storage.
      const candidate = transformationCoordinator.propose(state.expressionRoot, {
        ...action, parameters: { ...action.parameters, operandRoot: entry.root }
      });
      if (!candidate) {
        setStatus('This equality transformation is not mathematically eligible.');
        return false;
      }
      const result = candidate.result;
      const visualDescription = transformationCoordinator.describe(candidate);
      // Preserve a snapshot of the exact operand used; the session clipboard
      // may be cleared, or the original source document edited, before commit.
      // Capture the immutable operand source and the authoritative state stamp
      // at proposal time. The session clipboard may later change independently.
      const proposal = {
        ...candidate,
        clipboardSource: structuredClone(entry.source)
      };
      if (!equalityCommitLifecycle.open(proposal, transformationSourceStamp())) return false;
      // UI controller owns transient DOM and renderer visual roles. It does not
      // receive permission to mutate the Mathematical Object or its history.
      equalityUI.showPreview(result.root, visualDescription, {
        displayStyleOverride: state.multiplicationDisplayOverride
      });
      setStatus('Preview: only the two copied operands are amber. Select amber to confirm, or Cancel.');
      return true;
    } catch (error) { cancelEqualityApplication(); setStatus(`Equality application unavailable: ${error.message}`); return false; }
  }

  const confirmEqualityApplication = () => {
    // Confirm through the common single-use gate. It checks the document,
    // object, branch cursor and complete source tree before the commit callback
    // may touch the Mathematical Object. Presentation cleanup is separate.
    let outcome;
    try {
      outcome = equalityCommitLifecycle.confirm(transformationSourceStamp(), proposal => {
        const { result, action, clipboardSource } = proposal;
        // Build the new root and history on detached data. If patch creation,
        // cloning or provenance serialisation fails, the live Mathematical
        // Object and its history remain untouched. This is the atomic boundary;
        // UI rendering and IndexedDB autosave are intentionally outside it.
        const staged = prepareAtomicTransformationCommit({
          history: state.history, resultRoot: result.root,
          substitutions: state.substitutions,
          actionLabel: 'Applied function to both sides of equality',
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
        // Publish the coherent root/history pair without any fallible history
        // construction between assignments. The UI is single-threaded and
        // synchronous here; no other gesture can observe an intermediate pair.
        publishPreparedTransformation({ state, staged });
        // A failed local save is a durability problem, not a reason to erase a
        // valid mathematical step. Keep the in-memory result and report it.
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) { workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`); }
        }
        renderHistory();
      });
    } catch (error) {
      cancelEqualityApplication();
      setStatus(`Could not commit equality application: ${error.message}`);
      return;
    }
    cancelEqualityApplication();
    if (outcome.status === 'stale') {
      setStatus('The equation changed since preview; please try again.');
    } else if (outcome.status === 'committed') {
      syncExpressionInput();
      renderApplication(false);
      setStatus('Applied the chosen function context to both sides.');
    }
  };

  // The clipboard panel and pointer gesture adapter are presentation-only.
  // Their callbacks resolve a session entry, never an IndexedDB document.
  const clipboardUI = createClipboardPanelController({
    document, window, dom, equation: dom.equation,
    getLibrary: () => mathematicalClipboard,
    setLibrary: next => { mathematicalClipboard = next; },
    getArming: () => equalityUI.arming,
    onApply: entry => openEqualityApplication(entry),
    onStatus: message => setStatus(message)
  });
  const renderClipboard = () => clipboardUI.render();
  renderClipboard();
  const workspace = { documents: new Map(), activeId: null, controller: null,
    openIds: new Set(), dirty: new Set(), saveTimer: null, saveQueue: Promise.resolve() };

  const workspaceStatusGate = createWorkspaceStatusGate();
  function workspaceMessage(message) { dom.workspaceStatus.textContent = message; }
  function activeDocument() { return workspace.controller?.document ?? null; }
  function updateWorkspaceUI() {
    renderWorkspaceNavigation(dom, workspace.documents, workspace.activeId,
      workspace.dirty, activeDocument());
  }
  function renderObjectList() { renderObjectNavigation(dom, activeDocument()); }
  // Rebind the existing single Manipulator to one object's committed state.
  function loadActiveObject() {
    const object = workspace.controller?.activeObject ?? null;
    if (object) {
      reserveNodeIds(object.root);
      object.history.nodes.forEach(node => reserveNodeIds(node.snapshot?.expression));
    }
    state.expressionRoot = object?.root ? cloneExpression(object.root) : null;
    state.history = object?.history ?? createDocumentHistory();
    state.substitutions = { ...(object?.substitutions ?? {}) };
    state.variableDrafts = Object.fromEntries(Object.entries(state.substitutions)
      .map(([key, value]) => [key, String(value)]));
    state.selectedNodeId = null;
    distributionCommitLifecycle.cancel();
    state.distributionPreview = null;
    factorisationCommitLifecycle.cancel();
    state.factorisationMode = 'normal';
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    resetRangeSelection();
    dom.expressionInput.value = state.expressionRoot ? expressionToInput(state.expressionRoot) : '';
    if (state.expressionRoot) renderApplication(false);
    else {
      dom.equation.replaceChildren();
      dom.variablesList.replaceChildren();
      dom.mathJsonOutput.textContent = '';
      dom.swapEqualityButton.hidden = true;
      dom.equalityStatus.hidden = true;
      renderHistory();
    }
    renderObjectList();
  }
  function switchObject(id) {
    if (!workspace.controller || activeDocument().activeObjectId === id) return;
    cancelWorkspaceInteraction();
    workspace.controller.activateObject(id);
    workspace.documents.set(workspace.activeId, activeDocument());
    loadActiveObject();
    updateWorkspaceUI();
    setStatus('Mathematical object opened.');
  }
  function changeObject(operation) {
    if (!workspace.controller) return;
    cancelWorkspaceInteraction();
    operation(workspace.controller);
    workspace.documents.set(workspace.activeId, activeDocument());
    workspace.dirty.add(workspace.activeId);
    loadActiveObject();
    updateWorkspaceUI();
    scheduleSave();
  }

  // Capture only committed state; never serialize pointer geometry or previews.
  function captureActive() {
    if (!workspace.controller) return;
    const doc = workspace.controller.commit(state.expressionRoot, state.history, state.substitutions);
    workspace.documents.set(doc.id, doc);
    workspace.dirty.add(doc.id);
    updateWorkspaceUI();
  }
  function queueSave(doc) {
    // Sequential writes prevent a slow earlier autosave overwriting a newer edit.
    workspace.saveQueue = workspace.saveQueue.catch(() => {}).then(() => documentRepository.save(doc));
    return workspace.saveQueue;
  }
  async function saveDocument(doc) {
    if (!doc) return;
    // Capture the status context BEFORE awaiting the queued IndexedDB write.
    // A save may finish after the user imports or activates another document.
    // It must still finish writing, but must not overwrite the newer status.
    const statusToken = workspaceStatusGate.capture(doc.id);
    try {
      await queueSave(doc);
      if (workspace.documents.get(doc.id) === doc) workspace.dirty.delete(doc.id);
      updateWorkspaceUI();
      if (workspaceStatusGate.isCurrent(statusToken, workspace.activeId)) {
        workspaceMessage(`Saved ${doc.title} locally.`);
      }
    } catch (error) {
      // Retain the dirty marker after a failed write. Report a failure only
      // while the saved document is still the active workspace context.
      if (workspaceStatusGate.isCurrent(statusToken, workspace.activeId)) {
        workspaceMessage(`Save failed: ${error.message}. Export a JSON backup.`);
      }
    }
  }
  function scheduleSave() {
    clearTimeout(workspace.saveTimer);
    workspaceMessage('Unsaved changes — autosave pending.');
    // Capture the committed document snapshot at scheduling time. Never read
    // activeDocument() later inside a timer after the user may have switched.
    const pendingDocument = activeDocument();
    workspace.saveTimer = setTimeout(() => {
      workspace.saveTimer = null;
      void saveDocument(pendingDocument);
    }, 350);
  }
  function cancelWorkspaceInteraction() {
    cancelIdentityTool();
    cancelDrag(false);
    cancelFactorDrag();
    if (state.factorisationMode === 'preview') cancelFactorisationPreview();
    if (state.distributionPreview) cancelDistributionPreview(false);
    state.selectedNodeId = null;
    state.lastClick = null;
    resetRangeSelection();
    hitboxVisibility.clearHover();
  }
  function activateDocument(id) {
    if (!workspace.documents.has(id)) return;
    if (workspace.activeId === id) return;
    clearTimeout(workspace.saveTimer);
    workspace.saveTimer = null;
    // Invalidate asynchronous status messages from the previous document.
    workspaceStatusGate.invalidate();
    if (workspace.controller) {
      cancelWorkspaceInteraction();
      // Existing document is already captured after each committed change.
      if (workspace.dirty.has(workspace.activeId)) void saveDocument(activeDocument());
    }
    workspace.activeId = id;
    workspace.openIds.add(id);
    workspace.controller = createDocumentController(workspace.documents.get(id));
    const doc = activeDocument();
    // All objects retain their own histories, even when not displayed.
    reserveDocumentNodeIds(doc);
    // Legacy one-root wrapper is not used for schema-v2 document collections.
    state.mathematicalDocument = null;
    updateWorkspaceUI();
    loadActiveObject();
    setStatus(state.expressionRoot ? 'Document opened.' : 'Enter an expression or equation to begin.');
  }
  async function createWorkspaceDocument(title) {
    // A newly opened document starts with one empty working object. The v2
    // schema itself also permits genuinely zero-object documents.
    const doc = addObject(newDocument(title), "Object 1");
    workspace.documents.set(doc.id, doc);
    activateDocument(doc.id);
    workspace.dirty.add(doc.id);
    await saveDocument(doc);
  }
  async function deleteActiveDocument() {
    const doc = activeDocument();
    if (!doc || !window.confirm(`Delete “${doc.title}” permanently from this browser?`)) return;
    clearTimeout(workspace.saveTimer);
    cancelWorkspaceInteraction();
    try {
      await workspace.saveQueue.catch(() => {});
      await documentRepository.remove(doc.id);
      workspace.documents.delete(doc.id);
      workspace.dirty.delete(doc.id);
      workspace.openIds.delete(doc.id);
      workspace.activeId = null;
      workspace.controller = null;
      state.mathematicalDocument = null;
      state.expressionRoot = null;
      state.history = createDocumentHistory();
      const next = workspace.documents.keys().next().value;
      if (next) activateDocument(next);
      else updateWorkspaceUI();
      workspaceMessage('Document deleted.');
    } catch (error) { workspaceMessage(`Delete failed: ${error.message}`); }
  }
  function exportActiveDocument() {
    const doc = activeDocument();
    if (!doc) return;
    try {
      // Compact export is a boundary format; the live document retains snapshots.
      const payload = serializeCompactDocument(doc);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${doc.title.replace(/[^a-z0-9_-]+/gi, '_') || 'mathematics'}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      workspaceMessage(`Exported ${doc.title} as compact JSON.`);
    } catch (error) {
      workspaceMessage(`Export failed: ${error.message}`);
    }
  }
  async function importWorkspaceDocument(file) {
    if (!file) return;
    // An import is a new user-visible operation. Pending saves must still
    // persist, but their completion messages may no longer supersede it.
    workspaceStatusGate.invalidate();
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File is too large (10 MB limit).');
      // Fully validate and hydrate before touching storage or the active workspace.
      const doc = deserializeCompactDocument(JSON.parse(await file.text()));
      // A new document identity avoids replacing an existing workspace document.
      // Mathematical object and expression IDs retain their original provenance.
      doc.id = newDocument().id;
      doc.title = `${doc.title} (imported)`;
      // Commit to durable storage before exposing the imported document in memory.
      // A rejected import or failed storage write must not switch the active view.
      await queueSave(doc);
      workspace.documents.set(doc.id, doc);
      activateDocument(doc.id);
      workspaceMessage(`Imported ${doc.title}.`);
    } catch (error) { workspaceMessage(`Import failed: ${error.message}`); }
  }
  async function loadWorkspace() {
    try {
      const docs = await documentRepository.list();
      for (const doc of docs) {
        workspace.documents.set(doc.id, doc);
        reserveDocumentNodeIds(doc);
      }
      updateWorkspaceUI();
      workspaceMessage(docs.length ? `${docs.length} saved document(s) available.` : 'Empty workspace — create a document to begin.');
    } catch (error) { workspaceMessage(`Storage unavailable: ${error.message}. You can still create and export documents.`); }
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
    if (state.expressionRoot) {
      dom.expressionInput.value = expressionToInput(state.expressionRoot);
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
    return {
      expression: cloneExpression(state.expressionRoot),
      substitutions: { ...state.substitutions }
    };
  }

  /* ---------------------------------------------------------------------- *
   * 4. Branching, snapshot-backed event history
   * ---------------------------------------------------------------------- *
   * The core history module owns event construction and graph links. Every
   * commit stores an authoritative snapshot PLUS a versioned replay patch.
   * Previews and hover feedback never create history entries. This adapter
   * handles only editor-specific cleanup and document synchronisation.
   * ---------------------------------------------------------------------- */

  function findHistoryNode(nodeId) {
    return findHistoryState(state.history, nodeId);
  }

  function addHistoryNode(actionLabel, transformation = null, kind = "rule-transform", operation = null) {
    if (state.multiSelection.size()) {
      state.multiSelection.clear();
      state.touchMultiSelectMode = false;
      groupingOverlay.clear();
      factorisationOverlay.clear();
      state.groupingMode = "normal";
      state.groupingPlan = null;
    }
    const node = appendHistoryState(state.history, createStateSnapshot(), {
      actionLabel, transformation, kind, operation
    });
    if (state.mathematicalDocument) {
      updateDocumentRoot(state.mathematicalDocument, state.expressionRoot);
      state.mathematicalDocument.history = state.history;
    }
    factorisationCommitLifecycle.cancel();
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    factorisationOverlay.clear();
    if (workspace.controller) { captureActive(); scheduleSave(); }
    renderHistory();
    return node;
  }

  /** Restore a historical tree snapshot; the next edit branches from it. */
  function restoreHistoryNode(nodeId) {
    const node = findHistoryNode(nodeId);
    if (!node) return;

    cancelDrag(false);
    cancelFactorDrag();
    factorisationCommitLifecycle.cancel();
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    factorisationOverlay.clear();
    distributionCommitLifecycle.cancel();
    state.distributionPreview = null;
    state.expressionRoot = cloneExpression(node.snapshot.expression);
    if (state.mathematicalDocument) updateDocumentRoot(state.mathematicalDocument, state.expressionRoot);
    state.substitutions = { ...node.snapshot.substitutions };
    state.variableDrafts = Object.fromEntries(
      Object.entries(state.substitutions).map(([name, value]) => [name, String(value)])
    );
    state.history.currentNodeId = node.id;
    if (workspace.controller) { captureActive(); scheduleSave(); }
    state.selectedNodeId = null;
    state.lastClick = null;
    resetRangeSelection();

    syncExpressionInput();
    renderApplication();
    setStatus(`Returned to history state: ${node.actionLabel}`);
  }

  /**
   * Render the branching history as nested lists.
   * The same renderer is used in the collapsible drawer and the larger dialog.
   */
  function renderHistoryTreeInto(container, className) {
    container.replaceChildren();
    container.className = `history-tree ${className}`;

    const rootNodes = state.history.nodes.filter((node) => node.parentId === null);
    if (rootNodes.length === 0) {
      const empty = document.createElement("p");
      empty.className = "variable-empty";
      empty.textContent = "No history yet.";
      container.append(empty);
      return;
    }

    const rootList = document.createElement("ul");
    rootList.className = "history-root-list";
    container.append(rootList);

    function appendNode(parentList, historyNode) {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      const action = document.createElement("span");
      const expression = document.createElement("span");

      button.type = "button";
      button.className = "history-node-button";
      button.dataset.historyId = String(historyNode.id);
      button.setAttribute(
        "aria-current",
        String(historyNode.id === state.history.currentNodeId)
      );
      if (historyNode.id === state.history.currentNodeId) button.classList.add("is-current");

      action.className = "history-node-action";
      action.textContent = historyNode.actionLabel;
      expression.className = "history-node-expression";
      expression.textContent = expressionToDisplayString(historyNode.snapshot.expression);

      button.append(action, expression);
      listItem.append(button);
      parentList.append(listItem);

      if (historyNode.children.length > 0) {
        const childList = document.createElement("ul");
        childList.className = "history-children";
        listItem.append(childList);

        historyNode.children.forEach((childId) => {
          const child = findHistoryNode(childId);
          if (child) appendNode(childList, child);
        });
      }
    }

    rootNodes.forEach((root) => appendNode(rootList, root));
  }

  function renderHistory() {
    renderHistoryTreeInto(dom.historyTree, "history-tree--timeline");
    renderHistoryTreeInto(dom.historyGraphTree, "history-tree--graph");

    dom.historyCount.textContent = String(state.history.nodes.length);
    const currentNode = findHistoryNode(state.history.currentNodeId);
    dom.currentHistoryLabel.textContent = currentNode
      ? `Current: ${currentNode.actionLabel}`
      : "No current state";
  }

  /* ---------------------------------------------------------------------- *
   * 5. Expression-tree renderer and MathJSON inspector
   * ---------------------------------------------------------------------- *
   * The DOM renderer receives the expression tree and visual state. It returns
   * fresh HTML elements; it never edits the expression. The FLIP animation in
   * this controller compares old/new positions for nodes with the same IDs.
   * ---------------------------------------------------------------------- */

  /**
   * Create a normal expression DOM for EITHER the committed tree or a proposed
   * tree. The renderer knows layout, but not whether a tree is a preview.
   * This is the extension point for future 2-D operations and preview modes.
   */
  function createEquationElement(root) {
    return renderExpression(root, {
      substitutions: state.substitutions,
      drag: null,
      insertionIndex: null,
      combineTargetId: null,
      combineParentType: null,
      displayStyleOverride: state.multiplicationDisplayOverride,
      selectedNodeId: null,
      distributionHover: null,
      distributionPreview: null
    });
  }

  /* ---------------------------------------------------------------------- *
   * Identity tools: the gesture selects a target; the mathematical module
   * creates the proposed tree. The preview never edits the committed tree.
   * The source hitboxes stay in layout during pointer movement, preventing
   * the preview from creating feedback loops in hit testing.
   * ---------------------------------------------------------------------- */
  const identityVisual = createIdentityToolPreview(dom.equation, createEquationElement);
  const identityFeedback = createIdentityDragFeedback(dom.identityToolbar);
  let identityDrag = null;
  let identityProposal = null;
  let identityPreviewModal = false;

  function cancelIdentityTool() {
    identityDrag = null;
    identityProposal = null;
    identityPreviewModal = false;
    identityVisual.clear();
    identityCommitLifecycle.cancel();
    identityFeedback.stop();
    dom.identityPreviewActions.hidden = true;
  }

  // Feature composition lives outside the browser interaction controller.
  const transformationFeatures = createApplicationTransformationFeatures();
  const transformationCoordinator = createTransformationCoordinator(transformationFeatures);
  // Local aliases minimise changes to the sensitive drag and preview lifecycle.
  // They all refer to the same coordinator; future integrations can use it directly.
  const identityCoordinator = transformationCoordinator;
  const distributionCoordinator = transformationCoordinator;
  const groupingCoordinator = transformationCoordinator;
  const factorisationCoordinator = transformationCoordinator;
  const rearrangementCoordinator = transformationCoordinator;
  // A single-use gate is shared by pointer and keyboard rearrangement. Unlike
  // modal transformations, rearrangement opens and confirms synchronously at drop.
  const rearrangementCommitLifecycle = createTransformationCommitLifecycle();
  // Numeric combination has an immediate drop commit, but still needs the same
  // source-stamped, single-use protection as rearrangement.
  const numericCombinationCommitLifecycle = createTransformationCommitLifecycle();
  // Identity now uses the same single-use, stale-safe gate as equality.
  // Other preview families remain on the legacy coordinator until migrated.
  const identityCommitLifecycle = createTransformationCommitLifecycle();
  // Distribution shares the single-use, stale-safe commit gate with identity and equality.
  const distributionCommitLifecycle = createTransformationCommitLifecycle();
  // Grouping now uses the same source-stamped, single-use gate as other
  // deliberately confirmed transformations. Its blue overlay is unchanged.
  const groupingCommitLifecycle = createTransformationCommitLifecycle();
  // Factorisation now shares the stale-safe, single-use commit gate.
  const factorisationCommitLifecycle = createTransformationCommitLifecycle();

  function getRearrangementCandidate(parentId, parentType, draggedNodeId, destinationIndex) {
    const action = rearrangementActionRequest({ parentId, parentType, draggedNodeId, destinationIndex });
    return action ? rearrangementCoordinator.propose(state.expressionRoot, action) : null;
  }

  /**
   * Rearrangement is visually previewed during the drag, but has no modal
   * confirmation. Prepare a detached mathematical candidate only on drop (or
   * keyboard action), then immediately consume the same source-stamped gate
   * used by the other transformations. Never mutate the live AST to test a
   * reordering: failures in history preparation must leave it untouched.
   *
   * This function intentionally does not render: pointer drop must not replay
   * its already-settled FLIP animation; keyboard callers retain normal render.
   */
  function commitRearrangementCandidate(candidate, { normalise = false } = {}) {
    if (!candidate?.result?.changed || rearrangementCommitLifecycle.isOpen()) return false;
    const parameters = candidate.action.parameters;
    // A pure adapter converts the visual-order proposal into a detached AST.
    // This occurs only on commit, never on every pointer movement.
    const proposal = prepareRearrangementCommitCandidate(state.expressionRoot, candidate, { normalise });
    if (!proposal) return false;
    if (!rearrangementCommitLifecycle.open(proposal, transformationSourceStamp())) return false;
    let outcome;
    try {
      outcome = rearrangementCommitLifecycle.confirm(transformationSourceStamp(), selected => {
        const parentType = parameters.parentType;
        const moved = findNodeById(state.expressionRoot, parameters.draggedNodeId);
        const label = `${parentType === 'Add' ? 'Reordered addend' : 'Reordered factor'} ${expressionToDisplayString(moved)}`;
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: selected.result.root,
          substitutions: state.substitutions,
          actionLabel: label,
          operation: {
            ruleId: selected.action.ruleId, ruleVersion: 1,
            inputs: { parentId: parameters.parentId, destinationIndex: parameters.destinationIndex },
            affectedNodeIds: [parameters.draggedNodeId, parameters.parentId]
          }
        });
        // Publish root and history as one synchronous in-memory transition.
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        renderHistory();
      });
    } catch (error) {
      setStatus(`Rearrangement could not be committed: ${error.message}`);
      return false;
    }
    if (outcome?.status !== 'committed') {
      setStatus('Rearrangement was rejected because its source changed.');
      return false;
    }
    syncExpressionInput();
    return true;
  }

  function identityTargetAt(x, y, operation) {
    return interpretIdentityPointer(dom.equation, document.elementFromPoint(x, y), x, operation);
  }

  function updateIdentityTool(event) {
    if (!identityDrag || identityPreviewModal) return;
    identityFeedback.move(event.clientX, event.clientY);
    const target = identityTargetAt(event.clientX, event.clientY, identityDrag.operation);
    const key = target?.action ? JSON.stringify(target.action) : null;
    // The candidate is mathematical data only. Rendering it while hovering
    // would make the equation jump and compete with stable hit testing.
    if (key !== identityDrag.lastKey) {
      identityDrag.lastKey = key;
      identityProposal = target?.action
        ? identityCoordinator.propose(state.expressionRoot, target.action) : null;
      setStatus(describeIdentityTarget(identityProposal ? target.action.parameters : null));
    }
    identityFeedback.highlight(identityProposal ? target.element : null);
  }

  function confirmIdentityTool() {
    if (!identityPreviewModal || !identityCommitLifecycle.isOpen()) return;
    let outcome;
    try {
      outcome = identityCommitLifecycle.confirm(transformationSourceStamp(), proposal => {
        const result = proposal.result;
        // Prepare a complete history branch on detached data before publishing
        // either half of the authoritative mathematical state. This protects
        // identity insertion from partial history-construction failures.
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: result.root,
          substitutions: state.substitutions,
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
        // No fallible history construction occurs between these assignments.
        // The DOM and persistence are updated only after this synchronous publish.
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        renderHistory();
      });
    } catch (error) {
      cancelIdentityTool();
      setStatus(`Could not commit identity insertion: ${error.message}`);
      return;
    }
    cancelIdentityTool();
    if (outcome.status === 'stale') {
      setStatus('Identity preview is stale; nothing changed.');
      return;
    }
    if (outcome.status !== 'committed') return;
    renderApplication(false);
    setStatus('Identity introduced. The original mathematical objects retain their IDs.');
  }

  dom.identityToolbar.addEventListener('pointerdown', event => {
    const tool = event.target.closest('[data-identity-operation]');
    if (!tool || !state.expressionRoot || state.drag || state.factorDrag ||
        state.distributionPreview || state.groupingMode !== 'normal' ||
        state.factorisationMode !== 'normal' || identityPreviewModal) return;
    event.preventDefault();
    identityDrag = { operation: tool.dataset.identityOperation, pointerId: event.pointerId, lastKey: null };
    identityFeedback.start(identityDrag.operation, event.clientX, event.clientY);
    setStatus(`Drag ${identityDrag.operation === 'Add' ? '+0' : '×1'} onto the left or right half of a term, or onto a matching operator.`);
  });
  window.addEventListener('pointermove', event => {
    if (identityDrag?.pointerId === event.pointerId) updateIdentityTool(event);
  });
  window.addEventListener('pointerup', event => {
    if (!identityDrag || identityDrag.pointerId !== event.pointerId) return;
    updateIdentityTool(event);
    identityDrag = null;
    identityFeedback.stop();
    if (!identityProposal) { cancelIdentityTool(); return; }
    // Only now render the proposed expression, in deliberate modal preview.
    if (!identityCommitLifecycle.open(identityProposal, transformationSourceStamp())) {
      cancelIdentityTool();
      return;
    }
    identityPreviewModal = true;
    // The visual adapter describes the candidate; the existing renderer owns
    // notation and the overlay owns temporary amber highlighting.
    const visual = describeIdentityPreview(identityProposal);
    identityVisual.show({ ...identityProposal.result, identityNodeId: visual.confirmationNodeId });
    identityVisual.setModal();
    dom.identityPreviewActions.hidden = false;
    setStatus('Identity preview: click the amber identity or Confirm to insert; Escape or click elsewhere to cancel.');
  });
  window.addEventListener('pointercancel', event => {
    if (identityDrag?.pointerId === event.pointerId) cancelIdentityTool();
  });
  dom.confirmIdentityButton.addEventListener('click', confirmIdentityTool);
  dom.cancelIdentityButton.addEventListener('click', () => { cancelIdentityTool(); setStatus('Identity preview cancelled.'); });
  // A click on the amber mathematical occurrence is another confirmation path.
  dom.equation.parentElement.addEventListener('click', event => {
    if (identityPreviewModal && event.target.closest('.identity-preview-new')) confirmIdentityTool();
  });
  document.addEventListener('pointerdown', event => {
    if (!identityPreviewModal) return;
    if (event.target.closest('#identityPreviewActions, .identity-preview-new')) return;
    cancelIdentityTool();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  /**
   * A small inline candidate preview. The engine produces the detached AST;
   * this application adapter only presents it and delegates confirmation to
   * the shared history/commit lifecycle. It never edits mathematical nodes.
   */
  function cancelNegationPreview() {
    negationCommitLifecycle.cancel();
    negationPreviewUI.clear();
  }

  function openNegationPreview(ruleId, parameters) {
    if (!state.expressionRoot || negationCommitLifecycle.isOpen()) return;
    const candidate = transformationCoordinator.propose(state.expressionRoot, {
      ruleId, parameters
    });
    if (!candidate?.result?.root ||
        !negationCommitLifecycle.open(candidate, transformationSourceStamp())) return;
    try {
      negationPreviewUI.show(candidate);
    } catch (error) {
      // Never leave a pending proposal if presentation construction fails.
      cancelNegationPreview();
      setStatus(`Negation preview could not be displayed: ${error.message}`);
      return;
    }
    setStatus(describeNegationCandidate(candidate).status);
  }

  function confirmNegationPreview() {
    let outcome;
    try {
      outcome = negationCommitLifecycle.confirm(transformationSourceStamp(), candidate => {
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: candidate.result.root,
          substitutions: state.substitutions,
          actionLabel: candidate.action.ruleId === 'negation.expand'
            ? 'Expanded negation into a factor of -1'
            : 'Compressed -1 into unary negation',
          operation: {
            ruleId: candidate.action.ruleId, ruleVersion: 1,
            affectedNodeIds: candidate.result.affectedNodeIds
          }
        });
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) { workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`); }
        }
      });
    } catch (error) {
      cancelNegationPreview();
      setStatus(`Negation could not be committed: ${error.message}`);
      return;
    }
    cancelNegationPreview();
    if (outcome?.status === 'committed') {
      syncExpressionInput();
      renderApplication(false);
      setStatus('Negation transformation committed.');
    } else setStatus('Negation preview is no longer current; try again.');
  }

  function renderEquation(animate = true) {
    if (negationCommitLifecycle.isOpen()) cancelNegationPreview();
    // A full mathematical rerender invalidates view-local transient gestures.
    // This guard also covers direct renderEquation callers (e.g. display mode),
    // not only the higher-level renderApplication path.
    if (equalityCommitLifecycle.isOpen()) cancelEqualityApplication();
    clipboardUI.cancelDrag();
    if (identityDrag || identityPreviewModal) cancelIdentityTool();
    // Any unrelated rerender (theme, input rebuild, history navigation, etc.)
    // must close the modal candidate first. Otherwise its saved DOM could be
    // restored over a newer expression on a later Cancel click.
    if (state.factorisationMode === "preview") cancelFactorisationPreview();
    const firstRects = new Map();
    const canAnimate = animate && !window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (canAnimate) {
      dom.equation.querySelectorAll("[data-node-id]").forEach((element) => {
        if (element.matches(".add-operand, .factor-slot")) {
          firstRects.set(element.dataset.nodeId, element.getBoundingClientRect());
        }
      });
    }

    // The visible window represents the active mathematical object. This
    // semantic identity is shared with accessibility tooling and browser tests;
    // it does not create a second AST identity or affect hit-testing.
    const windowDocument = activeDocument();
    dom.equation.closest('[data-testid="mathematical-window"]')?.setAttribute(
      'data-object-id', windowDocument?.activeObjectId || '');
    dom.equation.closest('[data-testid="mathematical-window"]')?.setAttribute(
      'data-document-id', windowDocument?.id || '');
    const newTreeElement = renderExpression(state.expressionRoot, {
      substitutions: state.substitutions,
      // A live pointer gesture never rebuilds the equation. Its temporary
      // visual state is applied by dragFeedback.js to the existing DOM.
      drag: null,
      insertionIndex: null,
      combineTargetId: null,
      combineParentType: null,
      displayStyleOverride: state.multiplicationDisplayOverride,
      selectedNodeId: state.selectedNodeId,
      distributionHover: null,
      distributionPreview: state.distributionPreview
    });

    // The renderer returns a detached DOM tree. Mount it before rebinding
    // relation controls, measuring hitboxes, or painting selection overlays.
    // Omitting this step leaves the mathematical model/history updated while
    // the visible equation stays empty (a browser-only integration regression).
    // replaceChildren also discards stale hitboxes from the previous revision.
    dom.equation.replaceChildren(newTreeElement);

    hitboxVisibility.clearHover(); // The old hovered DOM node is about to be detached.
    // Rebind the relation control after every full mathematical render. The
    // controller portals its menu outside the equation clipping viewport.
    equalityUI.mountOnRenderedEquation();


    // Reapply multiple-selection outlines to the NEW DOM after a committed
    // edit/history restore. Pointer hover itself never calls this renderer.
    // Toolbar visibility can affect the vertical position of #equation.
    // Update it BEFORE measuring overlay rectangles, never afterwards.
    updateGroupToolbar();
    updateFactorisationToolbar();
    paintRangeSelection();
    // Draw the overhead curves AFTER layout, since their endpoints are screen
    // coordinates. These SVGs are decorative and never occupy layout space;
    // the amber factor-copy buttons are the actual confirmation targets.
    renderDistributionCurves();
    if (!canAnimate) return;

    // FLIP: animate each surviving mathematical node from its previous screen
    // rectangle to its new one. New or removed nodes have no matching ID and
    // are intentionally not animated by this small layout-transition helper.
    dom.equation.querySelectorAll(".add-operand, .factor-slot").forEach((element) => {
      const first = firstRects.get(element.dataset.nodeId);
      if (!first) return;

      const last = element.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      element.style.transition = "none";
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      element.getBoundingClientRect(); // Force the inverted position to be applied.

      requestAnimationFrame(() => {
        element.style.transition = "";
        element.style.transform = "";
      });
    });
  }

  /**
   * Decorative curved arrows: their tips point at the clickable amber COPIES
   * within the products. SVG has pointer-events:none and is absolutely
   * positioned, so neither the lines nor the arrowheads move the mathematics.
   * The only actual controls are the preview-copy buttons from domRenderer.js.
   */
  function renderDistributionCurves() {
    // Resize/layout changes invalidate old coordinates. Remove the previous
    // drawing before replacing it so we never accumulate overlapping arrows.
    dom.equation.querySelector(".distribution-connections")?.remove();
    if (!state.distributionPreview) return;
    const source = [...dom.equation.querySelectorAll("[data-node-id]")]
      .find((element) => element.dataset.nodeId === state.distributionPreview.sourceFactorId);
    const copies = [...dom.equation.querySelectorAll(".distribution-preview__copy")];
    if (!source || copies.length === 0) return;
    const outer = dom.equation.getBoundingClientRect();
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("distribution-connections");
    svg.setAttribute("viewBox", `0 0 ${Math.max(outer.width, 1)} ${Math.max(outer.height, 1)}`);
    svg.setAttribute("aria-hidden", "true");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "distribution-arrowhead");
    marker.setAttribute("markerWidth", "8");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    const arrow = document.createElementNS(svgNS, "path");
    arrow.setAttribute("d", "M0,0 L6,3 L0,6 Z");
    arrow.setAttribute("fill", "currentColor");
    marker.append(arrow);
    const defs = document.createElementNS(svgNS, "defs");
    defs.append(marker);
    svg.append(defs);

    const sourceRect = source.getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2 - outer.left;
    const sourceY = sourceRect.top - outer.top;
    copies.forEach((copy) => {
      const rect = copy.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - outer.left;
      const y = rect.top - outer.top;
      const apex = Math.max(10, Math.min(sourceY, y) - 56);
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", `M${sourceX},${sourceY - 4} C${sourceX},${apex} ${x},${apex} ${x},${y - 7}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("marker-end", "url(#distribution-arrowhead)");
      svg.append(path);
    });
    dom.equation.append(svg);
  }

  /** Update the optional MathJSON inspector whenever the tree changes. */
  function renderMathJSONInspector() {
    try {
      dom.mathJsonOutput.textContent = mathJSONToString(state.expressionRoot);
    } catch (error) {
      dom.mathJsonOutput.textContent = `MathJSON unavailable: ${error.message}`;
    }
  }

  /* ---------------------------------------------------------------------- *
   * 6. Variable/symbol panel
   * ---------------------------------------------------------------------- *
   * Symbol discovery is recursive: symbols inside a Multiply node, Negate
   * node or future FunctionCall arguments are all found through treeUtils.
   * Values are not written into Symbol nodes; they stay in `substitutions`.
   * ---------------------------------------------------------------------- */

  function renderVariables() {
    const variables = getUniqueSymbolNames(state.expressionRoot);
    dom.variableCount.textContent = String(variables.length);
    dom.variablesList.replaceChildren();

    if (variables.length === 0) {
      const empty = document.createElement("div");
      empty.className = "variable-empty";
      empty.textContent = "No variables in this expression.";
      dom.variablesList.append(empty);
      return;
    }

    variables.forEach((name) => {
      const row = document.createElement("label");
      row.className = "variable-row";

      const variableName = document.createElement("span");
      variableName.className = "variable-name";
      variableName.textContent = name;

      const input = document.createElement("input");
      input.className = "variable-input";
      input.type = "text";
      input.inputMode = "decimal";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "Value";
      input.dataset.variable = name;
      input.setAttribute("aria-label", `Numerical value for ${name}`);

      const draftValue = Object.prototype.hasOwnProperty.call(state.variableDrafts, name)
        ? state.variableDrafts[name]
        : state.substitutions[name] ?? "";
      input.value = draftValue === undefined ? "" : String(draftValue);

      row.append(variableName, input);
      dom.variablesList.append(row);
    });
  }

  function handleVariableDraftInput(event) {
    const input = event.target.closest(".variable-input");
    if (!input) return;
    state.variableDrafts[input.dataset.variable] = input.value.trim();
  }

  /** Apply the current sidebar drafts as the numerical environment. */
  function applyVariableValues() {
    const nextSubstitutions = { ...state.substitutions };

    for (const name of getUniqueSymbolNames(state.expressionRoot)) {
      const rawValue = String(state.variableDrafts[name] ?? "").trim();
      if (rawValue === "") {
        delete nextSubstitutions[name];
        continue;
      }

      // Accept a simple signed decimal/scientific number in the variable panel.
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(rawValue)) {
        setVariableStatus(`The value for ${name} must be a number, for example 2, -3.5 or 1e-3.`);
        return;
      }

      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        setVariableStatus(`The value for ${name} must be finite.`);
        return;
      }
      nextSubstitutions[name] = numericValue;
    }

    if (JSON.stringify(nextSubstitutions) === JSON.stringify(state.substitutions)) {
      setVariableStatus("The variable values are already up to date.");
      return;
    }

    state.substitutions = nextSubstitutions;
    state.variableDrafts = Object.fromEntries(
      Object.entries(nextSubstitutions).map(([name, value]) => [name, String(value)])
    );

    addHistoryNode("Updated variable values", null, "context-edit");
    renderApplication();
    setVariableStatus("Variable values applied. Numerically evaluable terms can now be combined.");
  }

  function clearVariableValues() {
    if (Object.keys(state.substitutions).length === 0) {
      setVariableStatus("There are no applied values to clear.");
      return;
    }

    state.substitutions = {};
    state.variableDrafts = {};
    addHistoryNode("Cleared variable values", null, "context-edit");
    renderApplication();
    setVariableStatus("All variable substitutions have been cleared.");
  }

  /* ---------------------------------------------------------------------- *
   * 7. Expression editing and tree-based operations
   * ---------------------------------------------------------------------- */

  /** Parse a fresh expression and establish it as a new history state. */
  function buildExpression(rawExpression) {
    try {
      if (workspace.controller && !workspace.controller.activeObject) {
        setStatus("Create a mathematical object before entering an expression.");
        return;
      }
      const nextExpression = parseExpression(rawExpression);
      cancelDrag(false);
      cancelFactorDrag();
      state.factorisationMode = "normal";
      state.factorisationPlan = null;
      factorisationOverlay.clear();
      distributionCommitLifecycle.cancel();
      state.distributionPreview = null;
      state.expressionRoot = nextExpression;
      if (!workspace.controller) {
        if (!state.mathematicalDocument) state.mathematicalDocument = createMathematicalDocument(nextExpression);
        else updateDocumentRoot(state.mathematicalDocument, nextExpression);
      }
      state.selectedNodeId = null;
      resetRangeSelection();

      // Preserve substitutions only for symbols that still occur in the tree.
      const activeVariables = new Set(getUniqueSymbolNames(state.expressionRoot));
      state.substitutions = Object.fromEntries(
        Object.entries(state.substitutions).filter(([name]) => activeVariables.has(name))
      );
      state.variableDrafts = Object.fromEntries(
        Object.entries(state.substitutions).map(([name, value]) => [name, String(value)])
      );

      syncExpressionInput();
      addHistoryNode(`Built mathematical object: ${expressionToDisplayString(state.expressionRoot)}`, null, "free-edit");
      renderApplication();
      setStatus("Nested expression built. Drag siblings within the same sum or product; click a hitbox to add/remove explicit brackets.");
      return true;
    } catch (error) {
      setStatus(error.message);
      return false;
    }
  }

  /**
   * Numerical combination is immediate (no modal preview), but the entire
   * mathematical rewrite and history event are prepared on detached data.
   * Do not remove the dragged operand from the live AST before confirmation.
   * The same rule used for green hover eligibility is rechecked on drop.
   */
  function commitNumericCombination(targetId, drag) {
    if (numericCombinationCommitLifecycle.isOpen()) return false;
    const parent = findNodeById(state.expressionRoot, drag.parentId);
    const action = {
      ruleId: parent?.type === 'Add' ? 'addition.combine-numeric' :
        parent?.type === 'Multiply' ? 'multiplication.combine-numeric' : '',
      parameters: { parentId: drag.parentId, movingNodeId: drag.item.id,
        targetNodeId: targetId, substitutions: state.substitutions }
    };
    // Numeric combination is now dispatched through the same registered
    // mathematical capability as other transformations. It remains an
    // immediate gesture, with no extra modal confirmation or preview.
    const proposal = transformationCoordinator.propose(state.expressionRoot, action);
    if (proposal) proposal.actionLabel = proposal.result.actionLabel;
    if (!proposal || !numericCombinationCommitLifecycle.open(proposal, transformationSourceStamp())) return false;
    let outcome;
    try {
      outcome = numericCombinationCommitLifecycle.confirm(transformationSourceStamp(), selected => {
        const { parentId, movingNodeId, targetNodeId } = selected.action.parameters;
        const staged = prepareAtomicTransformationCommit({
          history: state.history, resultRoot: selected.result.root,
          substitutions: state.substitutions, actionLabel: selected.actionLabel,
          operation: { ruleId: selected.action.ruleId, ruleVersion: 1,
            inputs: { parentId, movingNodeId, targetNodeId },
            affectedNodeIds: [parentId, movingNodeId, targetNodeId] }
        });
        // Publish only after history preparation succeeds. Autosave failure
        // must not undo mathematically valid work already committed in memory.
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        state.selectedNodeId = null;
        renderHistory();
        syncExpressionInput();
        setStatus(`${selected.actionLabel}. Saved in history.`);
      });
    } catch (error) {
      setStatus(`Numerical combination could not be committed: ${error.message}`);
      return false;
    }
    return outcome?.status === 'committed';
  }

  /* ---------------------------------------------------------------------- *
   * 7a. Transient distribution proposals and confirmation
   * ---------------------------------------------------------------------- *
   * A distribution drop must NOT call commitNumericCombination(). Only a plus
   * sign whose Add is an adjacent factor of the active Multiply is eligible.
   * The preview is UI state, not a transformed tree or a history snapshot.
   * Clicking any temporary amber factor commits exactly ONE atomic rewrite; clicking
   * elsewhere or Escape discards the preview without changing a single ID.
   * ---------------------------------------------------------------------- */

  function cancelDistributionPreview(showMessage = true) {
    if (!state.distributionPreview) return;
    distributionCommitLifecycle.cancel();
    state.distributionPreview = null;
    renderEquation(false);
    if (showMessage) setStatus("Distribution preview dismissed. The expression was not changed.");
  }

  function openDistributionPreview(plan) {
    const action = distributionActionRequest(plan);
    const candidate = action ? distributionCoordinator.propose(state.expressionRoot, action) : null;
    if (!candidate) return;
    // Distribution's registry proposal identifies a verified plan, not yet a
    // resulting AST. Materialize the candidate ONCE before opening the shared
    // gate; the source AST and history remain authoritative and untouched.
    // The distribution rule rewrites its supplied tree in place. Never pass the
    // live Mathematical Object into speculative preview construction.
    const rewritten = applyDistribution(structuredClone(state.expressionRoot), candidate.result.plan);
    if (!rewritten) return;
    const proposal = {
      result: { root: normaliseWithRules(rewritten.root), provenance: rewritten.provenance,
        plan: candidate.result.plan },
      action
    };
    if (!distributionCommitLifecycle.open(proposal, transformationSourceStamp())) return;
    const visual = describeDistributionPreview(candidate);
    const source = findNodeById(state.expressionRoot, visual.sourceNodeId);
    if (!source) { distributionCommitLifecycle.cancel(); return; }
    // The preview renderer still receives the original, stable hitboxes and
    // the verified plan. It does not mount the proposed AST until confirmation.
    state.distributionPreview = {
      ...candidate.result.plan,
      sourceText: expressionToDisplayString(source)
    };
    state.selectedNodeId = null;
    renderEquation(false);
    setStatus(`Amber preview: ${visual.direction} distribution. Click any highlighted factor copy to expand, or click elsewhere / press Escape to cancel.`);
  }

  /**
   * Commit a distribution proposal using the SAME shared safety boundary as
   * equality application and identity insertion. The gate consumes a proposal
   * before invoking this callback, preventing reentrant or repeated commits.
   * History construction happens on detached data, so an exception cannot
   * leave the live expression updated without a matching history node.
   */
  function commitDistributionPreview() {
    const plan = state.distributionPreview;
    if (!plan || !distributionCommitLifecycle.isOpen()) return;
    const original = dom.equation.querySelector(`[data-node-id="${plan.sourceFactorId}"]`);
    const originalRect = original?.getBoundingClientRect();
    let committedProvenance = null;
    let outcome;
    try {
      outcome = distributionCommitLifecycle.confirm(transformationSourceStamp(), proposal => {
        const result = proposal.result;
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: result.root,
          substitutions: state.substitutions,
          actionLabel: `Applied ${plan.direction} distribution`,
          transformation: result.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: `distribution.${plan.direction}`, ruleVersion: 1,
            inputs: { direction: plan.direction, sumId: plan.sumId ?? null },
            affectedNodeIds: [plan.sourceFactorId, plan.sumId].filter(Boolean)
          }
        });
        // Publish the coherent pair synchronously, then update the document
        // and attempt persistence. Autosave failure does not undo valid maths.
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        committedProvenance = result.provenance;
        renderHistory();
      });
    } catch (error) {
      state.distributionPreview = null;
      renderEquation(false);
      setStatus(`Could not commit distribution: ${error.message}`);
      return;
    }
    state.distributionPreview = null;
    if (outcome.status !== 'committed') {
      renderEquation(false);
      setStatus('The proposed expansion is no longer available; nothing changed.');
      return;
    }
    state.selectedNodeId = null;
    syncExpressionInput();
    renderApplication();
    animateDistributedCopies(originalRect, committedProvenance);
    setStatus(`Applied ${plan.direction} distribution. Newly copied factors and their source IDs are recorded in history.`);
  }

  /**
   * Animate only freshly created factor occurrences, not the surviving
   * addends. The fallback without Web Animations API is an instant rewrite.
   * This never affects the mathematical result or its history entry.
   */
  function animateDistributedCopies(from, provenance) {
    if (!from || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const ids = provenance.copiesBySourceId[provenance.sourceFactorId] || [];
    const fromX = from.left + from.width / 2;
    const fromY = from.top + from.height / 2;
    ids.forEach((id) => {
      const element = dom.equation.querySelector(`[data-node-id="${id}"]`);
      if (!element || typeof element.animate !== "function") return;
      const to = element.getBoundingClientRect();
      element.animate([
        { transform: `translate(${fromX - to.left - to.width / 2}px, ${fromY - to.top - to.height / 2}px) scale(.85)`, opacity: .3 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 }
      ], { duration: 450, easing: "cubic-bezier(.2,.7,.1,1)" });
    });
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

  function positionDragGhost(clientX, clientY) {
    if (!state.drag?.ghost) return;
    const x = clientX - state.drag.offsetX;
    const y = clientY - state.drag.offsetY;
    // The ghost is an exact-size representation of the source occurrence.
    // Scaling a deeply nested Group magnifies its already-large hitbox and
    // makes the mathematical window appear to expand during pickup.
    state.drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  /**
   * Build the hit-test snapshot from the unchanged DOM. This is called once
   * on pointerdown and only again when scrolling/resizing changes coordinates.
   * The rule modules are queried HERE, not inside hitTesting.js; the latter
   * deals only with rectangles and has no knowledge of the distributive law.
   */
  function makeDragGeometry(drag) {
    const parent = findNodeById(state.expressionRoot, drag.parentId);
    const eligibleSums = [];
    drag.plansBySumId = new Map();
    if (parent?.type === "Multiply") {
      for (const factor of parent.operands) {
        if (factor.id === drag.item.id) continue;
        const sum = unwrapGroupedSum(factor);
        if (!sum) continue;
        const plan = getDistributionPlan(parent, drag.item.id, sum.id);
        if (plan) {
          drag.plansBySumId.set(sum.id, plan);
          eligibleSums.push(sum.id);
        }
      }
    }
    return captureDragGeometry(
      dom.equation, drag.parentId, drag.parentType, drag.item.id, eligibleSums
    );
  }

  /**
   * Hover decisions consult exactly the same canCombine*() functions used by
   * the operation modules. Hit-testing knows nothing about 0, 1 or matrices.
   */
  function canCombineDraggedSibling(targetId) {
    const drag = state.drag;
    if (!drag) return false;
    const parent = findNodeById(state.expressionRoot, drag.parentId);
    const target = parent?.operands.find((child) => child.id === targetId);
    if (!target) return false;
    return parent.type === "Add"
      ? canCombineAddends(target, drag.item, state.substitutions)
      : parent.type === "Multiply"
        ? canCombineFactors(target, drag.item, state.substitutions)
        : false;
  }

  /**
   * Clicking creates a selection; movement beyond six pixels creates a drag.
   * A ghost is prepared on pointerdown but stays invisible for an ordinary
   * click. Keeping the source in place avoids every layout shift on pickup.
   */
  function startDrag(event, hitbox) {
    if (event.button !== 0 || state.drag || state.factorDrag || state.distributionPreview ||
        state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    const nodeId = hitbox.dataset.nodeId;
    const location = findNodeLocation(state.expressionRoot, nodeId);
    if (!location?.parent || !["Add", "Multiply"].includes(location.parent.type)) return;

    event.preventDefault();
    const rect = hitbox.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    // The decorative ghost must never intercept elementFromPoint() drop
    // targeting, especially the thin bracket region of a nested Group.
    ghost.style.pointerEvents = "none";
    // Dragging a Group moves the visual brackets too. Its clone stays outside
    // #equation, is aria-hidden and cannot itself become a drop target.
    const visualClone = hitbox.cloneNode(true);
    visualClone.removeAttribute("tabindex");
    // A compound hitbox contains focusable nested hitboxes. Disable those in
    // the decorative clone, otherwise keyboard Tab could focus invisible
    // duplicate controls while the user is dragging.
    visualClone.querySelectorAll('[tabindex], button').forEach((child) => {
      child.setAttribute('tabindex', '-1');
    });
    visualClone.setAttribute("aria-hidden", "true");
    // Freeze the clone to the measured source box. A cloned compound term has
    // width:max-content in the ordinary renderer; without an explicit width
    // it can remeasure itself outside the expression's flex context and grow
    // dramatically with nested Group nodes. The ghost is presentation only.
    visualClone.style.boxSizing = 'border-box';
    visualClone.style.width = `${rect.width}px`;
    visualClone.style.height = `${rect.height}px`;
    visualClone.style.minWidth = '0';
    visualClone.style.maxWidth = 'none';
    visualClone.style.flex = 'none';
    ghost.append(visualClone);
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.visibility = "hidden";
    document.body.append(ghost);

    state.drag = {
      item: location.node,
      parentId: location.parent.id,
      parentType: location.parent.type,
      startIndex: location.index,
      originalOrder: location.parent.operands.map((child) => child.id),
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      ghost,
      sourceElement: hitbox,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      moved: false,
      activeTarget: { kind: "none" },
      // Requested target can differ from an animation that has not finished.
      // Only activeTarget is allowed to commit on pointerup.
      requestedTarget: { kind: "none" },
      invalidTarget: false,
      distributionPlan: null
    };
    state.drag.geometry = makeDragGeometry(state.drag);
    positionDragGhost(event.clientX, event.clientY);
  }

  /** Clear temporary UI only; never touch the mathematical expression. */
  function clearDragState() {
    negationDragFeedback.clear(NEGATION_DRAG_OWNER);
    dragFeedback.stop();
    state.drag?.ghost?.remove();
    state.drag = null;
    dom.body.classList.remove("is-dragging");
  }

  function isInsideEquation(clientX, clientY) {
    const rect = dom.equation.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom;
  }

  /**
   * Commit only after the final drop target is revalidated. In contrast with
   * the old implementation, the live moving node is never spliced out first.
   */
  function commitDraggedCombination(targetId, drag) {
    const parent = findNodeById(state.expressionRoot, drag.parentId);
    if (!parent || parent.operands[drag.startIndex]?.id !== drag.item.id ||
        !canCombineDraggedSibling(targetId)) return false;
    return commitNumericCombination(targetId, drag);
  }

  /**
   * Finalize the drag. Cancel, click, reorder, combine and distribute are
   * separate exits, and NONE of them rely on undoing a temporary tree edit.
   */
  function finishDrag(commit) {
    if (!state.drag) return;
    const drag = state.drag;
    const target = drag.activeTarget || { kind: "none" };

    if (commit && !drag.moved) {
      if (drag.pointerType === "touch") {
        const id = drag.item.id;
        clearDragState();
        selectTouchNode(id);
        return;
      }
      const now = Date.now();
      const doubleClick = state.lastClick?.nodeId === drag.item.id &&
        now - state.lastClick.time < 370;
      state.lastClick = doubleClick ? null : { nodeId: drag.item.id, time: now };
      state.selectedNodeId = drag.item.id;
      state.multiSelection.clear();
      groupingOverlay.clear();
      clearDragState();
      if (doubleClick) toggleSelectedGroup();
      else {
        renderApplication();
        setStatus(`Selected ${expressionToDisplayString(drag.item)}. Use the bracket toolbar or double-click to toggle round brackets.`);
      }
      return;
    }

    if (commit && target.kind === "distribution" && drag.distributionPlan) {
      const plan = drag.distributionPlan;
      clearDragState();
      openDistributionPreview(plan);
      return;
    }

    if (commit && target.kind === "negation-compress") {
      // A drop is never trusted solely because it was green during hover.
      // Re-resolve the mathematical candidate against the live AST. The
      // preview/commit gate will additionally check the document revision.
      const sourceId = drag.item.id;
      const targetId = target.id;
      clearDragState();
      openNegationPreview('negation.compress', { minusOneId: sourceId, targetNodeId: targetId });
      return;
    }

    if (commit && target.kind === "combine") {
      const succeeded = commitDraggedCombination(target.id, drag);
      clearDragState();
      if (!succeeded) setStatus("That combination is no longer valid; nothing changed.");
      renderApplication();
      return;
    }

    if (commit && target.kind === "insert") {
      // The same action validated during hover is rechecked against the live
      // mathematical object at drop. Never trust a stale visual insertion.
      const parent = findNodeById(state.expressionRoot, drag.parentId);
      const candidate = getRearrangementCandidate(drag.parentId, parent?.type, drag.item.id, target.index);
      const committed = commitRearrangementCandidate(candidate, { normalise: true });
      if (committed) setStatus("Rearrangement saved in history.");
      else if (candidate && !candidate.result.changed) setStatus("The expression stayed in its original order.");
      else setStatus("Reordering is not permitted or the source changed; nothing was committed.");
      clearDragState();
      // The student has ALREADY watched the proposed order settle in the
      // rearrangement preview. A second FLIP animation after pointerup would
      // replay the very same move and make the successful drop feel unstable.
      // Render the committed order immediately, without an additional motion.
      // This is intentionally specific to POINTER rearrangement: keyboard
      // moves and other transformations may still benefit from FLIP.
      renderApplication(false);
      return;
    }

    // Invalid hitbox, outside drop, or Escape: the tree and its IDs have not
    // changed, so cancellation needs NO render or mathematical normalization.
    clearDragState();
    if (commit && target.kind === "invalid") {
      setStatus("No rule applies to that hitbox. The expression is unchanged.");
    } else {
      setStatus("Move cancelled. The expression is unchanged.");
    }
  }

  function cancelDrag(showMessage = true) {
    if (!state.drag) return;
    clearDragState();
    if (showMessage) setStatus("Move cancelled. The expression is unchanged.");
  }

  /**
   * Pointer moves DO NOT call renderEquation(): no replaceChildren(), FLIP,
   * tree mutation, or moving 43px drop-slot is permitted here. The only
   * changes are the ghost's fixed transform and simple feedback CSS classes.
   * An insertion also rearranges an INERT visual clone of the sequence,
   * showing the actual prospective order (including operators). Neither the
   * real DOM geometry nor the mathematical expression tree is modified.
   */
  function updateDragTarget(event) {
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.lastClientX = event.clientX;
    drag.lastClientY = event.clientY;
    positionDragGhost(event.clientX, event.clientY);
    const distance = Math.hypot(event.clientX - drag.startClientX,
      event.clientY - drag.startClientY);
    if (distance < 6 && !drag.moved) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghost.style.visibility = "visible";
      dragFeedback.start(drag.sourceElement, drag.ghost);
      dom.body.classList.add("is-dragging");
    }

    // During a finished blue preview, aim at the VISIBLE arrangement first.
    // Its rectangles were captured AFTER animation completion, never from a
    // moving frame. Outside that image, revert to the original stable layout
    // so that green combination and amber distribution remain available.
    let next = event.previewJustSettled && drag.requestedTarget
      ? drag.requestedTarget
      : hitTestVisibleInsertion(dragFeedback.visualGeometry(),
        event.clientX, event.clientY, canCombineDraggedSibling, drag.geometry)
        || hitTestDrag(drag.geometry, event.clientX, event.clientY,
          canCombineDraggedSibling, drag.activeTarget);

    // A blue rearrangement preview temporarily has no settled rectangles
    // while it animates. In that short interval the ORIGINAL hitboxes can
    // suggest the old index (or an invalid target) under exactly the same
    // stationary pointer. Do not interpret that as a request to undo the
    // preview: keep ownership of the last requested insertion until the
    // transition settles and the visible geometry can make the next decision.
    //
    // We deliberately do NOT retain the proposal when the cursor has left
    // the expression or reached an explicit green/amber target. This avoids
    // sticky drag behaviour and keeps cancellation/other rules responsive.
    next = retainInsertionDuringTransition({
      phase: dragFeedback.rearrangementPhase(),
      previous: drag.requestedTarget,
      candidate: next,
      startIndex: drag.startIndex,
      containerRect: drag.geometry?.containerRect,
      x: event.clientX,
      y: event.clientY
    });

    // The geometry modules can SUGGEST an insertion, but mathematical rules
    // must independently authorise it, including noncommutative products.
    if (next.kind === "insert" && next.index !== drag.startIndex) {
      const parent = findNodeById(state.expressionRoot, drag.parentId);
      const candidate = getRearrangementCandidate(drag.parentId, parent?.type, drag.item.id, next.index);
      // The semantic descriptor is intentionally presentation-only; the
      // existing stable drag renderer still owns all DOM/animation work.
      const feedback = describeRearrangementFeedback(candidate);
      const allowed = Boolean(feedback);
      if (!allowed) next = { kind: "invalid", id: `reorder-${next.index}` };
    }
    // A Number(-1) dropped onto a Symbol or explicit Group can expose a
    // compact Negate node. This intention is resolved from the exact nested
    // DOM target (bracket vs numeral), not the enclosing sibling rectangle.
    // Ordinary number-on-number combination retains its existing priority.
    const compression = resolveNegationCompressionTarget({
      equation: dom.equation, root: state.expressionRoot,
      sourceId: drag.item.id, parentId: drag.parentId,
      x: event.clientX, y: event.clientY
    });
    if (compression && transformationCoordinator.propose(state.expressionRoot, {
      ruleId: 'negation.compress',
      parameters: { minusOneId: drag.item.id, targetNodeId: compression.nodeId }
    })) {
      next = { kind: 'negation-compress', id: compression.nodeId };
      negationDragFeedback.show(NEGATION_DRAG_OWNER,
        [{ element: compression.element, role: 'eligible', hint: 'Release to negate' }]);
    } else {
      negationDragFeedback.clear(NEGATION_DRAG_OWNER);
    }
    drag.requestedTarget = next;
    // The feedback module reports what is VISUALLY SETTLED, not merely what
    // was queued during a transition. Rapid mouseup can therefore never
    // commit a rearrangement that was not shown to the student.
    const previous = drag.activeTarget;
    const effective = dragFeedback.show(next, drag.geometry);
    drag.activeTarget = effective;
    drag.distributionPlan = effective.kind === "distribution"
      ? drag.plansBySumId.get(effective.id) || null : null;
    drag.invalidTarget = effective.kind === "invalid";

    if (effective.kind === "negation-compress" &&
        (previous.kind !== effective.kind || previous.id !== effective.id)) {
      setStatus('Release to negate this expression using the factor -1.');
    } else if (effective.kind === "distribution" &&
        (previous.kind !== effective.kind || previous.id !== effective.id)) {
      setStatus(`Release on + to preview ${drag.distributionPlan.direction} distribution. Yellow means a rule, not numeric evaluation.`);
    } else if (effective.kind === "invalid" &&
        (previous.kind !== effective.kind || previous.id !== effective.id)) {
      setStatus("No rule applies to that hitbox. Use a gap to reorder, or a plus sign to distribute.");
    }

  }

  /**
   * Screen coordinates (unlike expression IDs) change on scroll or resize.
   * Refresh the cached rectangles in those cases, then re-evaluate the last
   * pointer position. Hysteresis remains disabled in hitTesting.js.
   */
  function refreshDragGeometry() {
    if (!state.drag) return;
    // Previous highlighted DOM targets may no longer be in the same place.
    // Clear their painting before deriving the new target from new rectangles.
    negationDragFeedback.clear(NEGATION_DRAG_OWNER);
    dragFeedback.show({ kind: "none" }, state.drag.geometry);
    state.drag.geometry = makeDragGeometry(state.drag);
    state.drag.activeTarget = { kind: "none" };
    state.drag.requestedTarget = { kind: "none" };
    if (state.drag.moved) {
      updateDragTarget({
        pointerId: state.drag.pointerId,
        clientX: state.drag.lastClientX,
        clientY: state.drag.lastClientY
      });
    }
  }

  /* ---------------------------------------------------------------------- *
   * 9. Keyboard reordering
   * ---------------------------------------------------------------------- *
   * Arrow keys follow the same tree operation as dragging. A factor can only
   * move among factors in its immediate Multiply parent; an addend can only
   * move among addends in its immediate Add parent, at any nesting depth.
   * ---------------------------------------------------------------------- */

  function moveNodeWithKeyboard(nodeId, direction, sourceElement) {
    const location = findNodeLocation(state.expressionRoot, nodeId);
    if (!location?.parent) return;

    const destinationIndex = location.index + direction;
    if (destinationIndex < 0 || destinationIndex >= location.parent.operands.length) return;

    const movedNode = location.node;
    const candidate = getRearrangementCandidate(location.parent.id, location.parent.type, nodeId, destinationIndex);
    if (!commitRearrangementCandidate(candidate)) return;
    renderApplication();

    const movedElement = dom.equation.querySelector(
      `.add-operand[data-node-id="${nodeId}"], .factor-slot[data-node-id="${nodeId}"]`
    );
    if (movedElement) movedElement.focus();
    else if (sourceElement) sourceElement.focus();
  }

  /* ---------------------------------------------------------------------- *
   * 10. Multiplication display preference
   * ---------------------------------------------------------------------- *
   * This setting affects only rendering. Each Multiply node retains the style
   * with which it was entered, so choosing "As entered" can restore the
   * original per-product appearance at any time.
   * ---------------------------------------------------------------------- */

  function applyMultiplicationDisplayMode(mode) {
    state.multiplicationDisplayOverride = normaliseMultiplicationMode(mode);
    renderEquation();
  }
  function applyTheme(theme) {
    applyThemePreference(dom, state, theme, window.localStorage);
  }

  /* ---------------------------------------------------------------------- *
   * 12. Full application rendering
   * ---------------------------------------------------------------------- */

  /**
   * Refresh all application panels after a committed change.
   * `animateEquation` only controls the optional FLIP transition; it never
   * changes mathematical state, hit testing, history, or node identities.
   * Pointer reorders pass false because their preview has already animated
   * the destination. Other callers retain the existing animated default.
   */
  function renderApplication(animateEquation = true) {
    if (equalityCommitLifecycle.isOpen()) cancelEqualityApplication();
    renderEquation(animateEquation);
    renderVariables();
    renderHistory();
    renderMathJSONInspector();
    // Truth is a derived view of the current relation and assignments, never
    // a permanent field on the Equal node or an extra history event.
    const isEqual = state.expressionRoot?.type === "Equal";
    dom.swapEqualityButton.hidden = !isEqual;
    dom.equalityStatus.hidden = !isEqual;
    if (isEqual) {
      const result = evaluateEquality(state.expressionRoot, state.substitutions);
      dom.equalityStatus.textContent = result.status.toUpperCase();
      dom.equalityStatus.dataset.truth = result.status;
      dom.equation.querySelector(".equality-sign")?.setAttribute("data-truth", result.status);
    }
  }

  /* ---------------------------------------------------------------------- *
   * 12a. Explicit bracket insertion and removal
   * ---------------------------------------------------------------------- *
   * Group nodes wrap one subtree; creating/removing them is its own history
   * operation. A selected Group can be wrapped AGAIN to form ((a+b)).
   * Removing a Group never invokes distribution or deletes a mathematical
   * operation. If Add remains within Multiply, mandatory parentheses remain.
   * ---------------------------------------------------------------------- */

  /* ---------------------------------------------------------------------- *
   * 12b. Persistent multi-selection and deliberate range grouping
   * ---------------------------------------------------------------------- *
   * Selection is NOT a rewrite: no history entry, no tree mutation, no DOM
   * reconstruction. The mathematical module alone decides whether adjacent
   * selected siblings may be regrouped using associativity.
   *
   * Preview mode locks competing drags. The explicit brackets and envelope
   * are temporary graphics until a deliberate confirmation; clicking outside
   * cancels the proposal but retains the selection for easy reconsideration.
   * ---------------------------------------------------------------------- */

  function rangePlan() {
    return getRangeGroupingPlan(state.expressionRoot, state.multiSelection.ids());
  }

  /** A factor selection is eligible independently of the range-grouping rule. */
  function factorPlan() {
    // Two independent questions: is extraction mathematically valid, and
    // has the student established an acceptable visual scope? Never put the
    // latter restriction inside factorisation.js.
    const mathematicalPlan = getFactorisationPlan(state.expressionRoot, state.multiSelection.ids());
    return checkFactorisationTeachingPolicy(state.expressionRoot, mathematicalPlan).allowed
      ? mathematicalPlan : null;
  }

  function updateFactorisationToolbar() {
    const plan = factorPlan();
    dom.factorisationToolbar.hidden = !plan && state.factorisationMode !== "preview";
    dom.previewFactorisationButton.hidden = state.factorisationMode === "preview";
    dom.previewFactorisationButton.disabled = !plan;
    dom.previewFactorisationButton.textContent = plan
      ? `Preview ${plan.direction} extraction` : "Preview extraction";
    dom.factorisationPreviewActions.hidden = state.factorisationMode !== "preview";
  }

  /**
   * Open a modal preview of the COMPLETE factorised expression.
   *
   * 1. Validate the current factor selection.
   * 2. Build an independent proposed tree with its final node IDs/provenance.
   * 3. Let the normal renderer lay out that candidate in #equation.
   * 4. Show a brief old-to-new provenance animation above the new layout.
   *
   * The committed tree and history remain unchanged until confirmation.
   * This avoids squeezing a floating extracted factor into neighbouring terms.
   */
  function enterFactorisationPreview() {
    if (state.drag || state.factorDrag || state.distributionPreview ||
        state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    const plan = factorPlan();
    const action = factorisationActionRequest(plan);
    const candidate = action ? factorisationCoordinator.propose(state.expressionRoot, action) : null;
    if (!candidate || !factorisationCommitLifecycle.open(candidate, transformationSourceStamp())) return;
    const proposal = candidate.result.proposal;
    const visual = describeFactorisationPreview(candidate);
    if (!visual) { factorisationCommitLifecycle.cancel(); return; }
    const proposedElement = createEquationElement(proposal.root);
    state.factorisationPlan = plan;
    state.factorisationProposal = proposal;
    state.factorisationMode = "preview";
    updateFactorisationToolbar();
    factorisationOverlay.clear(); // Remove the small extraction-zone button.

    const opened = transformationPreview.show({
      candidateElement: proposedElement,
      sourceNodeIds: visual.sourceNodeIds,
      resultNodeId: visual.resultNodeId,
      inlineExtraction: { scopeNodeId: visual.scopeNodeId, direction: visual.direction }
    });
    if (!opened) {
      factorisationCommitLifecycle.cancel();
      state.factorisationMode = "normal";
      state.factorisationPlan = null;
      state.factorisationProposal = null;
      updateFactorisationToolbar();
      paintRangeSelection();
      setStatus("Could not display the factorisation preview; the expression was not changed.");
      return;
    }
    transformationPreview.confirmationElement?.focus({ preventScroll: true });
    setStatus("Factorisation preview: faded factors and persistent arrows show their extraction. Click the new amber factor or Confirm; Escape / click elsewhere cancels.");
  }

  function cancelFactorisationPreview() {
    if (state.factorisationMode !== "preview") return;
    // Restores the SAME DOM objects, not just an equivalent re-render.
    transformationPreview.cancel();
    factorisationCommitLifecycle.cancel();
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    updateFactorisationToolbar();
    paintRangeSelection(); // Restore selected source outlines and extraction zone.
    setStatus("Factorisation preview cancelled; original expression, IDs and selection are unchanged.");
  }

  /**
   * Confirm a factorisation through the same source-stamped, single-use gate
   * used by equality application, identity insertion and distribution.
   *
   * The original factorisation plan is revalidated against the authoritative
   * tree and the current teaching scope. History is constructed on detached
   * data before the coherent root/history pair is published. The renderer's
   * provenance animation remains entirely presentation-owned.
   */
  function commitFactorisationPreview() {
    if (state.factorisationMode !== "preview" || !factorisationCommitLifecycle.isOpen()) return;
    let outcome;
    try {
      outcome = factorisationCommitLifecycle.confirm(transformationSourceStamp(), candidate => {
        const proposal = candidate.result.proposal;
        const original = candidate.result.plan;
        const current = getFactorisationPlan(state.expressionRoot,
          candidate.action.parameters.sourceFactorIds);
        // A changed selection, scope or direction must never be silently
        // interpreted as another mathematical operation at confirmation.
        if (!proposal || !original || !current ||
            !checkFactorisationTeachingPolicy(state.expressionRoot, current).allowed ||
            current.direction !== original.direction || current.sumId !== original.sumId ||
            current.groupId !== original.groupId ||
            current.productIds.join('|') !== original.productIds.join('|') ||
            current.sourceFactorIds.join('|') !== original.sourceFactorIds.join('|')) {
          throw new Error('Factorisation is no longer mathematically eligible.');
        }
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: proposal.root,
          substitutions: state.substitutions,
          actionLabel: 'Extracted common factor',
          transformation: proposal.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: `factorisation.${original.direction}`, ruleVersion: 1,
            inputs: { direction: original.direction, scopeNodeId: original.scopeNodeId },
            affectedNodeIds: original.sourceFactorIds
          }
        });
        // No fallible history preparation takes place between these two
        // assignments. Presentation and local storage are updated afterwards.
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        state.selectedNodeId = proposal.extractedFactorId;
        renderHistory();
      });
    } catch (error) {
      // The gate consumes the proposal before invoking the callback. Even
      // after an exception the student cannot accidentally confirm it twice.
      transformationPreview.cancel();
      state.factorisationMode = 'normal';
      state.factorisationPlan = null;
      state.factorisationProposal = null;
      updateFactorisationToolbar();
      paintRangeSelection();
      setStatus(`Could not commit factorisation: ${error.message}`);
      return;
    }
    if (outcome.status !== 'committed') {
      // A stale proposal must restore the original DOM and leave history alone.
      transformationPreview.cancel();
      state.factorisationMode = 'normal';
      state.factorisationPlan = null;
      state.factorisationProposal = null;
      updateFactorisationToolbar();
      paintRangeSelection();
      setStatus('Factorisation proposal expired; no mathematical change was committed.');
      return;
    }
    transformationPreview.finish();
    state.factorisationMode = 'normal';
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    factorisationOverlay.clear();
    syncExpressionInput();
    renderApplication();
    setStatus('Common factor extracted. History records which original factors contributed to the new factor.');
  }

  /**
   * Special drag for an ALREADY SELECTED factor. It is separate from ordinary
   * rearrangement: only the amber extraction zone is a valid destination.
   * The mathematical tree, hitboxes, and history remain stationary.
   */
  function startFactorDrag(event,hitbox) {
    const plan = factorPlan();
    if (!plan || !plan.sourceFactorIds.includes(hitbox.dataset.nodeId)) return false;
    event.preventDefault();
    const rect = hitbox.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    // The decorative ghost must never intercept elementFromPoint() drop
    // targeting, especially the thin bracket region of a nested Group.
    ghost.style.pointerEvents = "none";
    const copy = hitbox.cloneNode(true);
    copy.setAttribute("aria-hidden","true");
    copy.removeAttribute("tabindex");
    copy.querySelectorAll("[tabindex],button").forEach(el => el.setAttribute("tabindex","-1"));
    // Match the source's measured geometry, including deeply nested Groups.
    copy.style.boxSizing = 'border-box';
    copy.style.width = `${rect.width}px`;
    copy.style.height = `${rect.height}px`;
    copy.style.minWidth = '0';
    copy.style.flex = 'none';
    ghost.append(copy);
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.visibility = "hidden";
    document.body.append(ghost);
    state.factorDrag = {
      pointerId:event.pointerId, sourceId:hitbox.dataset.nodeId,
      ghost, startX:event.clientX, startY:event.clientY,
      offsetX:event.clientX-rect.left, offsetY:event.clientY-rect.top,
      moved:false
    };
    return true;
  }

  function updateFactorDrag(event) {
    const drag = state.factorDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY);
    if (!drag.moved && distance < 6) return;
    drag.moved = true;
    drag.ghost.style.visibility = "visible";
    drag.ghost.style.transform = `translate3d(${event.clientX-drag.offsetX}px, ${event.clientY-drag.offsetY}px, 0)`;
    factorisationOverlay.highlightZone(factorisationOverlay.isInsideZone(event.clientX,event.clientY));
  }

  function cancelFactorDrag() {
    if (!state.factorDrag) return;
    state.factorDrag.ghost.remove();
    state.factorDrag = null;
    factorisationOverlay.highlightZone(false);
  }

  function finishFactorDrag(event,commit) {
    const drag = state.factorDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const shouldPreview = commit && drag.moved &&
      factorisationOverlay.isInsideZone(event.clientX,event.clientY);
    cancelFactorDrag();
    if (shouldPreview) enterFactorisationPreview();
  }

  function paintRangeSelection() {
    const selected = new Set(state.multiSelection.ids());
    dom.equation.querySelectorAll(".add-operand[data-node-id], .factor-slot[data-node-id]")
      .forEach((element) => {
        element.classList.toggle("is-multi-selected", selected.has(element.dataset.nodeId));
      });
    if (state.groupingMode === "preview") groupingOverlay.refresh();
    else groupingOverlay.setSelection(rangePlan()?.operandIds || []);
    if (state.factorisationMode === "preview") { /* Candidate DOM is modal; no extraction-zone overlay. */ }
    else {
      const plan = factorPlan();
      factorisationOverlay.setPlan(plan, plan
        ? expressionToDisplayString(findNodeById(state.expressionRoot,plan.sourceFactorIds[0])) : "");
    }
  }

  function resetRangeSelection() {
    groupingCommitLifecycle.cancel();
    state.multiSelection.clear();
    state.touchMultiSelectMode = false;
    state.groupingMode = "normal";
    state.groupingPlan = null;
    groupingOverlay.clear();
    factorisationOverlay.clear();
    // Clearing a selection is purely visual and must not rebuild the equation.
    dom.equation.querySelectorAll(".is-multi-selected").forEach((element) => {
      element.classList.remove("is-multi-selected");
    });
    updateGroupToolbar();
    updateFactorisationToolbar();
  }

  function toggleRangeSelection(nodeId) {
    if (state.groupingMode !== "normal") return;
    state.multiSelection.toggle(state.expressionRoot, nodeId);
    if (!state.multiSelection.size()) state.touchMultiSelectMode = false;
    state.selectedNodeId = null;
    state.lastClick = null;
    // Clear the old single-node outline without rendering.
    dom.equation.querySelectorAll(".is-selected").forEach((element) => {
      element.classList.remove("is-selected");
    });
    updateGroupToolbar();
    updateFactorisationToolbar();
    paintRangeSelection();
    const plan = rangePlan();
    const extraction = factorPlan();
    setStatus(extraction
      ? `Matching ${extraction.direction} factors selected. Drag one into the amber extraction zone, or choose Preview extraction.`
      : plan
        ? "Adjacent operands selected. Click the thin blue envelope or Preview grouping."
        : "Selection updated. Nonadjacent nodes remain selectable; grouping needs adjacent siblings, extraction needs matching end-factors.");
  }

  function enterRangeGroupingPreview() {
    if (state.drag || state.distributionPreview || state.groupingMode !== "normal") return;
    const plan = rangePlan();
    const action = groupingActionRequest(plan, dom.groupStyle.value);
    const candidate = action ? groupingCoordinator.propose(state.expressionRoot, action) : null;
    if (!candidate || !groupingCommitLifecycle.open(candidate, transformationSourceStamp())) return;
    const visual = describeGroupingPreview(candidate);
    state.groupingPlan = candidate.result.plan;
    state.groupingMode = "preview";
    groupingOverlay.enterPreview(visual.bracketStyle);
    updateGroupToolbar();
    // Keyboard confirmation works even when a blue overlay spans many rows.
    dom.confirmRangeGroupButton.focus({ preventScroll: true });
    setStatus("Grouping preview: click the blue bracketed region or Confirm. Click elsewhere or press Escape to cancel.");
  }

  function cancelRangeGroupingPreview() {
    if (state.groupingMode !== "preview") return;
    groupingCommitLifecycle.cancel();
    state.groupingMode = "normal";
    state.groupingPlan = null;
    groupingOverlay.setSelection(rangePlan()?.operandIds || []);
    updateGroupToolbar();
    setStatus("Grouping preview cancelled. Your selected operands are unchanged.");
  }

  /**
   * Confirm a blue range-grouping preview through the shared single-use gate.
   * The registered Engine proposal already contains a detached grouped AST.
   * Only after the source stamp and exact sibling-range plan are rechecked do
   * we prepare history on a detached graph and publish root/history together.
   * This preserves selected operand identities and never commits on cancel.
   */
  function commitRangeGrouping() {
    if (state.groupingMode !== 'preview' || !groupingCommitLifecycle.isOpen()) return;
    let outcome;
    try {
      outcome = groupingCommitLifecycle.confirm(transformationSourceStamp(), candidate => {
        const parameters = candidate.action.parameters;
        const current = getRangeGroupingPlan(state.expressionRoot, parameters.operandIds);
        const original = candidate.result.plan;
        if (!current || !original || current.parentId !== original.parentId ||
            current.parentType !== original.parentType ||
            current.operandIds.join('|') !== original.operandIds.join('|') ||
            current.operandIds.join('|') !== state.groupingPlan?.operandIds.join('|')) {
          throw new Error('Grouping is no longer mathematically eligible.');
        }
        const staged = prepareAtomicTransformationCommit({
          history: state.history,
          resultRoot: candidate.result.root,
          substitutions: state.substitutions,
          actionLabel: `Grouped ${original.count} adjacent ${original.parentType === 'Add' ? 'addends' : 'factors'}`,
          transformation: candidate.result.provenance,
          kind: 'rule-transform',
          operation: {
            ruleId: 'grouping.range', ruleVersion: 1,
            inputs: { bracketStyle: parameters.bracketStyle, parentId: original.parentId },
            affectedNodeIds: original.operandIds
          }
        });
        publishPreparedTransformation({ state, staged });
        if (workspace.controller) {
          try { captureActive(); scheduleSave(); }
          catch (error) {
            workspaceMessage(`Work is in memory but could not be saved: ${error.message}. Export a JSON backup.`);
          }
        }
        state.selectedNodeId = candidate.result.groupId;
        renderHistory();
      });
    } catch (error) {
      groupingCommitLifecycle.cancel();
      state.groupingMode = 'normal';
      state.groupingPlan = null;
      groupingOverlay.clear();
      updateGroupToolbar();
      paintRangeSelection();
      setStatus(`Could not commit grouping: ${error.message}`);
      return;
    }
    if (outcome.status !== 'committed') {
      groupingCommitLifecycle.cancel();
      state.groupingMode = 'normal';
      state.groupingPlan = null;
      groupingOverlay.clear();
      updateGroupToolbar();
      paintRangeSelection();
      setStatus('The grouping proposal is stale; nothing changed.');
      return;
    }
    state.groupingMode = 'normal';
    state.groupingPlan = null;
    state.multiSelection.clear();
    state.touchMultiSelectMode = false;
    groupingOverlay.clear();
    state.lastClick = null;
    syncExpressionInput();
    renderApplication();
    setStatus('Added explicit brackets to the selected range; original operand IDs were preserved.');
  }

  function updateGroupToolbar() {
    const count = state.multiSelection.size();
    const plan = rangePlan();
    const selected = state.selectedNodeId
      ? findNodeById(state.expressionRoot, state.selectedNodeId) : null;
    if (state.factorisationMode === "preview") {
      dom.selectionLabel.textContent = "Factorisation preview — confirm or cancel";
    } else if (state.groupingMode === "preview") {
      dom.selectionLabel.textContent = `Grouping preview: ${plan?.count || 0} operands`;
    } else if (count > 0) {
      dom.selectionLabel.textContent = plan
        ? `${count} adjacent operands selected — grouping available`
        : `${count} selected — grouping requires adjacent siblings and associativity`;
    } else {
      dom.selectionLabel.textContent = selected
        ? `Selected: ${expressionToDisplayString(selected)}`
        : "Select a term; Ctrl/Cmd+click for multiple selection.";
    }
    dom.wrapGroupButton.textContent = count > 0 ? "Preview grouping" : "Wrap selection";
    dom.wrapGroupButton.disabled = state.groupingMode === "preview" || state.factorisationMode === "preview" || (count > 0 ? !plan : !selected);
    dom.removeGroupButton.disabled = state.groupingMode === "preview" || state.factorisationMode === "preview" || count > 0 || selected?.type !== "Group";
    dom.groupingPreviewActions.hidden = state.groupingMode !== "preview";
    // A single AST node or the whole root can be copied. A multi-selection
    // with several disjoint nodes is not a single mathematical subtree.
    // Keep this explicit rather than inventing implicit addition or grouping.
    dom.copyMathButton.disabled = !state.expressionRoot || count > 1 ||
      state.groupingMode !== 'normal' || state.factorisationMode !== 'normal' ||
      Boolean(state.distributionPreview);
    dom.multiSelectButton.setAttribute("aria-pressed", String(state.touchMultiSelectMode));
    dom.multiSelectButton.classList.toggle("is-active", state.touchMultiSelectMode);
  }

  function addGroupToSelection(style = dom.groupStyle.value) {
    if (state.multiSelection.size() > 0) {
      enterRangeGroupingPreview();
      return;
    }
    if (!state.selectedNodeId || state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    const group = wrapNodeInGroup(state.expressionRoot, state.selectedNodeId, style);
    if (!group) return;
    state.selectedNodeId = group.id;
    state.lastClick = null;
    state.expressionRoot = normaliseWithRules(state.expressionRoot);
    addHistoryNode(`Added ${style} brackets`);
    syncExpressionInput();
    renderApplication();
    setStatus(`Added ${style} brackets around the selected expression.`);
  }

  function removeSelectedGroup() {
    if (!state.selectedNodeId || state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    const replacement = removeGroup(state.expressionRoot, state.selectedNodeId);
    if (!replacement) return;
    state.selectedNodeId = replacement.id;
    state.lastClick = null;
    state.expressionRoot = normaliseWithRules(state.expressionRoot);
    addHistoryNode("Removed one explicit bracket pair");
    syncExpressionInput();
    renderApplication();
    setStatus("Removed one explicit pair. Mandatory precedence brackets remain if required.");
  }

  function toggleSelectedGroup() {
    const node = findNodeById(state.expressionRoot, state.selectedNodeId);
    if (node?.type === "Group") removeSelectedGroup();
    else addGroupToSelection("round");
  }

  /* ---------------------------------------------------------------------- *
   * 13. Event listeners
   * ---------------------------------------------------------------------- */

  // Prefer the factor hitbox when one is nested inside an outer product/addend.
  // Capturing phase: Ctrl/Cmd+click is selection, NEVER a drag pickup.
  // In grouping preview mode, an outside pointerdown cancels AND consumes the
  // gesture; it cannot simultaneously start an unrelated mathematical action.
  let suppressOutsidePreviewClick = false;
  document.addEventListener("click", (event) => {
    if (!suppressOutsidePreviewClick) return;
    suppressOutsidePreviewClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  // Touch taps share the existing ID-based selection model with Ctrl/Cmd+click.
  // A completed drag is handled by the drag lifecycle, never as a selection tap.
  let touchTap = null;
  function selectTouchNode(nodeId) {
    if (state.touchMultiSelectMode) {
      toggleRangeSelection(nodeId);
      return;
    }
    if (state.selectedNodeId === nodeId) {
      state.touchMultiSelectMode = true;
      state.multiSelection.replace(state.expressionRoot, nodeId);
      state.selectedNodeId = null;
      state.lastClick = null;
      dom.equation.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
      paintRangeSelection();
      updateGroupToolbar();
      updateFactorisationToolbar();
      setStatus("Multiple selection: tap terms to add or remove; tap empty space to clear.");
    } else {
      state.selectedNodeId = nodeId;
      state.lastClick = null;
      renderApplication();
    }
  }
  dom.multiSelectButton.addEventListener("click", () => {
    if (state.touchMultiSelectMode) { resetRangeSelection(); return; }
    if (state.groupingMode !== "normal" || state.factorisationMode !== "normal" || state.distributionPreview) return;
    state.touchMultiSelectMode = true;
    if (state.selectedNodeId) state.multiSelection.replace(state.expressionRoot, state.selectedNodeId);
    state.selectedNodeId = null;
    state.lastClick = null;
    dom.equation.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected"));
    paintRangeSelection();
    updateGroupToolbar();
    updateFactorisationToolbar();
    setStatus("Multiple selection: tap terms to toggle; tap empty space to clear.");
  });

  document.addEventListener("pointerdown", (event) => {
    if (identityDrag || identityPreviewModal) return;
    if (state.factorisationMode === "preview") {
      if (event.target.closest?.(".transformation-preview__confirm, #factorisationPreviewActions")) return;
      cancelFactorisationPreview();
      suppressOutsidePreviewClick = true;
      window.setTimeout(() => { suppressOutsidePreviewClick = false; }, 700);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (state.groupingMode === "preview") {
      if (event.target.closest(".grouping-envelope--preview, #groupingPreviewActions, #groupStyle")) return;
      cancelRangeGroupingPreview();
      // Prevent this SAME click from activating an unrelated toolbar control
      // after the pointerdown has cancelled preview mode. Without this guard,
      // clicking "Wrap selection" could cancel and instantly reopen preview.
      suppressOutsidePreviewClick = true;
      window.setTimeout(() => { suppressOutsidePreviewClick = false; }, 700);
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (state.drag || state.factorDrag || state.distributionPreview) return;
    const hitbox = event.target.closest?.(".factor-slot, .add-operand, .nested-occurrence");
    if (event.pointerType === "touch" && dom.equation.contains(event.target) &&
        state.groupingMode === "normal" && state.factorisationMode === "normal") {
      touchTap = { pointerId: event.pointerId, nodeId: hitbox?.dataset.nodeId ?? null,
        x: event.clientX, y: event.clientY, moved: false };
      // In multi-select mode, suppress pickup so taps cannot initiate a drag.
      if (state.touchMultiSelectMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    if (hitbox && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleRangeSelection(hitbox.dataset.nodeId);
      return;
    }
    // A selected factor is a legitimate pickup for factor extraction. Do NOT
    // clear the multi-selection on its pointerdown: otherwise factorisation
    // could never be initiated by dragging one of the selected factors.
    const selectedFactorPickup = hitbox && factorPlan()?.sourceFactorIds.includes(hitbox.dataset.nodeId);
    if (state.touchMultiSelectMode && !hitbox && !event.target.closest?.(".group-toolbar, .factorisation-toolbar, .grouping-envelope__edge")) {
      resetRangeSelection();
      return;
    }
    if (state.multiSelection.size() && !state.touchMultiSelectMode && !event.ctrlKey && !event.metaKey &&
        !selectedFactorPickup &&
        !event.target.closest?.(".grouping-envelope__edge, .group-toolbar, .factorisation-zone, .factorisation-toolbar")) {
      resetRangeSelection();
    }
  }, true);

  // Operator glyphs are not draggable occurrences. A deliberate click on the
  // compact minus sign asks the Engine for an explicit -1 factor instead.
  dom.equation.addEventListener('pointerdown', event => {
    if (event.target.closest('.negate-operator-hitbox')) event.stopImmediatePropagation();
  });
  dom.equation.addEventListener('click', event => {
    const operator = event.target.closest('.negate-operator-hitbox');
    if (!operator || !dom.equation.contains(operator)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNegationPreview('negation.expand', { negateNodeId: operator.dataset.operatorOwnerId });
  });
  dom.equation.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    const operator = event.target.closest('.negate-operator-hitbox');
    if (!operator) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNegationPreview('negation.expand', { negateNodeId: operator.dataset.operatorOwnerId });
  });

  dom.equation.addEventListener("pointerdown", (event) => {
    // While previewing, the amber copies are buttons, not draggable terms.
    // Other clicks cancel the preview; only an intentional copy click commits.
    if (identityDrag || identityPreviewModal || state.distributionPreview || state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    if (event.ctrlKey || event.metaKey || (event.pointerType === "touch" && state.touchMultiSelectMode)) return;
    if (event.target.closest("[data-distribution-confirm]")) return;
    // A nested occurrence is an independent mathematical target, not an
    // Add/Multiply sibling. Do not pick up its outer draggable ancestor: that
    // used to make a click on the inner Number select/drag the outer Group.
    // Mouse selection is handled by the click listener below; touch retains
    // the existing pointerup tap/multi-select controller.
    if (event.target.closest('.nested-occurrence[data-node-id]')) return;
    let hitbox = event.target.closest(".factor-slot, .add-operand");
    // Alt+click reaches the enclosing level when hitboxes are nested.
    if (event.altKey && hitbox) {
      hitbox = hitbox.parentElement.closest(".factor-slot, .add-operand") || hitbox;
    }
    if (hitbox) {
      if (state.multiSelection.has(hitbox.dataset.nodeId) && startFactorDrag(event,hitbox)) return;
      startDrag(event, hitbox);
    }
  });

  // A Group's immediate child can now be a separately addressable Number,
  // Symbol or Group. Pointer clicks select that exact occurrence instead of
  // being promoted to its enclosing draggable Group. Bracket clicks continue
  // to select the enclosing Group because the brackets sit outside the child.
  // Do not modify AST/history: this is strictly selection interaction state.
  dom.equation.addEventListener('click', (event) => {
    if (event.detail === 0 || event.pointerType === 'touch' ||
        event.ctrlKey || event.metaKey || state.touchMultiSelectMode || state.drag || state.factorDrag ||
        state.distributionPreview || state.groupingMode !== 'normal' ||
        state.factorisationMode !== 'normal') return;
    const nested = event.target.closest('.nested-occurrence[data-node-id]');
    if (!nested || !dom.equation.contains(nested)) return;
    event.stopPropagation();
    state.selectedNodeId = nested.dataset.nodeId;
    state.lastClick = null;
    renderApplication();
  });

  // Only the innermost hitbox receives the transient hover outline.
  // Drag/preview modes retain their own green, amber and selection feedback.
  dom.equation.addEventListener('pointermove', (event) => {
    hitboxVisibility.updateFromTarget(event.target,
      !state.drag && !state.factorDrag && !state.distributionPreview &&
      state.groupingMode === 'normal' && state.factorisationMode === 'normal');
  });
  dom.equation.addEventListener('pointerover', (event) => {
    hitboxVisibility.updateFromTarget(event.target,
      !state.drag && !state.factorDrag && !state.distributionPreview &&
      state.groupingMode === 'normal' && state.factorisationMode === 'normal');
  });
  dom.equation.addEventListener('pointerleave', () => hitboxVisibility.clearHover());
  dom.hitboxVisibilityMode.addEventListener('change', () => {
    saveHitboxPreference(hitboxVisibility.setMode(dom.hitboxVisibilityMode.value));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && negationCommitLifecycle.isOpen()) {
      cancelNegationPreview();
      setStatus('Negation preview cancelled.');
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (touchTap?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - touchTap.x, event.clientY - touchTap.y) > 8) touchTap.moved = true;
    if (identityDrag || identityPreviewModal) return;
    if (state.factorDrag) updateFactorDrag(event);
    else updateDragTarget(event);
  });
  window.addEventListener("resize", () => {
    refreshDragGeometry();
    if (state.distributionPreview) renderDistributionCurves();
    groupingOverlay.refresh();
    if (state.factorisationMode === "preview") transformationPreview.clearTransition();
    else factorisationOverlay.refresh();
  });
  // A capturing scroll listener also notices scrolling of nested panels.
  window.addEventListener("scroll", refreshDragGeometry, true);
  window.addEventListener("scroll", () => {
    groupingOverlay.refresh();
    if (state.factorisationMode === "preview") transformationPreview.clearTransition();
    else factorisationOverlay.refresh();
  }, true);
  // A lost tab/window must not leave a floating ghost or stale drag session.
  window.addEventListener("blur", () => { cancelDrag(false); cancelFactorDrag(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelDrag(false); cancelFactorDrag(); }
  });

  window.addEventListener("pointerup", (event) => {
    if (touchTap?.pointerId === event.pointerId) {
      const tap = touchTap;
      touchTap = null;
      if (!tap.moved && !state.drag && !state.factorDrag && !identityDrag && !identityPreviewModal &&
          !state.distributionPreview && state.groupingMode === "normal" && state.factorisationMode === "normal") {
        if (tap.nodeId) selectTouchNode(tap.nodeId);
        else if (state.touchMultiSelectMode || state.multiSelection.size()) resetRangeSelection();
        else if (!tap.nodeId && state.selectedNodeId) { state.selectedNodeId = null; renderApplication(); }
        return;
      }
    }
    if (identityDrag || identityPreviewModal) return;
    if (state.factorDrag) { finishFactorDrag(event,true); return; }
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    // Take one final reading at the release coordinates. Some devices deliver
    // a pointerup without a final pointermove event at the same position.
    updateDragTarget(event);
    // The displayed preview can extend beyond the original equation bounds.
    // Accept releases on the visible, settled destination as well.
    finishDrag(isInsideEquation(event.clientX, event.clientY) ||
      (state.drag?.activeTarget?.kind === "insert" &&
        dragFeedback.isPointInPreview(event.clientX, event.clientY)));
  });

  window.addEventListener("pointercancel", (event) => {
    if (touchTap?.pointerId === event.pointerId) touchTap = null;
    if (state.factorDrag) { finishFactorDrag(event,false); return; }
    if (state.drag && event.pointerId === state.drag.pointerId) finishDrag(false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (identityDrag || identityPreviewModal) cancelIdentityTool();
    else if (state.factorisationMode === "preview") cancelFactorisationPreview();
    else if (state.factorDrag) cancelFactorDrag();
    else if (state.groupingMode === "preview") cancelRangeGroupingPreview();
    else if (state.drag) cancelDrag();
    else if (state.distributionPreview) cancelDistributionPreview();
    else if (state.multiSelection.size()) resetRangeSelection();
  });

  // A click on any AMBER COPY commits once. Pointerdown on any other target
  // (including the equation itself) cancels the preview with no history entry.
  // The confirm marker lives on the button, so its click won't be cancelled.
  document.addEventListener("pointerdown", (event) => {
    if (!state.distributionPreview) return;
    if (event.target.closest("[data-distribution-confirm]")) return;
    cancelDistributionPreview();
  });
  dom.equation.addEventListener("click", (event) => {
    if (event.target.closest("[data-distribution-confirm]")) {
      event.preventDefault();
      commitDistributionPreview();
    }
  });

  dom.equation.addEventListener("keydown", (event) => {
    // Preview mode is modal for mathematical interactions, including keyboard
    // reordering and keyboard-triggered distribution, not only pointer drags.
    if (state.groupingMode !== "normal" || state.factorisationMode !== "normal") {
      event.preventDefault();
      return;
    }
    // A temporary copy is a native button. Let Enter and Space activate it
    // normally; otherwise this editor's hitbox keyboard handler could catch
    // the bubbling event and select a parent Group instead of confirming.
    if (event.target.closest("[data-distribution-confirm]")) return;
    const hitbox = event.target.closest(".factor-slot, .add-operand, .nested-occurrence");
    if (!hitbox) return;
    // Accessible equivalent of Ctrl/Cmd+click for keyboard-only students.
    if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleRangeSelection(hitbox.dataset.nodeId);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      state.selectedNodeId = hitbox.dataset.nodeId;
      renderEquation(false);
      return;
    }
    // Keyboard alternative to a precise pointer drop: focus a factor and
    // press D if exactly one adjacent factor contains a sum.
    if (event.key.toLowerCase() === "d") {
      const location = findNodeLocation(state.expressionRoot, hitbox.dataset.nodeId);
      if (location?.parent?.type !== "Multiply") return;
      const candidates = [location.index - 1, location.index + 1]
        .filter((index) => index >= 0 && index < location.parent.operands.length)
        .map((index) => unwrapGroupedSum(location.parent.operands[index]))
        .filter(Boolean)
        .map((sum) => getDistributionPlan(location.parent, location.node.id, sum.id))
        .filter(Boolean);
      if (candidates.length === 1) {
        event.preventDefault();
        openDistributionPreview(candidates[0]);
      } else if (candidates.length > 1) {
        setStatus("Two neighbouring sums are available; drag the factor to the + sign of the intended sum.");
      }
      return;
    }
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    moveNodeWithKeyboard(hitbox.dataset.nodeId, event.key === "ArrowLeft" ? -1 : 1, hitbox);
  });

  dom.previewFactorisationButton.addEventListener("click", enterFactorisationPreview);
  dom.confirmFactorisationButton.addEventListener("click", commitFactorisationPreview);
  dom.cancelFactorisationButton.addEventListener("click", cancelFactorisationPreview);
  dom.wrapGroupButton.addEventListener("click", () => addGroupToSelection());
  dom.confirmRangeGroupButton.addEventListener("click", commitRangeGrouping);
  dom.cancelRangeGroupButton.addEventListener("click", cancelRangeGroupingPreview);
  dom.groupStyle.addEventListener("change", () => {
    if (state.groupingMode === "preview") {
      // The previewed bracket style is part of the action request. Reopen
      // the proposal so the visible brackets and committed style agree.
      groupingCommitLifecycle.cancel();
      state.groupingMode = "normal";
      state.groupingPlan = null;
      enterRangeGroupingPreview();
    }
  });
  dom.removeGroupButton.addEventListener("click", removeSelectedGroup);

  dom.copyMathButton.addEventListener('click', () => {
    if (!state.expressionRoot || state.groupingMode !== 'normal' ||
        state.factorisationMode !== 'normal' || state.distributionPreview) return;
    const ids = state.multiSelection.ids();
    if (ids.length > 1) {
      setStatus('Copy one mathematical subtree at a time; select one node or clear the selection to copy the whole object.');
      return;
    }
    try {
      const captured = captureMathematicalClipboard(
        state.expressionRoot, ids[0] ?? state.selectedNodeId ?? null,
        { documentId: workspace.activeId, objectId: activeDocument()?.activeObjectId ?? null }
      );
      mathematicalClipboard = appendClipboardEntry(mathematicalClipboard, captured);
      renderClipboard();
      setStatus('Selection remembered in the session clipboard.');
    } catch (error) { setStatus(`Copy failed: ${error.message}`); }
  });

  dom.objectNew.addEventListener('click', () => {
    const title = window.prompt('Name the mathematical object:', `Object ${(activeDocument()?.objectOrder.length ?? 0) + 1}`);
    if (title !== null) changeObject(controller => controller.addObject(title));
  });
  dom.objectList.addEventListener('click', event => {
    const button = event.target.closest('[data-object-id]');
    if (button) switchObject(button.dataset.objectId);
  });
  dom.objectRename.addEventListener('click', () => {
    const object = workspace.controller?.activeObject;
    if (!object) return;
    const title = window.prompt('Rename mathematical object:', object.title);
    if (title !== null) changeObject(controller => controller.renameObject(object.id, title));
  });
  dom.objectDelete.addEventListener('click', () => {
    const object = workspace.controller?.activeObject;
    if (!object || !window.confirm(`Delete mathematical object “${object.title}”?`)) return;
    changeObject(controller => controller.removeObject(object.id));
  });
  dom.workspaceNew.addEventListener('click', () => {
    const title = window.prompt('Name the new mathematical document:', 'Untitled');
    if (title !== null) void createWorkspaceDocument(title);
  });
  dom.workspaceList.addEventListener('click', event => {
    const button = event.target.closest('[data-document-id]');
    if (button) activateDocument(button.dataset.documentId);
  });
  dom.workspaceSave.addEventListener('click', () => { clearTimeout(workspace.saveTimer); void saveDocument(activeDocument()); });
  dom.workspaceRename.addEventListener('click', () => {
    const doc = activeDocument(); if (!doc) return;
    const title = window.prompt('Rename document:', doc.title);
    if (!title?.trim()) return;
    workspace.controller.rename(title);
    workspace.documents.set(doc.id, activeDocument());
    workspace.dirty.add(doc.id);
    updateWorkspaceUI(); scheduleSave();
  });
  dom.workspaceDuplicate.addEventListener('click', () => {
    const doc = activeDocument(); if (!doc) return;
    const duplicate = duplicateDocument(doc);
    workspace.documents.set(duplicate.id, duplicate);
    activateDocument(duplicate.id);
    workspace.dirty.add(duplicate.id);
    void saveDocument(duplicate);
  });
  dom.workspaceClose.addEventListener('click', () => {
    if (!workspace.activeId) return;
    const old = workspace.activeId;
    cancelWorkspaceInteraction();
    if (workspace.dirty.has(old)) void saveDocument(activeDocument());
    workspace.openIds.delete(old);
    workspace.activeId = null; workspace.controller = null;
    state.expressionRoot = null; state.mathematicalDocument = null;
    const next = [...workspace.openIds].find(id => workspace.documents.has(id));
    if (next) activateDocument(next); else updateWorkspaceUI();
    workspaceMessage('Document closed (not deleted).');
  });
  dom.workspaceDelete.addEventListener('click', () => void deleteActiveDocument());
  dom.workspaceExport.addEventListener('click', exportActiveDocument);
  dom.workspaceImport.addEventListener('change', event => {
    void importWorkspaceDocument(event.target.files?.[0]); event.target.value = '';
  });

  dom.expressionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    buildExpression(dom.expressionInput.value);
  });

  dom.resetButton.addEventListener("click", () => {
    dom.expressionInput.value = DEFAULT_EXPRESSION;
    buildExpression(DEFAULT_EXPRESSION);
  });

  dom.variablesList.addEventListener("input", handleVariableDraftInput);
  dom.applyValuesButton.addEventListener("click", applyVariableValues);
  dom.clearValuesButton.addEventListener("click", clearVariableValues);

  dom.multiplicationDisplayMode.addEventListener("change", () => {
    applyMultiplicationDisplayMode(dom.multiplicationDisplayMode.value);
  });

  dom.historyToggle.addEventListener("click", () => {
    const isExpanded = dom.historyToggle.getAttribute("aria-expanded") === "true";
    dom.historyToggle.setAttribute("aria-expanded", String(!isExpanded));
    dom.historyPanel.hidden = isExpanded;
  });

  function handleHistorySelection(event) {
    const button = event.target.closest("[data-history-id]");
    if (!button) return;
    restoreHistoryNode(Number(button.dataset.historyId));
    if (dom.historyDialog.open) dom.historyDialog.close();
  }

  dom.historyTree.addEventListener("click", handleHistorySelection);
  dom.historyGraphTree.addEventListener("click", handleHistorySelection);

  dom.openHistoryGraphButton.addEventListener("click", () => {
    renderHistoryTreeInto(dom.historyGraphTree, "history-tree--graph");
    if (typeof dom.historyDialog.showModal === "function") dom.historyDialog.showModal();
    else dom.historyDialog.setAttribute("open", "");
  });

  dom.closeHistoryGraphButton.addEventListener("click", () => {
    if (typeof dom.historyDialog.close === "function") dom.historyDialog.close();
    else dom.historyDialog.removeAttribute("open");
  });

  dom.historyDialog.addEventListener("click", (event) => {
    if (event.target === dom.historyDialog) dom.historyDialog.close();
  });

  // Symmetry is a relation-level operation. Never implement its mathematics
  // by dragging a single term across '=' (which would be a different rule).
  dom.swapEqualityButton.addEventListener("click", () => {
    if (state.expressionRoot?.type !== "Equal") return;
    cancelDrag(false);
    const provenance = swapEqualitySides(state.expressionRoot);
    addHistoryNode("Swapped equality sides (symmetry)", provenance, "rule-transform", {
      ruleId: "equality.symmetry", ruleVersion: 1, affectedNodeIds: [state.expressionRoot.id]
    });
    syncExpressionInput();
    renderApplication();
    setStatus("Applied equality symmetry. Both sides retain their node IDs.");
  });

  dom.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "light" ? "dark" : "light");
  });

  /* ---------------------------------------------------------------------- *
   * 14. Initialisation
   * ---------------------------------------------------------------------- */

  function startApplication() {
    applyTheme(readSavedTheme(window.localStorage));
    dom.hitboxVisibilityMode.value = hitboxVisibility.setMode(readHitboxPreference());
    updateWorkspaceUI();
    void loadWorkspace(); // Starts empty; saved documents are listed, not auto-opened.
  }

  startApplication();
})();
