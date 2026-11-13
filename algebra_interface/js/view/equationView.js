/**
 * Equation view rendering (stage 6): drawing the open object's tree into the
 * equation and refreshing the panels after a change.
 *   renderMath(root, options)   render a tree, then add what its parts DO
 *                               (renderer standard rule 7); previews use it too
 *   renderEquation(animate)     the one DOM replacement of the equation, in
 *                               the documented order (equationPresentationMount)
 *   renderApplication(animate)  equation, symbol panel, MathJSON, history
 *
 * WHY: until stage 6 these were sections 5 and 12 of app.js. The code is the
 * same; what they need is passed in by name (the parameters below).
 * A live pointer gesture never re-renders the equation.
 */
import { GESTURE_DECLARATIONS } from '../app/gestureDeclarations.js';
import { applyActionWording } from './actionWording.js';
import { createEquationLayoutTransition } from './equationLayoutTransition.js';
import { findNodeById } from '../engine/treeUtils.js';
import { markSelectedOccurrence } from './selectionDecoration.js';
import { mathJSONToString } from '../engine/mathJson.js';
import { mountEquationPresentation } from './equationPresentationMount.js';
import { renderExpression } from './rendering/domRenderer.js';

export function createEquationView({
  REDUCED_MOTION_QUERY,
  activeDocument,
  clipboardUI,
  documentState,
  dom,
  equationSemanticRefresh,
  extensions,
  hitboxVisibility,
  paintRangeSelection,
  renderHistory,
  renderVariables,
  semanticTargetResolver,
  updateSelectionToolbars,
  viewState
}) {
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
  /**
   * Render a tree, then add what its parts DO to their labels (renderer
   * standard rule 7: the renderer says what a part is). Every rendering of
   * the mathematics goes through here, so previews read the same.
   */
  function renderMath(root, options) {
    const tree = renderExpression(root, options);
    applyActionWording(tree, { declarations: GESTURE_DECLARATIONS, findNode: id => findNodeById(root, id) });
    return tree;
  }

  function createEquationElement(root) {
    return renderMath(root, {
      substitutions: documentState.substitutions,
      displayStyleOverride: viewState.multiplicationDisplayOverride
    });
  }





  const equationLayoutTransition = createEquationLayoutTransition({
    root: dom.equation,
    prefersReducedMotion: () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    requestFrame: callback => requestAnimationFrame(callback)
  });

  /**
   * Presentation rerenders have a different policy from mathematical context
   * changes. The latter dismiss ALL previews and can reject navigation; this
   * boundary invalidates only transient presentations that cannot survive a
   * replacement of their DOM. Distribution is intentionally excluded: its
   * Preview Host calls renderEquation(false) while showing and clearing the
   * amber candidate, so cancelling it here would immediately destroy it.
   *
   * Keep this orchestration outside the DOM renderer. It is application-level
   * interaction policy, not AST-to-HTML conversion. In particular, do not
   * substitute dismissPreviewsForContextChange() for this function.
   */
  function prepareEquationPresentationRerender() {
    for (const cancelForRerender of extensions.rerenderCancels) cancelForRerender();
    clipboardUI.cancelDrag();
  }

  function renderEquation(animate = true) {
    // Resolve interaction lifetime before replacing any semantic hitboxes.
    // The renderer itself must not own preview cancellation or modal leases.
    prepareEquationPresentationRerender();
    // Capture the previous layout before replacing the rendered equation.
    // The helper owns only transient DOM geometry; it never touches the AST.
    const firstRects = equationLayoutTransition.capture(animate);

    // The visible window represents the active mathematical object. This
    // semantic identity is shared with accessibility tooling and browser tests;
    // it does not create a second AST identity or affect hit-testing.
    const newTreeElement = documentState.expressionRoot ? renderMath(documentState.expressionRoot, {
      substitutions: documentState.substitutions,
      // A live pointer gesture never rebuilds the equation. Its temporary
      // visual state is applied by dragFeedback.js to the existing DOM.
      displayStyleOverride: viewState.multiplicationDisplayOverride
    }) : null;
    // Decoration after rendering (renderer standard): mark the selection on
    // the detached tree by its label, before it is mounted.
    markSelectedOccurrence(newTreeElement, viewState.selectedNodeId);
    // Rule bundles decorate it too (e.g. distribution's amber preview).
    if (newTreeElement) for (const decorate of extensions.treeDecorations) decorate(newTreeElement);

    // One ordered DOM replacement boundary. The renderer has already built a
    // detached tree; preview lifetime was resolved before that work began.
    // Keep semantic indexing, layout-affecting toolbars, overlays and animation
    // in their documented order, rather than duplicating this protocol.
    const windowDocument = activeDocument();
    mountEquationPresentation({
      equation: dom.equation,
      tree: newTreeElement,
      resolver: semanticTargetResolver,
      semanticRefresh: equationSemanticRefresh,
      documentId: windowDocument?.id,
      objectId: windowDocument?.activeObjectId,
      clearHover: () => hitboxVisibility.clearHover(),
      afterMount: () => extensions.emit('equationMounted'),
      updateToolbars: updateSelectionToolbars,
      paintSelection: paintRangeSelection,
      paintDecorations: () => { for (const paint of extensions.afterMounts) paint(); },
      animateLayout: rects => equationLayoutTransition.animate(rects),
      firstRects
    });

  }

  /** Update the optional MathJSON inspector whenever the tree changes. */
  function renderMathJSONInspector() {
    try {
      dom.mathJsonOutput.textContent = mathJSONToString(documentState.expressionRoot);
    } catch (error) {
      dom.mathJsonOutput.textContent = `MathJSON unavailable: ${error.message}`;
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
    // renderEquation() owns DOM-bound preview invalidation for every rerender.
    // Do not pre-cancel equality here: direct renderEquation() callers must
    // observe the same lifecycle, and duplicated policy can drift.
    renderEquation(animateEquation);
    if (documentState.expressionRoot) {
      renderVariables();
      renderMathJSONInspector();
    } else {
      // Retain the established blank-object panel presentation. In particular,
      // do not render a placeholder variable row or JSON `null` inspector.
      dom.variablesList.replaceChildren();
      dom.mathJsonOutput.textContent = '';
    }
    renderHistory();
  }

  return Object.freeze({ renderMath, createEquationElement, renderEquation, renderApplication });
}
