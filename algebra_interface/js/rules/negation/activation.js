/**
 * Production boundary for negation-operator activation.
 *
 * This adapter is intentionally narrow: it recognises only the renderer's
 * explicit negation activation control. All mathematical identity comes from
 * the current view-local semantic resolver, never from a data attribute read
 * by application code. It returns a rule request, not a DOM element.
 *
 * The existing preview/commit lifecycle remains authoritative. The adapter
 * does not decide mathematical eligibility, mutate an AST or open a preview.
 */
import { semanticInput, recognizeNegationExpansion } from '../../view/semanticInput.js';

export function negationRequestFromEvent({ event, view, resolver, viewId, objectId }) {
  if (!event || !view || !resolver || !objectId) return null;
  const keyboard = event.type === 'keydown';
  if (keyboard ? !['Enter', ' '].includes(event.key) : event.type !== 'click') return null;
  // Only an explicitly rendered negation control is an activation affordance.
  // Generic operator targets (including addition and multiplication) are not.
  // The boxed − of a − b stands for the minus of the term after it, which is
  // hidden there (domRenderer.js linkLeadingSign): activate that minus.
  const clicked = event.target?.closest?.('.negate-operator-hitbox, .plus[data-stands-for-minus]');
  const control = clicked?.matches?.('.plus')
    ? clicked.nextElementSibling?.querySelector?.('.negate-operator-hitbox[data-leading-sign]')
    : clicked;
  if (!control || !view.contains(control)) return null;
  const address = resolver.addressFromElement(control, { mathematicalObjectId: objectId });
  if (!address || address.mathematicalObjectId !== objectId || address.role !== 'operator' ||
      address.operatorPosition !== undefined) return null;
  const input = semanticInput({
    phase: 'activate', method: keyboard ? 'keyboard' : 'pointer', viewId, objectId,
    target: { nodeId: address.nodeId, role: address.role },
    modifiers: { ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey, alt: event.altKey },
  });
  return recognizeNegationExpansion(input);
}
