/**
 * Compare immutable source stamps before publishing a prepared drag.
 *
 * Both directions of the key set must match: an additional revision field
 * introduced by the document store is not silently ignored. Only primitive
 * stamp values are accepted, because object identity is not a reliable
 * substitute for an explicit revision token.
 *
 * This is a pickup-time guard; later drag updates and commits must still
 * independently validate their own authoritative source.
 */
export function sameOrdinaryDragSourceStamp(expected, actual) {
  if (!expected || !actual || typeof expected !== 'object' ||
      typeof actual !== 'object' || Array.isArray(expected) || Array.isArray(actual)) {
    return false;
  }
  const keys = Object.keys(expected);
  if (keys.length === 0 || keys.length !== Object.keys(actual).length) return false;
  return keys.every(key => Object.hasOwn(actual, key) &&
    (expected[key] === null || ['string', 'number', 'boolean'].includes(typeof expected[key])) &&
    (actual[key] === null || ['string', 'number', 'boolean'].includes(typeof actual[key])) &&
    Object.is(expected[key], actual[key]));
}
