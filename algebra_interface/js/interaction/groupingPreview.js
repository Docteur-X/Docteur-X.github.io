/* ========================================================================== *
 * Multi-selection outlines and modal range-grouping preview
 * ========================================================================== *
 * This is PRESENTATION ONLY. The expression tree is never edited here.
 *
 * A thin, fixed-position overlay is measured from the existing DOM hitboxes.
 * It is OUTSIDE the equation layout, so it cannot push operands, invalidate
 * the stable drag geometry, or accidentally become a mathematical hitbox.
 *
 * In selection mode, ONLY four narrow border strips accept pointer events.
 * The interior remains click-through: students can still Ctrl+click, select,
 * or drag actual mathematical operands. In preview mode the whole outlined
 * range becomes an intentional confirmation target; other drag interactions
 * are locked by the app's interaction mode.
 *
 * Multi-line layout: if selected operands wrap to another row, we draw a
 * separate envelope segment for each visual row. This avoids a giant single
 * rectangle covering unrelated mathematics between lines.
 * ========================================================================== */

const BORDER_HIT_WIDTH = 10; // Comfortable invisible target, delicate line.
const ROW_TOLERANCE = 9;     // Minor font baseline differences are one row.

/** Measure the exact selected hitboxes, not their mathematical parent boxes. */
export function measureSelectedRows(equation, nodeIds) {
  const wanted = new Set(nodeIds);
  const elements = [...equation.querySelectorAll(".add-operand[data-node-id], .factor-slot[data-node-id]")]
    .filter((element) => wanted.has(element.dataset.nodeId));
  if (elements.length !== wanted.size) return [];

  const rows = [];
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    // Adjacent factors on the SAME line can have very different heights:
    // a short symbol next to a tall parenthesised sum. Compare vertical
    // overlap as well as centres, otherwise we'd draw two separate envelopes
    // around what is visually one mathematical row.
    let row = rows.find((item) => {
      const overlap = Math.min(item.bottom, rect.bottom) - Math.max(item.top, rect.top);
      const shorterHeight = Math.min(item.bottom - item.top, rect.height);
      return overlap >= shorterHeight * 0.35 ||
        Math.abs(item.centerY - (rect.top + rect.bottom) / 2) < ROW_TOLERANCE;
    });
    if (!row) {
      row = { left: rect.left, right: rect.right, top: rect.top,
        bottom: rect.bottom, centerY: (rect.top + rect.bottom) / 2 };
      rows.push(row);
    } else {
      row.left = Math.min(row.left, rect.left);
      row.right = Math.max(row.right, rect.right);
      row.top = Math.min(row.top, rect.top);
      row.bottom = Math.max(row.bottom, rect.bottom);
    }
  }
  return rows.sort((a, b) => a.top - b.top || a.left - b.left);
}

/** Create DOM controls, but never insert them into the expression itself. */
export function createGroupingPreview(document, equation, { onEnterPreview, onConfirm }) {
  const layer = document.createElement("div");
  layer.className = "grouping-overlay";
  layer.setAttribute("aria-label", "Grouping selection overlay");
  document.body.append(layer);
  let selectedIds = [];
  let mode = "select";
  let bracketStyle = "round";
  const brackets = { round: ["(", ")"], square: ["[", "]"], curly: ["{", "}"] };

  function edgeButton(side, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `grouping-envelope__edge grouping-envelope__edge--${side}`;
    button.setAttribute("aria-label", "Preview grouping of selected adjacent operands");
    button.title = "Preview grouping";
    // One keyboard-focusable edge per visual segment is sufficient.
    button.tabIndex = side === "top" && index === 0 ? 0 : -1;
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onEnterPreview();
    });
    return button;
  }

  function refresh() {
    layer.replaceChildren();
    if (selectedIds.length < 2) return;
    const rows = measureSelectedRows(equation, selectedIds);
    rows.forEach((row, index) => {
      const envelope = document.createElement("div");
      envelope.className = `grouping-envelope grouping-envelope--${mode}`;
      const padding = mode === "preview" ? 9 : 5;
      envelope.style.left = `${row.left - padding}px`;
      envelope.style.top = `${row.top - padding}px`;
      envelope.style.width = `${row.right - row.left + 2 * padding}px`;
      envelope.style.height = `${row.bottom - row.top + 2 * padding}px`;

      if (mode === "preview") {
        // Preview brackets are decorations; no new Group node exists yet.
        // Clicking anywhere within the proposal confirms the entire range.
        envelope.classList.add("grouping-envelope--confirmable");
        envelope.setAttribute("role", "button");
        envelope.setAttribute("tabindex", index === 0 ? "0" : "-1");
        envelope.setAttribute("aria-label", "Confirm grouping of selected operands");
        envelope.addEventListener("pointerdown", (event) => event.stopPropagation());
        envelope.addEventListener("click", (event) => {
          event.preventDefault(); event.stopPropagation(); onConfirm();
        });
        envelope.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); onConfirm();
          }
        });
        // Only the first and last row show the opening/closing brackets.
        if (index === 0) {
          const open = document.createElement("span");
          open.className = "grouping-envelope__bracket grouping-envelope__bracket--open";
          open.textContent = brackets[bracketStyle][0];
          envelope.append(open);
        }
        if (index === rows.length - 1) {
          const close = document.createElement("span");
          close.className = "grouping-envelope__bracket grouping-envelope__bracket--close";
          close.textContent = brackets[bracketStyle][1];
          envelope.append(close);
        }
      } else {
        // Thin visual border with wider *edge-only* click regions. The centre
        // is intentionally click-through so the original hitboxes still work.
        for (const side of ["top", "bottom", "left", "right"]) {
          envelope.append(edgeButton(side, index));
        }
      }
      layer.append(envelope);
    });
  }

  return {
    setSelection(ids) { selectedIds = [...ids]; mode = "select"; refresh(); },
    enterPreview(style = "round") {
      if (!brackets[style]) return false;
      mode = "preview";
      bracketStyle = style;
      refresh();
      return true;
    },
    setBracketStyle(style) {
      if (!brackets[style]) return;
      bracketStyle = style;
      if (mode === "preview") refresh();
    },
    clear() { selectedIds = []; mode = "select"; layer.replaceChildren(); },
    refresh,
    get mode() { return mode; },
    get layer() { return layer; },
    destroy() { layer.remove(); }
  };
}
