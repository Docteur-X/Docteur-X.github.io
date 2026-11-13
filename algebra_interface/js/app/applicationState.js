/**
 * Application state, split by owner (stage 6).
 *
 * WHY: before stage 6 one `state` object held the open document's
 * mathematics, the equation view's selection and the theme together, so any
 * module that needed one could reach (and change) all of them. They have
 * different lifetimes and different owners:
 *
 *   documentState  the mathematics of the open object: its tree, its history,
 *                  the values assigned to symbols. Saved; changes only through
 *                  commits and history.
 *   viewState      one equation view: what is selected, the last click, the
 *                  values being typed into the symbol panel, the
 *                  multiplication-sign display choice. Never saved in history.
 *                  A second view (future windows) gets its own.
 *   preferences    app-wide display choices (the theme).
 *
 * Drags and previews are not here: the view mode owns them (standard 1).
 */
import { createDocumentHistory } from '../documents/documentHistory.js';
import { createSelectionModel } from '../view/selection.js';

export function createDocumentState() {
  return {
    expressionRoot: null,
    substitutions: {},
    history: createDocumentHistory()
  };
}

export function createViewState() {
  return {
    // Selection is interaction state, not mathematical state. A click selects
    // any node; an Alt+click selects its containing hitbox.
    selectedNodeId: null,
    // Non-siblings stay selectable (for factorisation); only eligible ranges
    // offer grouping.
    multiSelection: createSelectionModel(),
    touchMultiSelectMode: false,
    lastClick: null,
    // Text typed into the symbol panel, before it is applied.
    variableDrafts: {},
    // "source" keeps the sign typed for each product; the other values change
    // only how every product looks, never its meaning or its MathJSON.
    multiplicationDisplayOverride: 'source'
  };
}

export function createPreferences() {
  return { theme: 'light' };
}
