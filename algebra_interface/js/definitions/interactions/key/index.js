/**
 * Interaction: Key (key). Stage I1.
 * Press a key on a focused part; the rule names the key.
 * Used by: the rearrangement rules (arrow keys), multiplication.distribute (d).
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'key',
  description: 'Press a key on a focused part; the rule names the key.',
  fields: { onto: 'none', key: 'required' },
  recognisedBy: ['js/view/inputRouter.js', 'js/view/selectionCommandRouting.js'],
  previewedBy: [],
});
