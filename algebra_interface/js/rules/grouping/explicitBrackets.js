/**
 * Explicit brackets: wrapping the selected expression in a Group, removing
 * one Group, and the bracket toolbar (part of the grouping bundle, decision
 * 3.1: a rule folder may hold helper files).
 *
 * WHY: until stage 6 this was written in app.js, which made app.js name
 * grouping and factorisation to decide when the toolbar buttons were enabled.
 * Moving it here also fixed how it commits: it used to edit the live
 * committed tree in place and then append history; now it edits a copy and
 * commits through `ctx.commitTransformation`, like every other rule.
 *
 * - "Wrap selection" puts one explicit bracket pair around the selected
 *   expression (a selected Group can be wrapped again, giving ((a+b))).
 *   With several terms selected the same button previews range grouping.
 * - "Remove brackets" removes one explicit pair; it never distributes or
 *   deletes anything. Brackets that precedence needs are drawn anyway.
 * - Double-clicking the selected occurrence toggles round brackets.
 */
import { wrapNodeInGroup, removeGroup, getRangeGroupingPlan } from '../../engine/operations/grouping.js';
import { normaliseWithRules } from '../../engine/normalization.js';
import { findNodeById } from '../../engine/treeUtils.js';

export function installExplicitBrackets(ctx, { enterRangePreview }) {
  const wrapButton = ctx.ui('wrapGroupButton');
  const removeButton = ctx.ui('removeGroupButton');
  const styleSelect = ctx.ui('groupStyle');
  const previewActions = ctx.ui('groupingPreviewActions');
  const selectedNode = () => {
    const id = ctx.selectedNodeId();
    return id ? findNodeById(ctx.getRoot(), id) : null;
  };
  const rangePlan = () => getRangeGroupingPlan(ctx.getRoot(), ctx.selectedIds());

  /**
   * Edit a copy of the tree and commit it as one history step. `edit` gets the
   * copy and returns { root, selectedId } or null when nothing applies.
   */
  function commitEdit(edit, actionLabel, status) {
    // Nothing new starts while a preview or a drag holds the view (decision 1.2).
    if (!ctx.viewMode.isIdle() || !ctx.getRoot()) return;
    const result = edit(structuredClone(ctx.getRoot()));
    if (!result) return;
    ctx.commitTransformation({ resultRoot: normaliseWithRules(result.root), actionLabel });
    ctx.setSelectedNode(result.selectedId);
    ctx.syncInput();
    ctx.render();
    ctx.setStatus(status);
  }

  function wrapSelection(style = styleSelect.value) {
    if (ctx.selectedIds().length > 0) { enterRangePreview(); return; }
    const id = ctx.selectedNodeId();
    if (!id) return;
    commitEdit(root => {
      const group = wrapNodeInGroup(root, id, style);
      if (!group) return null;
      // Wrapping the whole expression gives a new root.
      return { root: root.id === id ? group : root, selectedId: group.id };
    }, `Added ${style} brackets`, `Added ${style} brackets around the selected expression.`);
  }

  function removeSelected() {
    const id = ctx.selectedNodeId();
    if (!id) return;
    commitEdit(root => {
      const replacement = removeGroup(root, id);
      if (!replacement) return null;
      return { root: root.id === id ? replacement : root, selectedId: replacement.id };
    }, 'Removed one explicit bracket pair',
    'Removed one explicit pair. Mandatory precedence brackets remain if required.');
  }

  function updateToolbar() {
    const count = ctx.selectedIds().length;
    const selected = selectedNode();
    const busy = !ctx.viewMode.isIdle();
    wrapButton.textContent = count > 0 ? 'Preview grouping' : 'Wrap selection';
    wrapButton.disabled = busy || (count > 0 ? !rangePlan() : !selected);
    removeButton.disabled = busy || count > 0 || selected?.type !== 'Group';
    previewActions.hidden = !ctx.viewMode.isPreview('grouping');
  }

  wrapButton.addEventListener('click', () => wrapSelection());
  removeButton.addEventListener('click', removeSelected);
  ctx.registerSelectionToolbar(updateToolbar);
  // What the toolbar label says about a multi-selection, and the status hint.
  ctx.registerSelectionLabel(() => ctx.viewMode.isPreview('grouping')
    ? `Grouping preview: ${rangePlan()?.count || 0} operands` : null);
  // A fallback: another rule's label (e.g. its own preview) wins.
  ctx.registerSelectionLabel(() => {
    const count = ctx.selectedIds().length;
    if (!count) return null;
    return rangePlan()
      ? `${count} adjacent operands selected — grouping available`
      : `${count} selected — grouping requires adjacent siblings and associativity`;
  }, { fallback: true });
  ctx.registerSelectionHint(() => rangePlan()
    ? 'Adjacent operands selected. Click the thin blue envelope or Preview grouping.' : null,
  { fallback: true });
  // Double-clicking the selected occurrence toggles round brackets.
  ctx.registerSelectionActivate(() => {
    if (selectedNode()?.type === 'Group') removeSelected();
    else wrapSelection('round');
  });
}
