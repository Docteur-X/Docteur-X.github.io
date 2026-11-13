/**
 * History view (stage 6): the branching history of the open object. It
 * appends a step after a commit, restores an earlier step (the next edit then
 * branches from it), and draws the history tree in the panel and the dialog.
 *
 * WHY: until stage 6 this was section 4 of app.js. The code is the same; what
 * it needs from the rest of the program is passed in by name (the parameters
 * below), so its dependencies are visible in one place.
 *
 * History holds committed mathematics only: never pointer geometry,
 * selection or previews.
 */
import { appendHistoryState, findHistoryState } from '../documents/documentHistory.js';
import { detachHistorySnapshot } from '../documents/historySnapshotBoundary.js';
import { expressionToDisplayString } from '../engine/parser.js';

export function createHistoryView({
  cancelDrag,
  captureActive,
  clearSelectionDecorations,
  createStateSnapshot,
  dismissPreviewsForContextChange,
  documentState,
  dom,
  extensions,
  renderApplication,
  resetRangeSelection,
  scheduleSave,
  setStatus,
  syncExpressionInput,
  viewState,
  workspaceSession
}) {
  /* ---------------------------------------------------------------------- *
   * 4. Branching, snapshot-backed event history
   * ---------------------------------------------------------------------- *
   * The core history module owns event construction and graph links. Every
   * commit stores an authoritative snapshot PLUS a versioned replay patch.
   * Previews and hover feedback never create history entries. This adapter
   * handles only editor-specific cleanup and document synchronisation.
   * ---------------------------------------------------------------------- */

  function findHistoryNode(nodeId) {
    return findHistoryState(documentState.history, nodeId);
  }

  function addHistoryNode(actionLabel, transformation = null, kind = "rule-transform", operation = null) {
    if (viewState.multiSelection.size()) {
      viewState.multiSelection.clear();
      viewState.touchMultiSelectMode = false;
      clearSelectionDecorations();
    }
    const node = appendHistoryState(documentState.history, createStateSnapshot(), {
      actionLabel, transformation, kind, operation
    });
    extensions.emit('historyAppend');
    if (workspaceSession.hasController()) { captureActive(); scheduleSave(); }
    renderHistory();
    return node;
  }

  /** Restore a historical tree snapshot; the next edit branches from it. */
  function restoreHistoryNode(nodeId) {
    // History navigation is a deliberate change of mathematical context, not
    // a competing transformation. Validate the destination first, then close
    // any pending proposal before replacing the committed AST. This applies
    // equally to pointer, keyboard, and future programmatic history callers.
    const node = findHistoryNode(nodeId);
    if (!node) return;

    if (!dismissPreviewsForContextChange()) return;

    // Preview dismissal has already completed at the shared context boundary.
    // Only non-modal drag sessions still require local cleanup.
    cancelDrag(false);
    extensions.emit('abandonDrags');
    // A history node is a durable record, not a mutable editing container.
    // Detach both the expression and nested substitution values before use.
    const restored = detachHistorySnapshot(node.snapshot.expression, node.snapshot.substitutions);
    documentState.expressionRoot = restored.expression;
    documentState.substitutions = restored.substitutions;
    viewState.variableDrafts = Object.fromEntries(
      Object.entries(documentState.substitutions).map(([name, value]) => [name, String(value)])
    );
    documentState.history.currentNodeId = node.id;
    if (workspaceSession.hasController()) { captureActive(); scheduleSave(); }
    viewState.selectedNodeId = null;
    viewState.lastClick = null;
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

    const rootNodes = documentState.history.nodes.filter((node) => node.parentId === null);
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
        String(historyNode.id === documentState.history.currentNodeId)
      );
      if (historyNode.id === documentState.history.currentNodeId) button.classList.add("is-current");

      action.className = "history-node-action";
      action.textContent = historyNode.actionLabel;
      expression.className = "history-node-expression";
      expression.textContent = expressionToDisplayString(historyNode.snapshot.expression);

      button.append(action, expression);
      // Conditions the step relies on (e.g. b ≠ 0 for b÷b = 1), kept with it.
      const assumptions = historyNode.event?.assumptions ?? [];
      if (assumptions.length) {
        const note = document.createElement("span");
        note.className = "history-node-assumptions";
        note.textContent = `assuming ${assumptions.map(a => a.text).join(", ")}`;
        button.append(note);
      }
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

    dom.historyCount.textContent = String(documentState.history.nodes.length);
    const currentNode = findHistoryNode(documentState.history.currentNodeId);
    dom.currentHistoryLabel.textContent = currentNode
      ? `Current: ${currentNode.actionLabel}`
      : "No current state";
  }

  return Object.freeze({ addHistoryNode, restoreHistoryNode, renderHistoryTreeInto, renderHistory });
}
