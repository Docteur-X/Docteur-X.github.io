/**
 * Interaction: Drag onto (drag). Stage I1.
 * Drag a part and drop it onto another part, which the rule names in `onto`.
 * Used by: distribution, cancel opposites, cancel inverses, negation.compress, both sides (onto the other side).
 * A rule adds its own drop target through ctx.registerDropTarget; the arbiters
 * accept any registered kind (the generic rule-drop of stage 7).
 */
import { defineInteraction } from '../../define.js';

export const interaction = defineInteraction({
  id: 'drag',
  description: 'Drag a part and drop it onto another part, which the rule names in `onto`.',
  fields: { onto: 'required' },
  recognisedBy: ['js/view/drag/ordinaryDragView.js', 'js/view/drag/ordinaryDragController.js', 'js/view/drag/ordinaryDropArbitration.js'],
  previewedBy: ['js/view/drag/dragFeedback.js'],
});
