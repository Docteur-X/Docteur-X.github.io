/**
 * Canonical, immutable identity of the mathematical source being transformed.
 *
 * This is a snapshot, not a mutable revision counter. The fingerprint is an
 * intentionally conservative fallback until the document store exposes an
 * authoritative revision that changes for every AST edit. Do not use DOM
 * identities or render generations here: those belong to view-local input.
 *
 * Every producer must supply the same five fields. In particular, `null`
 * means there is no active mathematical object/root; missing fields do not.
 */
export function createTransformationSourceStamp({ documentId, objectId, revision, rootId, fingerprint }) {
  const identity = [documentId, objectId, revision, rootId];
  if (identity.some(value => value !== null &&
      !(['string', 'number'].includes(typeof value) &&
        (typeof value !== 'number' || Number.isFinite(value))))) {
    throw new TypeError('Source stamp identities must be finite numbers, strings or null');
  }
  if (typeof fingerprint !== 'string') {
    throw new TypeError('Source stamp fingerprint must be a string');
  }
  return Object.freeze({ documentId, objectId, revision, rootId, fingerprint });
}
