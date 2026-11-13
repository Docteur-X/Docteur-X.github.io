/**
 * Pure release decision for an ordinary operand drag.
 *
 * The controller resolves the final target before calling this function. This
 * module only classifies whether the pointer is in a valid release region;
 * mathematical eligibility is checked separately by the rule adapters and
 * again at preview/commit time. No DOM, state, or rule imports belong here.
 */
export function decideOrdinaryDragRelease({ insideEquation, targetKind, insidePreview }) {
  if (typeof insideEquation !== 'boolean' || typeof insidePreview !== 'boolean' ||
      typeof targetKind !== 'string') {
    throw new TypeError('Release decision requires measured boolean regions and a target kind');
  }
  return Object.freeze({
    allowed: insideEquation || (targetKind === 'insert' && insidePreview),
    reason: insideEquation ? 'equation' :
      targetKind === 'insert' && insidePreview ? 'insertion-preview' : 'outside'
  });
}
