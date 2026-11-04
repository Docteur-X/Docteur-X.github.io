/* ========================================================================== *
 * INLINE FACTOR-EXTRACTION EXPLANATION (PRESENTATION ONLY)
 * ========================================================================== *
 * This module is intentionally ignorant of algebra. It receives:
 *   - an already rendered original expression,
 *   - an already rendered candidate expression,
 *   - stable IDs locating the affected scope and new factor,
 *   - the requested visual side (before/after).
 *
 * It builds a THIRD, temporary visual representation:
 *     proposed new factor + (original addends with faded source factors)
 * or (original addends with faded sources) + proposed new factor.
 *
 * Crucially this visual is NOT a mathematical tree, is NEVER parsed, and is
 * NEVER committed. It exists solely to explain the transformation. The app
 * keeps the mathematically correct candidate tree separately for confirmation.
 *
 * The new factor is inserted into ordinary flex layout, rather than placed at
 * an absolute pixel offset. Neighbouring operands therefore make room for it.
 * The arrows are decorative and must not affect hit-testing or layout.
 *
 * Future operations can provide other visual-composition strategies without
 * changing the algebra rules, parser, or the generic modal preview controller.
 * ========================================================================== */

/** Find a rendered hitbox using its mathematical ID, never a text comparison. */
function hitboxById(container, id) {
  return [...container.querySelectorAll('[data-node-id]')]
    .find(element => element.dataset.nodeId === id) || null;
}

/**
 * Return an independent DOM-only preview, or null if this layout cannot be
 * represented safely (e.g. the scope has no hitbox in the current renderer).
 * The generic controller can then fall back to its complete-result preview.
 */
export function buildInlineExtractionVisual(document, originalRoot, candidateRoot, description) {
  const { scopeNodeId, resultNodeId, direction, sourceNodeIds = [] } = description;
  if (!originalRoot || !candidateRoot || !scopeNodeId || !resultNodeId ||
      !['left', 'right'].includes(direction)) return null;

  const visualRoot = originalRoot.cloneNode(true);
  const scope = hitboxById(visualRoot, scopeNodeId);
  const candidateFactor = hitboxById(candidateRoot, resultNodeId);
  if (!scope || !candidateFactor || !scope.parentNode) return null;

  // Clone the candidate's actual factor hitbox. This preserves the renderer's
  // bracket choices, typography and nested structure for compound factors.
  const extracted = candidateFactor.cloneNode(true);
  extracted.classList.add('transformation-preview__confirm');
  extracted.classList.add('transformation-preview__introduced-factor');

  // Mark original occurrences as leaving their old locations. The source IDs
  // still exist in this temporary DOM, so the arrows can connect them to the
  // new occurrence. The committed candidate has different IDs as appropriate.
  for (const id of sourceNodeIds) {
    const source = hitboxById(visualRoot, id);
    if (!source) return null;
    source.classList.add('is-factorisation-source');
  }

  // The surrounding multiplication sequence is a flex layout. Inserting
  // siblings into that sequence allocates space and avoids overlapping later
  // factors such as the f in (ba+ca)f. Do NOT alter the original DOM/tree.
  const parent = scope.parentNode;
  const operator = document.createElement('span');
  operator.className = 'multiply-operator multiply-operator--implicit transformation-preview__introduced-operator';
  operator.setAttribute('aria-hidden', 'true');

  if (parent.classList.contains('multiply-content')) {
    // A sum nested in an existing product: insert directly into that product's
    // factor sequence. Its next factor moves aside through ordinary layout.
    if (direction === 'left') {
      parent.insertBefore(extracted, scope);
      parent.insertBefore(operator, scope);
    } else {
      parent.insertBefore(operator, scope.nextSibling);
      parent.insertBefore(extracted, operator.nextSibling);
    }
  } else if (parent.classList.contains('add-content') ||
             parent.classList.contains('expression-root')) {
    // A grouped sum that is an ADDEND, not yet part of a product. The preview
    // must wrap it in a decorative product container: placing the new factor
    // directly beside it would otherwise visually imply addition instead.
    const wrapper = document.createElement('div');
    wrapper.className = 'term add-operand add-operand--product term--compound transformation-preview__visual-product';
    const sequence = document.createElement('span');
    sequence.className = 'multiply-content transformation-preview__visual-sequence';
    parent.insertBefore(wrapper, scope);
    wrapper.append(sequence);
    if (direction === 'left') sequence.append(extracted, operator, scope);
    else sequence.append(scope, operator, extracted);
  } else {
    return null; // Unknown layout container: prefer the generic fallback.
  }
  return { visualRoot, confirmationElement: extracted };
}
