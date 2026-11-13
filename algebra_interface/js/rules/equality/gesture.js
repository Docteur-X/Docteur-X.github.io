/**
 * DOM-free gesture interpretation for applying a clipboard operand to equality.
 * The UI first chooses a relation ID and an explicitly armed context. This
 * adapter freezes that intention; it never constructs or rewrites mathematics.
 * Eligibility and the result are solely the Engine's responsibility.
 */
export function equalityFunctionActionRequest({ relationId, context, clipboardId, documentId, objectId, revision, sign }) {
  if (![relationId, clipboardId].every(v => typeof v === 'string' && v.length) ||
      !['add-right', 'multiply-left', 'multiply-right'].includes(context)) return null;
  return Object.freeze({
    ruleId: 'equality.apply-function',
    parameters: Object.freeze({ relationId, context, clipboardId, documentId, objectId, revision,
      // The student's answer when the operand's sign matters (E4d).
      ...(sign ? { sign } : {}) })
  });
}
