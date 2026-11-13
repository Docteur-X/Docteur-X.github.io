/**
 * Mathematical Structure Navigator v1.
 *
 * This UI is deliberately OUTSIDE the equation's layout. It navigates the AST,
 * not DOM ancestors, and never invents mathematical hitboxes. The active
 * occurrence is shown using a layout-neutral outline on its actual occurrence
 * hitbox, operation content container, or operator target, in that order.
 *
 * A content-only operation is still navigable; its representation is reported
 * honestly instead of pretending it has a draggable/selectable hitbox.
 */
import { createStructureNavigationModel, navigateStructure } from './structureNavigation.js';
import { createVisualFeedbackController } from './visualFeedbackController.js';
import { createSemanticTargetResolver } from './rendering/semanticTargetResolver.js';

export function createStructureNavigator({ view, mount, getRoot, onSelect, semanticTargetResolver }) {
  // A standalone navigator can still be used without the application composition root.
  const resolver = semanticTargetResolver ?? createSemanticTargetResolver({
    view, getRoot, getMathematicalObjectId: () => 'standalone',
  });
  const feedback = createVisualFeedbackController(view, resolver);
  const NAVIGATION_OWNER = 'structure-navigator';
  let entries = [];
  let currentId = null;
  const section = document.createElement('section');
  section.className = 'structure-navigator';
  section.dataset.testid = 'structure-navigator';
  section.setAttribute('aria-label', 'Mathematical structure navigation');
  const heading = document.createElement('span');
  heading.className = 'structure-navigator__heading';
  heading.textContent = 'Mathematical structure';
  const info = document.createElement('output');
  info.className = 'structure-navigator__info';
  info.dataset.testid = 'structure-navigation-current';
  info.setAttribute('aria-live', 'polite');
  const controls = document.createElement('div');
  controls.className = 'structure-navigator__controls';
  const commands = [
    ['parent', 'Parent ↑'], ['child', 'First child ↓'],
    ['previous', 'Previous sibling ←'], ['next', 'Next sibling →']
  ];
  const buttons = new Map();
  for (const [direction, label] of commands) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button--quiet button--small';
    button.dataset.structureDirection = direction;
    button.textContent = label;
    button.addEventListener('click', () => move(direction));
    controls.append(button);
    buttons.set(direction, button);
  }
  const selectButton = document.createElement('button');
  selectButton.type = 'button';
  selectButton.className = 'button button--small';
  selectButton.textContent = 'Select occurrence';
  selectButton.dataset.structureSelect = 'true';
  selectButton.addEventListener('click', () => {
    const entry = entries.find(item => item.nodeId === currentId);
    if (entry) onSelect(entry.nodeId);
  });
  const help = document.createElement('span');
  help.className = 'structure-navigator__help';
  help.textContent = 'Alt + arrow keys navigate while the equation or navigator is focused.';
  section.append(heading, info, controls, selectButton, help);
  mount.append(section);

  function clearHighlight() {
    feedback.clear(NAVIGATION_OWNER);
  }
  function locate(entry) {
    const result = resolver.resolve({
      mathematicalObjectId: resolver.getMathematicalObjectId(), nodeId: entry.nodeId,
    });
    return { element: result.element, representation: result.representation };
  }
  function paint() {
    clearHighlight();
    const entry = entries.find(item => item.nodeId === currentId);
    if (!entry) {
      info.textContent = 'No mathematical occurrence';
      for (const button of buttons.values()) button.disabled = true;
      selectButton.disabled = true;
      return;
    }
    const target = locate(entry);
    if (target.element) feedback.show(NAVIGATION_OWNER, [{
      mathematicalObjectId: resolver.getMathematicalObjectId(),
      nodeId: entry.nodeId, role: 'structure-navigation',
    }]);
    info.textContent = `${entry.type} (${entry.nodeId}) · ${target.representation}`;
    buttons.get('parent').disabled = entry.parentId === null;
    buttons.get('child').disabled = !entries.some(item => item.parentId === currentId);
    const siblings = entries.filter(item => item.parentId === entry.parentId);
    const index = siblings.findIndex(item => item.nodeId === currentId);
    buttons.get('previous').disabled = entry.parentId === null || index === 0;
    buttons.get('next').disabled = entry.parentId === null || index === siblings.length - 1;
    // Navigation is possible even for content-only operations, but selecting
    // those nodes is handled by the application selection model, not by a fake DOM hitbox.
    selectButton.disabled = false;
  }
  function move(direction) {
    currentId = navigateStructure(entries, currentId, direction);
    paint();
  }
  function refresh() {
    const root = getRoot();
    entries = root ? createStructureNavigationModel(root) : [];
    if (!semanticTargetResolver) resolver.refresh();
    // Preserve navigation across rerenders when node identity survives; when
    // it does not, safely return to the new root rather than guessing provenance.
    if (!entries.some(entry => entry.nodeId === currentId)) currentId = entries[0]?.nodeId || null;
    paint();
  }
  function onKeyDown(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const within = view.contains(event.target) || section.contains(event.target);
    if (!within) return;
    const direction = { ArrowUp: 'parent', ArrowDown: 'child', ArrowLeft: 'previous', ArrowRight: 'next' }[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    move(direction);
  }
  document.addEventListener('keydown', onKeyDown, true);
  refresh();
  return {
    refresh, move, getCurrentId: () => currentId,
    setCurrentId(id) { if (entries.some(entry => entry.nodeId === id)) { currentId = id; paint(); } },
    dispose() { document.removeEventListener('keydown', onKeyDown, true); feedback.dispose(); section.remove(); }
  };
}
