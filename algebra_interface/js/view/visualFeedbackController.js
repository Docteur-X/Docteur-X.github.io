/* ========================================================================== *
 * View-scoped semantic feedback ownership (Presentation Consolidation Phase 1)
 * ========================================================================== *
 * A mathematical view has ONE effective decoration registry, even when several
 * feature adapters independently request controller handles for that view.
 * Each handle has private owner names: clearing an owner on one handle cannot
 * clear another feature's identically named owner. No AST, hitbox or layout
 * geometry is created or changed here.
 *
 * All requested roles coexist as CSS classes. Their *visible* precedence is
 * determined by the stylesheet: structural navigation is the strongest focus
 * outline, followed by the existing semantic preview/eligibility/selection
 * rules. We intentionally do not suppress roles, since suppressing a class
 * would also suppress independent affordances such as eligibility hints.
 * ========================================================================== */
export const FEEDBACK_ROLES = Object.freeze({
  HOVER: 'hover', HOVER_PARENT: 'hover-parent', ELIGIBLE: 'eligible', REJECTED: 'rejected',
  PROPOSED_INSERTION: 'proposed-insertion', PROPOSED_TARGET: 'proposed-target', SELECTED: 'selected',
  GROUPING: 'grouping', STRUCTURE_NAVIGATION: 'structure-navigation',
});

const ROLE_CLASS = Object.freeze({
  hover: 'is-hitbox-hovered', 'hover-parent': 'is-hitbox-hover-parent', eligible: 'math-feedback--eligible',
  rejected: 'math-feedback--rejected',
  'proposed-insertion': 'math-feedback--proposed-insertion',
  // A valid drop location for a rule: "you can drop here", not "this is new".
  'proposed-target': 'math-feedback--proposed-target',
  selected: 'math-feedback--selected', grouping: 'math-feedback--grouping',
  'structure-navigation': 'is-structure-navigated',
});

// Weakly scoped by the *view element*, never by document or node ID. This
// prevents future independent views of the same AST from sharing feedback.
const registries = new WeakMap();

function registryFor(root) {
  let registry = registries.get(root);
  if (registry) return registry;
  const channels = new Map(); // private handle token -> Map(owner -> descriptors)
  const painted = new Map(); // element -> { classes, originalHint }

  function reconcile() {
    const desired = new Map();
    // Map insertion order is stable: the latest registered hint wins, with
    // previous hints restored as owners disappear. Class ownership is a union.
    for (const owners of channels.values()) {
      for (const descriptors of owners.values()) {
        for (const { element, className, hint } of descriptors) {
          if (!root.contains(element)) continue; // rerender detached this node
          let state = desired.get(element);
          if (!state) { state = { classes: new Set(), hint: undefined }; desired.set(element, state); }
          state.classes.add(className);
          if (hint !== undefined) state.hint = hint;
        }
      }
    }
    for (const [element, state] of painted) {
      const next = desired.get(element);
      for (const className of state.classes) {
        if (!next?.classes.has(className)) element.classList.remove(className);
      }
      if (state.hint !== next?.hint) {
        const hint = next?.hint ?? state.originalHint;
        if (element.dataset) {
          if (hint === undefined) delete element.dataset.mathFeedbackHint;
          else element.dataset.mathFeedbackHint = hint;
        }
      }
      if (!next) painted.delete(element);
    }
    for (const [element, next] of desired) {
      let state = painted.get(element);
      if (!state) {
        state = { classes: new Set(), originalHint: element.dataset?.mathFeedbackHint };
        painted.set(element, state);
      }
      for (const className of next.classes) {
        if (!state.classes.has(className)) element.classList.add(className);
      }
      const hint = next.hint ?? state.originalHint;
      if (element.dataset) {
        if (hint === undefined) delete element.dataset.mathFeedbackHint;
        else element.dataset.mathFeedbackHint = hint;
      }
      state.classes = next.classes;
      state.hint = next.hint;
    }
  }
  registry = { channels, reconcile };
  registries.set(root, registry);
  return registry;
}

export function createVisualFeedbackController(root, semanticTargetResolver = null) {
  if (!root || typeof root.contains !== 'function') throw new TypeError('A mathematical view root is required.');
  const registry = registryFor(root);
  const token = Symbol('feedback handle');
  const owners = new Map();
  registry.channels.set(token, owners);
  let disposed = false;

  function show(owner, descriptors) {
    if (disposed) throw new Error('Feedback controller has been disposed.');
    if (typeof owner !== 'string' || !owner) throw new TypeError('Feedback owner must be a nonempty string.');
    if (!Array.isArray(descriptors)) throw new TypeError('Feedback descriptors must be an array.');
    // Validate atomically before replacing an existing request.
    const next = descriptors.map(({ element, role, hint, mathematicalObjectId, nodeId, targetRole, operatorPosition }) => {
      // A descriptor names its target by DOM element, or by semantic address
      // (object ID and occurrence ID), which the resolver checks for view
      // membership and representation. An explicit semantic address is an
      // assertion of mathematical identity, even when a DOM element is also
      // supplied: the element never bypasses object-ID or occurrence-ID validation.
      const hasSemanticFields = mathematicalObjectId !== undefined || nodeId !== undefined ||
        targetRole !== undefined || operatorPosition !== undefined;
      if (hasSemanticFields) {
        if (!semanticTargetResolver || mathematicalObjectId === undefined || nodeId === undefined)
          throw new TypeError('A complete semantic address and resolver are required.');
        const resolved = semanticTargetResolver.resolve({
          mathematicalObjectId, nodeId, targetRole, operatorPosition,
        });
        if (!resolved.element || (element && !resolved.elements.includes(element)))
          throw new TypeError('DOM feedback target does not match its semantic address.');
        element ??= resolved.element;
      }
      const className = ROLE_CLASS[role];
      if (!className || !element || !root.contains(element))
        throw new TypeError('Unknown feedback role or target outside mathematical view.');
      if (hint !== undefined && (role !== 'eligible' || typeof hint !== 'string' || !hint.trim()))
        throw new TypeError('Only eligible feedback may include a nonempty contextual hint.');
      return { element, className, hint };
    });
    owners.set(owner, next);
    registry.reconcile();
  }
  function clear(owner) {
    if (owners.delete(owner)) registry.reconcile();
  }
  function clearAll() {
    if (owners.size) { owners.clear(); registry.reconcile(); }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    owners.clear();
    registry.channels.delete(token);
    registry.reconcile();
    if (!registry.channels.size) registries.delete(root);
  }
  return Object.freeze({ show, clear, clearAll, dispose });
}
