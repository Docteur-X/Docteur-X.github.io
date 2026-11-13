/**
 * Symbol panel (stage 6): the list of symbols in the open object, the values
 * typed beside them (drafts, view state), and applying or clearing them
 * (assigned values are document state and enter history).
 *
 * WHY: until stage 6 this was section 6 of app.js. The code is the same; what
 * it needs is passed in by name (the parameters below).
 *
 * Symbol discovery is recursive, so symbols inside products, negations and
 * brackets are all listed.
 */
import { getUniqueSymbolNames } from '../../engine/treeUtils.js';
import { toExactString } from '../../engine/rational.js';

export function createSymbolPanel({
  addHistoryNode,
  documentState,
  dom,
  renderApplication,
  setVariableStatus,
  viewMode,
  viewState
}) {
  /* ---------------------------------------------------------------------- *
   * 6. Variable/symbol panel
   * ---------------------------------------------------------------------- *
   * Symbol discovery is recursive: symbols inside a Multiply node, Negate
   * node or Apply arguments are all found through treeUtils.
   * Values are not written into Symbol nodes; they stay in `substitutions`.
   * ---------------------------------------------------------------------- */

  function renderVariables() {
    const variables = getUniqueSymbolNames(documentState.expressionRoot);
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

      const draftValue = Object.prototype.hasOwnProperty.call(viewState.variableDrafts, name)
        ? viewState.variableDrafts[name]
        : documentState.substitutions[name] ?? "";
      input.value = draftValue === undefined ? "" : String(draftValue);

      row.append(variableName, input);
      dom.variablesList.append(row);
    });
  }

  function handleVariableDraftInput(event) {
    const input = event.target.closest(".variable-input");
    if (!input) return;
    viewState.variableDrafts[input.dataset.variable] = input.value.trim();
  }

  /** Apply the current sidebar drafts as the numerical environment. */
  function applyVariableValues() {
    // Numerical substitutions are part of the mathematical source stamp.
    // Changing them underneath a deliberate preview would invalidate its
    // candidate while leaving its presentation visible. Require the student
    // to confirm or cancel that preview first.
    if (viewMode.isPreview()) {
      setVariableStatus("Confirm or cancel the current preview before applying variable values.");
      return;
    }
    const nextSubstitutions = { ...documentState.substitutions };

    for (const name of getUniqueSymbolNames(documentState.expressionRoot)) {
      const rawValue = String(viewState.variableDrafts[name] ?? "").trim();
      if (rawValue === "") {
        delete nextSubstitutions[name];
        continue;
      }

      // Accept a simple signed decimal/scientific number in the variable panel.
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(rawValue)) {
        setVariableStatus(`The value for ${name} must be a number, for example 2, -3.5 or 1e-3.`);
        return;
      }

      // Stored exactly, as a string such as "0.1", so no value is ever rounded.
      try {
        nextSubstitutions[name] = toExactString(rawValue);
      } catch (error) {
        setVariableStatus(error.name === "NumberTooLargeError"
          ? `The value for ${name} is too large to work with.`
          : `The value for ${name} must be a number, for example 2, -3.5 or 1e-3.`);
        return;
      }
    }

    if (JSON.stringify(nextSubstitutions) === JSON.stringify(documentState.substitutions)) {
      setVariableStatus("The variable values are already up to date.");
      return;
    }

    documentState.substitutions = nextSubstitutions;
    viewState.variableDrafts = Object.fromEntries(
      Object.entries(nextSubstitutions).map(([name, value]) => [name, String(value)])
    );

    addHistoryNode("Updated variable values", null, "context-edit");
    renderApplication();
    setVariableStatus("Variable values applied. Numerically evaluable terms can now be combined.");
  }

  function clearVariableValues() {
    // Clearing applied values is a mathematical context edit, not merely a
    // cosmetic sidebar operation. It obeys the same modal interaction gate.
    if (viewMode.isPreview()) {
      setVariableStatus("Confirm or cancel the current preview before clearing variable values.");
      return;
    }
    if (Object.keys(documentState.substitutions).length === 0) {
      setVariableStatus("There are no applied values to clear.");
      return;
    }

    documentState.substitutions = {};
    viewState.variableDrafts = {};
    addHistoryNode("Cleared variable values", null, "context-edit");
    renderApplication();
    setVariableStatus("All variable substitutions have been cleared.");
  }

  return Object.freeze({ renderVariables, handleVariableDraftInput, applyVariableValues, clearVariableValues });
}
