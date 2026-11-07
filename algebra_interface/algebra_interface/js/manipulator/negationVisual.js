/**
 * Semantic description of a negation representation change.
 *
 * This adapter supplies student-facing wording and provenance identifiers.
 * It owns no DOM, CSS, mathematical validation or commit decisions. The same
 * description is consumed by the inline preview and the application status
 * so expansion and compression cannot accidentally describe opposite rules.
 */
const NEGATION_PREVIEW_COPY = Object.freeze({
  'negation.expand': Object.freeze({
    label: 'Preview: − becomes −1',
    status: 'Preview: the minus sign becomes an amber −1. Confirm or cancel.'
  }),
  'negation.compress': Object.freeze({
    label: 'Preview: −1 becomes −',
    status: 'Preview: −1 becomes an amber minus sign. Confirm or cancel.'
  })
});

export function describeNegationCandidate(candidate) {
  if (!candidate?.result) return null;
  const ruleId = candidate.action?.ruleId ?? candidate.result.rule;
  const copy = NEGATION_PREVIEW_COPY[ruleId];
  if (!copy) throw new TypeError(`Unknown negation preview rule: ${String(ruleId)}`);
  return {
    kind: 'negation-representation',
    ruleId,
    label: copy.label,
    status: copy.status,
    affectedNodeIds: candidate.result.affectedNodeIds || [],
    insertedNodeIds: candidate.result.insertedNodeIds || [],
    insertedOperatorOwnerIds: candidate.result.insertedOperatorOwnerIds || []
  };
}
