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
import { createDocumentController } from "./core/documentController.js";
import { newDocument, duplicateDocument, validateDocument } from "./core/workspaceDocuments.js";
import { documentRepository } from "./core/documentRepository.js";
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
import { canCombineAddends, combineNumericAddends, reorderAddend, canReorderAddend } from "./operations/addition.js";
import {
  canCombineFactors,
  combineNumericFactors,
  reorderFactor, canReorderFactor
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
import { createGroupingPreview } from "./interaction/groupingPreview.js";
import { createFactorisationPreview } from "./interaction/factorisationPreview.js";
import { createTransformationPreview } from "./interaction/transformationPreview.js";
import { proposeIdentityInsertion } from "./operations/identityInsertion.js";
import { createIdentityToolPreview } from "./interaction/identityTool.js";
import { createIdentityDragFeedback, describeIdentityTarget } from "./interaction/identityDragFeedback.js";

(function initialiseAlgebraWorkspace() {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * 1. DOM references
   * ---------------------------------------------------------------------- *
   * Cache frequently-used elements once. Dynamic equation terms are generated
   * by the renderer and use event delegation from the equation container.
   * ---------------------------------------------------------------------- */

  const dom = {
    workspaceList: document.querySelector("#workspaceList"),
    workspaceName: document.querySelector("#workspaceName"),
    workspaceNew: document.querySelector("#workspaceNew"),
    workspaceSave: document.querySelector("#workspaceSave"),
    workspaceRename: document.querySelector("#workspaceRename"),
    workspaceDuplicate: document.querySelector("#workspaceDuplicate"),
    workspaceClose: document.querySelector("#workspaceClose"),
    workspaceDelete: document.querySelector("#workspaceDelete"),
    workspaceExport: document.querySelector("#workspaceExport"),
    workspaceImport: document.querySelector("#workspaceImport"),
    workspaceStatus: document.querySelector("#workspaceStatus"),
    workspaceEditor: document.querySelector("#workspaceEditor"),
    workspaceEmpty: document.querySelector("#workspaceEmpty"),
    html: document.documentElement,
    body: document.body,
    expressionForm: document.querySelector("#expressionForm"),
    expressionInput: document.querySelector("#expressionInput"),
    resetButton: document.querySelector("#resetButton"),
    equation: document.querySelector("#equation"),
    swapEqualityButton: document.querySelector("#swapEqualityButton"),
    equalityStatus: document.querySelector("#equalityStatus"),
    statusMessage: document.querySelector("#statusMessage"),
    themeToggle: document.querySelector("#themeToggle"),
    hitboxVisibilityMode: document.querySelector("#hitboxVisibilityMode"),
    variablesList: document.querySelector("#variablesList"),
    variableCount: document.querySelector("#variableCount"),
    variableStatus: document.querySelector("#variableStatus"),
    applyValuesButton: document.querySelector("#applyValuesButton"),
    clearValuesButton: document.querySelector("#clearValuesButton"),
    multiplicationDisplayMode: document.querySelector("#multiplicationDisplayMode"),
    selectionLabel: document.querySelector("#selectionLabel"),
    groupStyle: document.querySelector("#groupStyle"),
    wrapGroupButton: document.querySelector("#wrapGroupButton"),
    removeGroupButton: document.querySelector("#removeGroupButton"),
    groupingPreviewActions: document.querySelector("#groupingPreviewActions"),
    confirmRangeGroupButton: document.querySelector("#confirmRangeGroupButton"),
    cancelRangeGroupButton: document.querySelector("#cancelRangeGroupButton"),
    identityToolbar: document.querySelector("#identityToolbar"),
    identityPreviewActions: document.querySelector("#identityPreviewActions"),
    confirmIdentityButton: document.querySelector("#confirmIdentityButton"),
    cancelIdentityButton: document.querySelector("#cancelIdentityButton"),
    factorisationToolbar: document.querySelector("#factorisationToolbar"),
    previewFactorisationButton: document.querySelector("#previewFactorisationButton"),
    factorisationPreviewActions: document.querySelector("#factorisationPreviewActions"),
    confirmFactorisationButton: document.querySelector("#confirmFactorisationButton"),
    cancelFactorisationButton: document.querySelector("#cancelFactorisationButton"),
    mathJsonOutput: document.querySelector("#mathJsonOutput"),
    historyToggle: document.querySelector("#historyToggle"),
    historyPanel: document.querySelector("#historyPanel"),
    historyCount: document.querySelector("#historyCount"),
    historyTree: document.querySelector("#historyTree"),
    currentHistoryLabel: document.querySelector("#currentHistoryLabel"),
    openHistoryGraphButton: document.querySelector("#openHistoryGraphButton"),
    historyDialog: document.querySelector("#historyDialog"),
    closeHistoryGraphButton: document.querySelector("#closeHistoryGraphButton"),
    historyGraphTree: document.querySelector("#historyGraphTree")
  };

  /* ---------------------------------------------------------------------- *
   * 2. Application state
   * ---------------------------------------------------------------------- *
   * `expressionRoot` is now the source of truth for the mathematics. It is a
   * tree whose root is always an Add node. There is no longer a flat `terms`
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
  const workspace = { documents: new Map(), activeId: null, controller: null,
    openIds: new Set(), dirty: new Set(), saveTimer: null, saveQueue: Promise.resolve() };

  function workspaceMessage(message) { dom.workspaceStatus.textContent = message; }
  function activeDocument() { return workspace.controller?.document ?? null; }
  function updateWorkspaceUI() {
    dom.workspaceList.replaceChildren();
    for (const doc of workspace.documents.values()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-document';
      button.dataset.documentId = doc.id;
      button.setAttribute('aria-current', String(doc.id === workspace.activeId));
      button.textContent = `${doc.title}${workspace.dirty.has(doc.id) ? ' •' : ''}`;
      dom.workspaceList.append(button);
    }
    const active = Boolean(activeDocument());
    dom.workspaceEditor.hidden = !active;
    dom.workspaceEmpty.hidden = active;
    for (const button of [dom.workspaceSave, dom.workspaceRename, dom.workspaceDuplicate,
      dom.workspaceClose, dom.workspaceDelete, dom.workspaceExport]) button.disabled = !active;
    dom.workspaceName.textContent = activeDocument()?.title || 'No document selected';
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
    try {
      await queueSave(doc);
      if (workspace.documents.get(doc.id) === doc) workspace.dirty.delete(doc.id);
      updateWorkspaceUI();
      workspaceMessage(`Saved ${doc.title} locally.`);
    } catch (error) {
      workspaceMessage(`Save failed: ${error.message}. Export a JSON backup.`);
    }
  }
  function scheduleSave() {
    clearTimeout(workspace.saveTimer);
    workspaceMessage('Unsaved changes — autosave pending.');
    workspace.saveTimer = setTimeout(() => saveDocument(activeDocument()), 350);
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
    if (workspace.controller) {
      cancelWorkspaceInteraction();
      // Existing document is already captured after each committed change.
      if (workspace.dirty.has(workspace.activeId)) void saveDocument(activeDocument());
    }
    workspace.activeId = id;
    workspace.openIds.add(id);
    workspace.controller = createDocumentController(workspace.documents.get(id));
    const doc = activeDocument();
    // Reserve every historical ID, not just IDs in the current branch.
    // Otherwise a later edit could accidentally reuse an occurrence ID.
    reserveNodeIds(doc.root);
    doc.history.nodes.forEach(node => reserveNodeIds(node.snapshot?.expression));
    state.mathematicalDocument = doc;
    state.expressionRoot = doc.root ? cloneExpression(doc.root) : null;
    state.history = doc.history;
    state.substitutions = { ...doc.substitutions };
    state.variableDrafts = Object.fromEntries(Object.entries(state.substitutions)
      .map(([key, value]) => [key, String(value)]));
    state.selectedNodeId = null;
    state.distributionPreview = null;
    state.factorisationMode = 'normal';
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    resetRangeSelection();
    dom.expressionInput.value = state.expressionRoot ? expressionToInput(state.expressionRoot) : '';
    updateWorkspaceUI();
    if (state.expressionRoot) renderApplication(false);
    else {
      dom.equation.replaceChildren();
      dom.variablesList.replaceChildren();
      dom.mathJsonOutput.textContent = '';
      dom.swapEqualityButton.hidden = true;
      dom.equalityStatus.hidden = true;
      renderHistory();
    }
    setStatus(state.expressionRoot ? 'Document opened.' : 'Enter an expression or equation to begin.');
  }
  async function createWorkspaceDocument(title) {
    const doc = newDocument(title);
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
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.title.replace(/[^a-z0-9_-]+/gi, '_') || 'mathematics'}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function importWorkspaceDocument(file) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File is too large (10 MB limit).');
      const doc = validateDocument(JSON.parse(await file.text()));
      // Imports receive a fresh document identity; original IDs within the
      // mathematical tree and its history are preserved for provenance.
      doc.id = newDocument().id;
      doc.title = `${doc.title} (imported)`;
      workspace.documents.set(doc.id, doc);
      activateDocument(doc.id);
      workspace.dirty.add(doc.id);
      await saveDocument(doc);
    } catch (error) { workspaceMessage(`Import failed: ${error.message}`); }
  }
  async function loadWorkspace() {
    try {
      const docs = await documentRepository.list();
      for (const doc of docs) {
        workspace.documents.set(doc.id, doc);
        reserveNodeIds(doc.root);
        doc.history.nodes.forEach(node => reserveNodeIds(node.snapshot?.expression));
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
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    factorisationOverlay.clear();
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
    identityFeedback.stop();
    dom.identityPreviewActions.hidden = true;
  }

  function identityTargetAt(x, y, operation) {
    // Resolve the existing equation DOM only: never inspect a proposed layout.
    const element = document.elementFromPoint(x, y);
    if (!element || !dom.equation.contains(element)) return null;
    const operator = element.closest('.plus[data-operator-index], .multiply-operator[data-operator-index]');
    const kind = operation === 'Add' ? 'plus' : 'multiply-operator';
    if (operator?.classList.contains(kind)) {
      return { request: { operation, parentNodeId: operator.dataset.operatorParentId,
        insertionIndex: Number(operator.dataset.operatorIndex) }, element: operator };
    }
    const hitbox = element.closest('.add-operand[data-node-id], .factor-slot[data-node-id]');
    if (!hitbox) return null;
    const rect = hitbox.getBoundingClientRect();
    return { request: { operation, targetNodeId: hitbox.dataset.nodeId,
      side: x < rect.left + rect.width / 2 ? 'left' : 'right' }, element: hitbox };
  }

  function updateIdentityTool(event) {
    if (!identityDrag || identityPreviewModal) return;
    identityFeedback.move(event.clientX, event.clientY);
    const target = identityTargetAt(event.clientX, event.clientY, identityDrag.operation);
    const request = target?.request || null;
    const key = request ? JSON.stringify(request) : null;
    // The candidate is mathematical data only. Rendering it while hovering
    // would make the equation jump and compete with stable hit testing.
    if (key !== identityDrag.lastKey) {
      identityDrag.lastKey = key;
      identityProposal = request ? proposeIdentityInsertion(state.expressionRoot, request) : null;
      setStatus(describeIdentityTarget(identityProposal ? request : null));
    }
    identityFeedback.highlight(identityProposal ? target.element : null);
  }

  function confirmIdentityTool() {
    if (!identityPreviewModal || !identityProposal) return;
    const proposal = identityProposal;
    cancelIdentityTool();
    state.expressionRoot = proposal.root; // Reuse the preview's exact generated IDs.
    addHistoryNode(`Introduced ${proposal.operation === 'Add' ? '+0' : '×1'}`,
      { sourceNodeIds: proposal.request.targetNodeId ? [proposal.request.targetNodeId] : [],
        createdNodeIds: [proposal.identityNodeId] },
      'rule-transform', { ruleId: 'identity.introduce', ruleVersion: 1,
        inputs: proposal.request, generatedNodeIds: [proposal.identityNodeId] });
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
    identityPreviewModal = true;
    identityVisual.show(identityProposal);
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

  function renderEquation(animate = true) {
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

    hitboxVisibility.clearHover(); // The old hovered DOM node is about to be detached.
    dom.equation.replaceChildren(newTreeElement);

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
      const nextExpression = parseExpression(rawExpression);
      cancelDrag(false);
      cancelFactorDrag();
      state.factorisationMode = "normal";
      state.factorisationPlan = null;
      factorisationOverlay.clear();
      state.distributionPreview = null;
      state.expressionRoot = nextExpression;
      if (!state.mathematicalDocument) state.mathematicalDocument = createMathematicalDocument(nextExpression);
      else updateDocumentRoot(state.mathematicalDocument, nextExpression);
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
   * Attempt to combine the moving node with a compatible target in its parent.
   * Addition applies between Add operands; multiplication applies between
   * factors in the same Multiply node. Both use the same numeric evaluator.
   */
  function commitNumericCombination(targetId, movingNode) {
    const parent = findNodeById(state.expressionRoot, state.drag.parentId);
    if (!parent) return false;

    const movingText = expressionToDisplayString(movingNode);
    const targetNode = parent.operands.find((child) => child.id === targetId);
    if (!targetNode) return false;

    let result;
    let operationLabel;

    if (parent.type === "Add") {
      result = combineNumericAddends(parent, targetId, movingNode, state.substitutions);
      operationLabel = "Added";
    } else if (parent.type === "Multiply") {
      result = combineNumericFactors(parent, targetId, movingNode, state.substitutions);
      operationLabel = "Multiplied";
    } else {
      return false;
    }

    if (!result) return false;

    state.expressionRoot = normaliseWithRules(state.expressionRoot);
    // Not every combination creates a number: 0+a returns a, 1*a returns a.
    // Describe the actual symbolic result rather than formatting null as zero.
    const resultText = expressionToDisplayString(result.result);
    state.selectedNodeId = null;
    addHistoryNode(
      `${operationLabel} ${movingText} and ${expressionToDisplayString(targetNode)} to make ${resultText}`
    );
    syncExpressionInput();
    setStatus(`${operationLabel} the operands to make ${resultText}. Saved in history.`);
    return true;
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
    state.distributionPreview = null;
    renderEquation(false);
    if (showMessage) setStatus("Distribution preview dismissed. The expression was not changed.");
  }

  function openDistributionPreview(plan) {
    const source = findNodeById(state.expressionRoot, plan.sourceFactorId);
    if (!source) return;
    state.distributionPreview = {
      ...plan,
      sourceText: expressionToDisplayString(source)
    };
    state.selectedNodeId = null;
    renderEquation(false);
    setStatus(`Amber preview: ${plan.direction} distribution. Click any highlighted factor copy to expand, or click elsewhere / press Escape to cancel.`);
  }

  /**
   * Commit once, with the current tree revalidated by distribution.js.
   * History stores copiesBySourceId so a future inspector can trace every
   * new factor back to its source in the preceding expression snapshot.
   */
  function commitDistributionPreview() {
    const plan = state.distributionPreview;
    if (!plan) return;
    const original = dom.equation.querySelector(`[data-node-id="${plan.sourceFactorId}"]`);
    const originalRect = original?.getBoundingClientRect();
    const rewritten = applyDistribution(state.expressionRoot, plan);
    state.distributionPreview = null;
    if (!rewritten) {
      renderEquation(false);
      setStatus("The proposed expansion is no longer available; nothing changed.");
      return;
    }

    state.expressionRoot = normaliseWithRules(rewritten.root);
    state.selectedNodeId = null;
    addHistoryNode(`Applied ${plan.direction} distribution`, rewritten.provenance, "rule-transform", {
      ruleId: `distribution.${plan.direction}`, ruleVersion: 1,
      inputs: { direction: plan.direction, sumId: plan.sumId ?? null },
      affectedNodeIds: [plan.factorId, plan.sumId].filter(Boolean)
    });
    syncExpressionInput();
    renderApplication();
    animateDistributedCopies(originalRect, rewritten.provenance);
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
    state.drag.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
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
   * Commit a single numeric rewrite. The source operand is removed ONLY HERE,
   * after the user has completed a valid drag; operation modules preserve the
   * appropriate surviving ID, such as `a` in 0+a or 1*a.
   *
   * On a refused transformation, reinsertion restores the exact same objects
   * and IDs (no reparsing and no history entry). canCombineDraggedSibling()
   * normally guarantees applicability; this extra check is defensive.
   */
  function commitDraggedCombination(targetId, drag) {
    const parent = findNodeById(state.expressionRoot, drag.parentId);
    if (!parent || parent.operands[drag.startIndex]?.id !== drag.item.id ||
        !canCombineDraggedSibling(targetId)) return false;
    parent.operands.splice(drag.startIndex, 1);
    const succeeded = commitNumericCombination(targetId, drag.item);
    if (!succeeded) parent.operands.splice(drag.startIndex, 0, drag.item);
    return succeeded;
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

    if (commit && target.kind === "combine") {
      const succeeded = commitDraggedCombination(target.id, drag);
      clearDragState();
      if (!succeeded) setStatus("That combination is no longer valid; nothing changed.");
      renderApplication();
      return;
    }

    if (commit && target.kind === "insert") {
      const parent = findNodeById(state.expressionRoot, drag.parentId);
      // The target index is measured in the ordered array with the moving
      // operand omitted, which is exactly what reorderChild() expects.
      const changed = parent?.type === "Add"
        ? reorderAddend(parent, drag.item.id, target.index)
        : parent?.type === "Multiply"
          ? reorderFactor(parent, drag.item.id, target.index)
          : false;
      const orderChanged = Boolean(changed) && parent.operands.some(
        (child, index) => child.id !== drag.originalOrder[index]
      );
      if (orderChanged) {
        state.expressionRoot = normaliseWithRules(state.expressionRoot);
        addHistoryNode(parent.type === "Add"
          ? `Reordered addend ${expressionToDisplayString(drag.item)}`
          : `Reordered factor ${expressionToDisplayString(drag.item)}`);
        syncExpressionInput();
        setStatus("Rearrangement saved in history.");
      } else {
        setStatus(changed ? "The expression stayed in its original order."
          : "Reordering is not permitted by this operation's rules.");
      }
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
      const allowed = parent?.type === "Add"
        ? canReorderAddend(parent, drag.item.id, next.index)
        : parent?.type === "Multiply"
          ? canReorderFactor(parent, drag.item.id, next.index)
          : false;
      if (!allowed) next = { kind: "invalid", id: `reorder-${next.index}` };
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

    if (effective.kind === "distribution" &&
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
    const changed = location.parent.type === "Add"
      ? reorderAddend(location.parent, nodeId, destinationIndex)
      : location.parent.type === "Multiply"
        ? reorderFactor(location.parent, nodeId, destinationIndex)
        : false;

    if (!changed) return;

    addHistoryNode(location.parent.type === "Add"
      ? `Reordered addend ${expressionToDisplayString(movedNode)}`
      : `Reordered factor ${expressionToDisplayString(movedNode)}`);
    syncExpressionInput();
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
    const validModes = new Set(["source", "implicit", "dot", "times"]);
    state.multiplicationDisplayOverride = validModes.has(mode) ? mode : "source";
    renderEquation();
  }

  /* ---------------------------------------------------------------------- *
   * 11. Theme switching
   * ---------------------------------------------------------------------- */

  function readSavedTheme() {
    try {
      return localStorage.getItem("algebra-workspace-theme") === "dark" ? "dark" : "light";
    } catch (error) {
      return "light";
    }
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    dom.html.dataset.theme = state.theme;

    const nextTheme = state.theme === "light" ? "dark" : "light";
    dom.themeToggle.textContent = `Switch to ${nextTheme} mode`;
    dom.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));

    try {
      localStorage.setItem("algebra-workspace-theme", state.theme);
    } catch (error) {
      // The current tab still works when browser storage is unavailable.
    }
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
    if (!plan) return;
    const rewritten = applyFactorisation(state.expressionRoot, plan);
    if (!rewritten) return;

    // Normalization acts on the independent candidate, never on the live tree.
    // Preserve the SAME IDs if the student confirms: do not rerun the rewrite.
    const proposal = {
      ...rewritten,
      root: normaliseWithRules(rewritten.root),
      plan
    };
    const proposedElement = createEquationElement(proposal.root);
    state.factorisationPlan = plan;
    state.factorisationProposal = proposal;
    state.factorisationMode = "preview";
    updateFactorisationToolbar();
    factorisationOverlay.clear(); // Remove the small extraction-zone button.

    const opened = transformationPreview.show({
      candidateElement: proposedElement,
      sourceNodeIds: plan.sourceFactorIds,
      resultNodeId: proposal.extractedFactorId,
      inlineExtraction: { scopeNodeId: plan.scopeNodeId, direction: plan.direction }
    });
    if (!opened) {
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
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    updateFactorisationToolbar();
    paintRangeSelection(); // Restore selected source outlines and extraction zone.
    setStatus("Factorisation preview cancelled; original expression, IDs and selection are unchanged.");
  }

  function commitFactorisationPreview() {
    if (state.factorisationMode !== "preview") return;
    const proposal = state.factorisationProposal;
    // The modal mode forbids edits to the committed tree. Still re-check the
    // mathematical applicability against that original tree before committing.
    // Crucially, we DO NOT apply the rule a second time: that would create new
    // IDs different from those already shown in the candidate preview.
    const currentPlan = proposal && getFactorisationPlan(state.expressionRoot, proposal.plan.sourceFactorIds);
    const teachingStillAllows = checkFactorisationTeachingPolicy(state.expressionRoot, currentPlan).allowed;
    if (!teachingStillAllows || !currentPlan || currentPlan.rule !== proposal.plan.rule ||
        currentPlan.sumId !== proposal.plan.sumId ||
        currentPlan.groupId !== proposal.plan.groupId ||
        currentPlan.productIds.join("|") !== proposal.plan.productIds.join("|")) {
      cancelFactorisationPreview();
      setStatus("Factorisation is no longer valid; no mathematical change was committed.");
      return;
    }
    transformationPreview.finish();
    state.factorisationMode = "normal";
    state.factorisationPlan = null;
    state.factorisationProposal = null;
    factorisationOverlay.clear();
    state.expressionRoot = proposal.root;
    state.selectedNodeId = proposal.extractedFactorId;
    addHistoryNode("Extracted common factor", proposal.provenance, "rule-transform", {
      ruleId: `factorisation.${proposal.plan.direction}`, ruleVersion: 1,
      inputs: { direction: proposal.plan.direction, scopeNodeId: proposal.plan.scopeNodeId },
      affectedNodeIds: proposal.plan.sourceFactorIds
    });
    syncExpressionInput();
    renderApplication();
    setStatus("Common factor extracted. History records which original factors contributed to the new factor.");
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
    const copy = hitbox.cloneNode(true);
    copy.setAttribute("aria-hidden","true");
    copy.removeAttribute("tabindex");
    copy.querySelectorAll("[tabindex],button").forEach(el => el.setAttribute("tabindex","-1"));
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
    state.multiSelection.clear();
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
    if (!plan) return;
    state.groupingPlan = plan;
    state.groupingMode = "preview";
    groupingOverlay.enterPreview(dom.groupStyle.value);
    updateGroupToolbar();
    // A keyboard user can confirm immediately, without hunting for an overlay
    // whose position may depend on the current zoom and line wrapping.
    dom.confirmRangeGroupButton.focus({ preventScroll: true });
    setStatus("Grouping preview: click the blue bracketed region or Confirm. Click elsewhere or press Escape to cancel.");
  }

  function cancelRangeGroupingPreview() {
    if (state.groupingMode !== "preview") return;
    state.groupingMode = "normal";
    state.groupingPlan = null;
    groupingOverlay.setSelection(rangePlan()?.operandIds || []);
    updateGroupToolbar();
    setStatus("Grouping preview cancelled. Your selected operands are unchanged.");
  }

  function commitRangeGrouping() {
    if (state.groupingMode !== "preview") return;
    // Revalidate at COMMIT time, not only when opening the preview. This is
    // essential when a future editor can update the tree from other controls.
    const current = rangePlan();
    if (!current || current.parentId !== state.groupingPlan?.parentId ||
        current.operandIds.join("|") !== state.groupingPlan.operandIds.join("|")) {
      cancelRangeGroupingPreview();
      setStatus("The grouping proposal is no longer valid; nothing changed.");
      return;
    }
    const result = groupOperandRange(state.expressionRoot, current.operandIds, dom.groupStyle.value);
    if (!result) {
      cancelRangeGroupingPreview();
      return;
    }
    state.groupingMode = "normal";
    state.groupingPlan = null;
    state.multiSelection.clear();
    groupingOverlay.clear();
    state.selectedNodeId = result.group.id;
    state.lastClick = null;
    // Group is an explicit boundary, so the normalizer may not flatten it.
    state.expressionRoot = normaliseWithRules(state.expressionRoot);
    addHistoryNode(`Grouped ${current.count} adjacent ${current.parentType === "Add" ? "addends" : "factors"}`, result.provenance, "rule-transform", {
      ruleId: "grouping.range", ruleVersion: 1,
      inputs: { bracketStyle: dom.groupStyle.value, parentId: current.parentId },
      affectedNodeIds: current.operandIds
    });
    syncExpressionInput();
    renderApplication();
    setStatus("Added explicit brackets to the selected range; original operand IDs were preserved.");
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
    const hitbox = event.target.closest?.(".factor-slot, .add-operand");
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
    if (state.multiSelection.size() && !event.ctrlKey && !event.metaKey &&
        !selectedFactorPickup &&
        !event.target.closest?.(".grouping-envelope__edge, .group-toolbar, .factorisation-zone, .factorisation-toolbar")) {
      resetRangeSelection();
    }
  }, true);

  dom.equation.addEventListener("pointerdown", (event) => {
    // While previewing, the amber copies are buttons, not draggable terms.
    // Other clicks cancel the preview; only an intentional copy click commits.
    if (identityDrag || identityPreviewModal || state.distributionPreview || state.groupingMode !== "normal" || state.factorisationMode !== "normal") return;
    if (event.ctrlKey || event.metaKey) return;
    if (event.target.closest("[data-distribution-confirm]")) return;
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

  window.addEventListener("pointermove", (event) => {
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
    const hitbox = event.target.closest(".factor-slot, .add-operand");
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
    if (state.groupingMode === "preview") groupingOverlay.setBracketStyle(dom.groupStyle.value);
  });
  dom.removeGroupButton.addEventListener("click", removeSelectedGroup);

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
    applyTheme(readSavedTheme());
    dom.hitboxVisibilityMode.value = hitboxVisibility.setMode(readHitboxPreference());
    updateWorkspaceUI();
    void loadWorkspace(); // Starts empty; saved documents are listed, not auto-opened.
  }

  startApplication();
})();
