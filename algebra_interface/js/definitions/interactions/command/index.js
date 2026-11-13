/**
 * Interaction: Command (command). Stage I1.
 * Choose an action from the toolbar for the selected parts.
 * Used by: grouping.range, factorisation.left / .right.
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'command',
  description: 'Choose an action from the toolbar for the selected parts.',
  fields: { onto: 'none' },
  recognisedBy: ['js/view/selectionView.js', 'js/view/selectionCommandRouting.js'],
  previewedBy: ['js/steps/previewSessionHost.js'],
});
