/**
 * Semantic input contract v0 (experimental, not yet wired into app.js).
 *
 * This boundary deliberately records what was touched, not which algebraic
 * rule should run. DOM, pointer coordinates and hitbox classes are absent from
 * the resulting event. The adapter must validate that the target belongs to
 * the active view; the AST/Engine must still validate node existence and rules.
 */
import { expandNegationAction } from '../rules/negation/gesture.js';

const INPUT_PHASES = Object.freeze(['activate', 'press', 'hover', 'release', 'cancel']);
const INPUT_METHODS = Object.freeze(['pointer', 'keyboard']);
const TARGET_ROLES = Object.freeze(['occurrence', 'content', 'operator']);

export function semanticInput({ phase, method, viewId, objectId, target, source = null, modifiers = {} }) {
  if (!INPUT_PHASES.includes(phase)) throw new TypeError('Invalid semantic input phase');
  if (!INPUT_METHODS.includes(method)) throw new TypeError('Invalid semantic input method');
  if (typeof viewId !== 'string' || !viewId || typeof objectId !== 'string' || !objectId)
    throw new TypeError('View and mathematical object identities are required');
  const address = (value, optional = false) => {
    if (value == null && optional) return null;
    if (!value || typeof value.nodeId !== 'string' || !value.nodeId || !TARGET_ROLES.includes(value.role))
      throw new TypeError('Invalid semantic address');
    if (value.operatorPosition !== undefined && (!Number.isInteger(value.operatorPosition) || value.operatorPosition < 0))
      throw new TypeError('Invalid operator position');
    return Object.freeze({ nodeId: value.nodeId, role: value.role,
      ...(value.operatorPosition === undefined ? {} : { operatorPosition: value.operatorPosition }) });
  };
  return Object.freeze({ phase, method, viewId, objectId,
    target: address(target), source: address(source, true),
    modifiers: Object.freeze({ ctrl: !!modifiers.ctrl, meta: !!modifiers.meta,
      shift: !!modifiers.shift, alt: !!modifiers.alt }) });
}

/**
 * One tiny vertical slice: activating a negation operator requests expansion.
 * A pointer click and a keyboard Enter/Space are translated by their adapters
 * into the SAME `activate` event, then recognized without DOM dependencies.
 * This function does not check mathematical eligibility, preview, or commit.
 */
export function recognizeNegationExpansion(input) {
  if (input?.phase !== 'activate' || input.target?.role !== 'operator' || input.source !== null)
    return null;
  return expandNegationAction(input.target.nodeId);
}

/**
 * Prototype DOM adapter for the existing negation hitbox only. This is NOT a
 * universal resolver and intentionally does not replace semanticTargetResolver.
 * Future adapters should obtain addresses from a view-local resolver rather
 * than from feature-specific CSS classes.
 */
export function negationActivationFromDom({ event, view, viewId, objectId }) {
  if (!event || !view || typeof view.contains !== 'function') return null;
  const keyboard = event.type === 'keydown';
  if (keyboard && !['Enter', ' '].includes(event.key)) return null;
  if (!keyboard && event.type !== 'click') return null;
  const element = event.target?.closest?.('.negate-operator-hitbox');
  if (!element || !view.contains(element) || !element.dataset?.operatorOwnerId) return null;
  return semanticInput({ phase: 'activate', method: keyboard ? 'keyboard' : 'pointer',
    viewId, objectId, target: { nodeId: element.dataset.operatorOwnerId, role: 'operator' },
    modifiers: { ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey, alt: event.altKey } });
}
