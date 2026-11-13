/**
 * Action wording (renderer standard, rule 7: words on the page).
 *
 * The renderer labels what a part IS ("Addend: a", "minus sign"). What a part
 * DOES is added here, after rendering, from the rules' gesture declarations:
 * a declaration may carry
 *   spoken  words for a screen reader, joined into the part's aria-label
 *   hint    a short tooltip (title)
 * e.g. rearrangement's arrow-key declaration says "Arrows reorder", negation's
 * activate declaration says "Expand negation as multiplication by negative one".
 *
 * Every selectable occurrence also says "click selects" (selection is not a
 * rule). A nested sum or product's own box (R1, `.nested-operation`) is not a
 * selection target, so it is left as the renderer labelled it.
 *
 * Declarations are matched with partMatches, NOT gated by the view mode: the
 * wording describes the part, and must be present even when the tree is
 * rendered during a preview.
 */
import { partMatches } from './inputRouter.js';
import { partFromElement } from './partFromElement.js';

export function applyActionWording(tree, { declarations, findNode }) {
  if (!tree) return;
  const visit = element => {
    const data = element.dataset ?? {};
    const labelled = (data.hitboxRole === 'occurrence' && data.nodeId) ||
      (data.hitboxRole === 'operator' && data.operatorOwnerId);
    if (labelled && !element.classList?.contains('nested-operation')) {
      const part = partFromElement(element, { findNode });
      const matching = part ? declarations.filter(declaration => partMatches(declaration.on, part)) : [];
      const spoken = [...new Set(matching.map(declaration => declaration.spoken).filter(Boolean))];
      const hint = matching.map(declaration => declaration.hint).find(Boolean);
      const base = element.getAttribute('aria-label') ?? '';
      if (part?.role === 'occurrence') {
        const actions = [...spoken, 'click selects'].join('; ');
        element.setAttribute('aria-label', `${base}. ${actions[0].toUpperCase()}${actions.slice(1)}.`);
      } else if (spoken.length) {
        // An operator's label is its action (e.g. the minus sign of −(…)).
        element.setAttribute('aria-label', spoken.join('; '));
      }
      if (hint) element.title = hint;
    }
    for (const child of element.children ?? []) visit(child);
  };
  visit(tree);
}
