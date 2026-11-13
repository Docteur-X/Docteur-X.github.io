/**
 * Selection decoration (renderer standard, rule 4: decoration happens after
 * rendering). The renderer draws the mathematics and its labels only; this
 * marks the selected occurrence on the rendered tree, found by its
 * `data-node-id` label, before the tree is mounted.
 *
 * Works on any element with `.children` and `.dataset` (real DOM or the test
 * stand-in). No DOM queries by CSS class, no knowledge of rules.
 */
export function markSelectedOccurrence(tree, nodeId) {
  if (!tree || !nodeId) return 0;
  let marked = 0;
  const visit = element => {
    if (element.dataset?.hitboxRole === 'occurrence' && element.dataset.nodeId === nodeId) {
      element.classList.add('is-selected');
      marked++;
    }
    for (const child of element.children ?? []) visit(child);
  };
  visit(tree);
  return marked;
}
